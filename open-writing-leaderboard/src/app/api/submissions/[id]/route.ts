import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const submission = await prisma.submissions.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        params: true,
        created_at: true,
        started_at: true,
        finished_at: true,
        error_msg: true,
        run_key: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Fetch run info if available
    let runInfo = null;
    if (submission.run_key) {
      runInfo = await prisma.runs.findUnique({
        where: { run_key: submission.run_key },
        select: {
          run_key: true,
          test_model: true,
          status: true,
          start_time: true,
          end_time: true,
          results: true,
          generation_progress: true,
          judging_progress: true,
        },
      });
    }

    return NextResponse.json({
      submission,
      runInfo,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}
