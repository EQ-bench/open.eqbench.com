import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { submissionstatus } from "@/generated/prisma/client";

// GET: Fetch queue status (public endpoint)
export async function GET() {
  try {
    // Get queued and running submissions
    const queued = await prisma.submissions.findMany({
      where: {
        status: {
          in: [
            submissionstatus.SUBMITTED,
            submissionstatus.QUEUED,
            submissionstatus.STARTING,
            submissionstatus.RUNNING,
          ],
        },
      },
      orderBy: [
        { priority_score: "desc" },
        { created_at: "asc" },
      ],
      select: {
        id: true,
        status: true,
        params: true,
        created_at: true,
        started_at: true,
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

    return NextResponse.json({
      queued,
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
