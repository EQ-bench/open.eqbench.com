import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface LexicalAnalysis {
  slop_words_per_1k: number;
  slop_trigrams_per_1k: number;
  not_x_but_y_per_1k_chars: number;
  slop_score: number;
  vocab_level: number;
  avg_sentence_length: number;
  avg_paragraph_length: number;
  mattr_500: number;
  avg_turn_length: number;
  num_turns: number;
  total_words: number;
  total_chars: number;
}

interface RunResults {
  lexical_analysis?: LexicalAnalysis;
}

export async function GET() {
  // Get all completed runs ordered by start_time desc
  const runs = await prisma.runs.findMany({
    where: {
      status: "completed",
    },
    orderBy: { start_time: "desc" },
    select: {
      test_model: true,
      start_time: true,
      results: true,
    },
  });

  // Dedupe by model name, keeping the most recent (first encountered)
  const modelDataMap = new Map<string, { model: string; lexical_analysis: LexicalAnalysis }>();

  for (const run of runs) {
    if (modelDataMap.has(run.test_model)) continue;

    const results = run.results as RunResults | null;
    if (results?.lexical_analysis) {
      modelDataMap.set(run.test_model, {
        model: run.test_model,
        lexical_analysis: results.lexical_analysis,
      });
    }
  }

  const modelData = Array.from(modelDataMap.values());

  // Calculate min/max for each metric across all models
  const metrics: (keyof LexicalAnalysis)[] = [
    "slop_words_per_1k",
    "slop_trigrams_per_1k",
    "not_x_but_y_per_1k_chars",
    "slop_score",
    "vocab_level",
    "avg_sentence_length",
    "avg_paragraph_length",
    "mattr_500",
    "avg_turn_length",
    "num_turns",
    "total_words",
    "total_chars",
  ];

  const ranges: Record<string, { min: number; max: number }> = {};

  for (const metric of metrics) {
    const values = modelData
      .map((d) => d.lexical_analysis[metric])
      .filter((v): v is number => typeof v === "number" && !isNaN(v));

    if (values.length > 0) {
      ranges[metric] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
  }

  return NextResponse.json({
    models: modelData,
    ranges,
  });
}
