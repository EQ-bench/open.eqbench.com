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
    select: {
      run_key: true,
      start_time: true,
      end_time: true,
      run_config: true,
    },
  });

  if (!latestRun) {
    return NextResponse.json({ error: "No completed run found" }, { status: 404 });
  }

  // Calculate duration in minutes if both times are available
  let durationMinutes: number | null = null;
  if (latestRun.start_time && latestRun.end_time) {
    const durationMs = latestRun.end_time.getTime() - latestRun.start_time.getTime();
    durationMinutes = Math.round(durationMs / 1000 / 60);
  }

  return NextResponse.json({
    runKey: latestRun.run_key,
    startTime: latestRun.start_time?.toISOString() ?? null,
    endTime: latestRun.end_time?.toISOString() ?? null,
    durationMinutes,
    runConfig: latestRun.run_config,
  });
}
