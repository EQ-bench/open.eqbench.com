import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface MatchupSummary {
  opponent: string;
  matchupCount: number;
  winsForModel: number;
  winsForOpponent: number;
  avgFractionForModel: number;
}

interface MatchupDetail {
  id: number;
  item_id: string;
  isModelA: boolean;
  fractionForModel: number | null;
  plusForModel: number | null;
  plusForOpponent: number | null;
  judgeResponses: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelName: string }> }
) {
  const { modelName } = await params;
  const decodedName = decodeURIComponent(modelName);

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("item_id");
  const opponent = searchParams.get("opponent");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // If opponent is specified, return detailed matchups for that pair
  if (opponent) {
    const decodedOpponent = decodeURIComponent(opponent);

    const whereClause = {
      OR: [
        { model_a: decodedName, model_b: decodedOpponent },
        { model_a: decodedOpponent, model_b: decodedName },
      ],
      ...(itemId ? { item_id: itemId } : {}),
    };

    const [matchups, total] = await Promise.all([
      prisma.elo_comparisons.findMany({
        where: whereClause,
        select: {
          id: true,
          item_id: true,
          model_a: true,
          model_b: true,
          fraction_for_a: true,
          aggregated_plus_for_a: true,
          aggregated_plus_for_b: true,
          aggregated_judge_responses: true,
        },
        orderBy: { item_id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.elo_comparisons.count({ where: whereClause }),
    ]);

    const details: MatchupDetail[] = matchups.map((m) => {
      const isModelA = m.model_a === decodedName;
      return {
        id: m.id,
        item_id: m.item_id,
        isModelA,
        fractionForModel: isModelA
          ? m.fraction_for_a
          : m.fraction_for_a !== null
          ? 1 - m.fraction_for_a
          : null,
        plusForModel: isModelA ? m.aggregated_plus_for_a : m.aggregated_plus_for_b,
        plusForOpponent: isModelA ? m.aggregated_plus_for_b : m.aggregated_plus_for_a,
        judgeResponses: m.aggregated_judge_responses,
      };
    });

    return NextResponse.json({
      details,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  // Otherwise, return summary grouped by opponent
  const matchupsAsA = await prisma.elo_comparisons.findMany({
    where: {
      model_a: decodedName,
      ...(itemId ? { item_id: itemId } : {}),
    },
    select: {
      model_b: true,
      fraction_for_a: true,
      aggregated_plus_for_a: true,
      aggregated_plus_for_b: true,
    },
  });

  const matchupsAsB = await prisma.elo_comparisons.findMany({
    where: {
      model_b: decodedName,
      ...(itemId ? { item_id: itemId } : {}),
    },
    select: {
      model_a: true,
      fraction_for_a: true,
      aggregated_plus_for_a: true,
      aggregated_plus_for_b: true,
    },
  });

  // Aggregate by opponent
  const summaryMap = new Map<string, {
    count: number;
    winsForModel: number;
    winsForOpponent: number;
    fractionSum: number;
  }>();

  for (const m of matchupsAsA) {
    const opponent = m.model_b;
    const existing = summaryMap.get(opponent) || {
      count: 0,
      winsForModel: 0,
      winsForOpponent: 0,
      fractionSum: 0,
    };
    existing.count++;
    existing.winsForModel += m.aggregated_plus_for_a || 0;
    existing.winsForOpponent += m.aggregated_plus_for_b || 0;
    existing.fractionSum += m.fraction_for_a || 0;
    summaryMap.set(opponent, existing);
  }

  for (const m of matchupsAsB) {
    const opponent = m.model_a;
    const existing = summaryMap.get(opponent) || {
      count: 0,
      winsForModel: 0,
      winsForOpponent: 0,
      fractionSum: 0,
    };
    existing.count++;
    existing.winsForModel += m.aggregated_plus_for_b || 0;
    existing.winsForOpponent += m.aggregated_plus_for_a || 0;
    existing.fractionSum += m.fraction_for_a !== null ? 1 - m.fraction_for_a : 0;
    summaryMap.set(opponent, existing);
  }

  const summaries: MatchupSummary[] = Array.from(summaryMap.entries())
    .map(([opponent, data]) => ({
      opponent,
      matchupCount: data.count,
      winsForModel: data.winsForModel,
      winsForOpponent: data.winsForOpponent,
      avgFractionForModel: data.count > 0 ? data.fractionSum / data.count : 0,
    }))
    .sort((a, b) => b.matchupCount - a.matchupCount);

  return NextResponse.json({ summaries });
}
