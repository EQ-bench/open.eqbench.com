import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { submissionstatus } from "@/generated/prisma/client";

// GET: Fetch queue status (public endpoint)
export async function GET() {
  try {
    // Get queued and running submissions
    // Exclude SUBMITTED jobs with priority_score = 0 (not yet assigned priority)
    const queued = await prisma.submissions.findMany({
      where: {
        AND: [
          {
            status: {
              in: [
                submissionstatus.SUBMITTED,
                submissionstatus.QUEUED,
                submissionstatus.STARTING,
                submissionstatus.RUNNING,
              ],
            },
          },
          {
            // Exclude SUBMITTED with priority 0 (unassigned)
            NOT: {
              AND: [
                { status: submissionstatus.SUBMITTED },
                { priority_score: 0 },
              ],
            },
          },
        ],
      },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        status: true,
        params: true,
        created_at: true,
        started_at: true,
        priority_score: true,
      },
    });

    // Get recently completed submissions (last 10)
    const recent = await prisma.submissions.findMany({
      where: {
        status: {
          in: [
            submissionstatus.SUCCEEDED,
            submissionstatus.FAILED,
            submissionstatus.TIMEOUT,
            submissionstatus.CANCELLED,
          ],
        },
      },
      orderBy: { finished_at: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        params: true,
        created_at: true,
        finished_at: true,
      },
    });

    // Sort queued submissions:
    // 1. Running/Starting jobs first
    // 2. Then by priority_score (1 first, then 2, 3, etc.)
    // 3. priority_score -1 (rate limited) goes to the end
    const runningStatuses = ["RUNNING", "STARTING"];
    const sortedQueued = [...queued].sort((a, b) => {
      const aRunning = runningStatuses.includes(a.status);
      const bRunning = runningStatuses.includes(b.status);

      // Running jobs always come first
      if (aRunning && !bRunning) return -1;
      if (bRunning && !aRunning) return 1;

      // Both running: sort by started_at
      if (aRunning && bRunning) {
        const aTime = a.started_at ? new Date(a.started_at).getTime() : 0;
        const bTime = b.started_at ? new Date(b.started_at).getTime() : 0;
        return aTime - bTime;
      }

      // Sort order: positive priorities (1, 2, 3...), then 0 (unassigned), then -1 (held)
      // Convert to sortable values: positive stays as-is, 0 becomes Infinity-1, -1 becomes Infinity
      const getSortValue = (p: number) => {
        if (p > 0) return p;
        if (p === 0) return Number.MAX_SAFE_INTEGER - 1;
        return Number.MAX_SAFE_INTEGER; // -1 (held)
      };

      const aSortVal = getSortValue(a.priority_score);
      const bSortVal = getSortValue(b.priority_score);

      if (aSortVal !== bSortVal) return aSortVal - bSortVal;

      // Same priority: sort by created_at
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });

    return NextResponse.json({
      queued: sortedQueued,
      recent,
    });
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}
