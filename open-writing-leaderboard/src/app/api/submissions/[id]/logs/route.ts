import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const afterId = searchParams.get("after");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    // Get the submission to find its run_key
    const submission = await prisma.submissions.findUnique({
      where: { id },
      select: { run_key: true, status: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // If no run_key yet, return empty logs
    if (!submission.run_key) {
      return NextResponse.json({
        logs: [],
        hasMore: false,
        status: submission.status,
      });
    }

    // Fetch logs, optionally after a certain ID for pagination
    const logs = await prisma.run_logs.findMany({
      where: {
        run_key: submission.run_key,
        ...(afterId ? { id: { gt: parseInt(afterId) } } : {}),
      },
      orderBy: { id: "asc" },
      take: limit,
      select: {
        id: true,
        ts: true,
        stream: true,
        data: true,
      },
    });

    return NextResponse.json({
      logs,
      hasMore: logs.length === limit,
      status: submission.status,
      runKey: submission.run_key,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
