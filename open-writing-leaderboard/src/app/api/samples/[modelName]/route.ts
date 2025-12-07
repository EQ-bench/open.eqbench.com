import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelName: string }> }
) {
  const { modelName } = await params;
  const decodedName = decodeURIComponent(modelName);

  // Get the most recent completed run for this model
  const latestRun = await prisma.runs.findFirst({
    where: {
      test_model: decodedName,
      status: "completed",
    },
    orderBy: { start_time: "desc" },
    select: { run_key: true },
  });

  if (!latestRun) {
    return NextResponse.json({ samples: [] });
  }

  // Get tasks for this run only - exclude response content for fast loading
  // Response content is lazy loaded via /api/samples/response/[taskId]
  const tasks = await prisma.tasks.findMany({
    where: {
      run_key: latestRun.run_key,
      status: "completed",
    },
    select: {
      id: true,
      prompt_id: true,
      iteration_index: true,
      aggregated_scores: true,
    },
    orderBy: { prompt_id: "asc" },
  });

  return NextResponse.json({ samples: tasks });
}
