import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const id = parseInt(taskId, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const judgeResults = await prisma.judge_results.findMany({
    where: { task_id: id },
    select: {
      judge_model_name: true,
      judge_order_index: true,
      judge_scores: true,
      raw_judge_text: true,
    },
    orderBy: { judge_order_index: "asc" },
  });

  return NextResponse.json({ judges: judgeResults });
}
