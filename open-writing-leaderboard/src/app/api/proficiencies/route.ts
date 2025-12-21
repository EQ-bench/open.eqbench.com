import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Master list of valid rubric dimensions
const MASTER_DIMENSIONS = [
  "Adherence to Instructions",
  "Believable Character Actions",
  "Nuanced Characters",
  "Consistent Voice/Tone of Writing",
  "Imagery and Descriptive Quality",
  "Elegant Prose",
  "Emotionally Engaging",
  "Emotionally Complex",
  "Coherent",
  "Meandering",
  "Weak Dialogue",
  "Tell-Don't-Show",
  "Unsurprising or Uncreative",
  "Amateurish",
  "Purple Prose",
  "Overwrought",
  "Incongruent Ending Positivity",
  "Unearned Transformations",
  "Well-earned Lightness or Darkness",
  "Sentences Flow Naturally",
  "Overall Reader Engagement",
  "Overall Impression",
];

// Negative criteria that need to be inverted (20 - score)
const NEGATIVE_CRITERIA = [
  "Unearned Transformations",
  "Incongruent Ending Positivity",
  "Overwrought",
  "Purple Prose",
  "Amateurish",
  "Unsurprising or Uncreative",
  "Tell-Don't-Show",
  "Weak Dialogue",
  "Meandering",
];

// Criteria to exclude from display
const IGNORE_CRITERIA = ["Overall Impression", "Overall Reader Engagement"];

// Renamed dimensions for display
const RENAME_MAP: Record<string, string> = {
  "Inverted_Weak Dialogue": "Strong Dialogue",
  "Inverted_Tell-Don't-Show": "Show-Don't-Tell",
  "Inverted_Unsurprising or Uncreative": "Creativity",
  "Inverted_Amateurish": "Avoids Amateurish Prose",
  "Adherence to Instructions": "Instruction Following",
  "Inverted_Meandering": "Pacing",
  "Imagery and Descriptive Quality": "Descriptive Imagery",
  "Consistent Voice/Tone of Writing": "Consistent Voice & Tone",
  "Sentences Flow Naturally": "Sentence Flow",
};

// Combinations of dimensions
const COMBINATIONS: Record<string, string[]> = {
  "Emotional Depth": ["Emotionally Complex", "Emotionally Engaging"],
  "Avoids Positivity Bias": [
    "Well-earned Lightness or Darkness",
    "Inverted_Unearned Transformations",
    "Inverted_Incongruent Ending Positivity",
  ],
  "Avoids Purple Prose": ["Inverted_Overwrought", "Inverted_Purple Prose"],
  "Believable Characters": ["Nuanced Characters", "Believable Character Actions"],
};

// Build a lowercase lookup map for fuzzy matching
const DIMENSION_LOOKUP = new Map<string, string>();
for (const dim of MASTER_DIMENSIONS) {
  // Exact lowercase match
  DIMENSION_LOOKUP.set(dim.toLowerCase(), dim);
  // Also try without special chars
  DIMENSION_LOOKUP.set(dim.toLowerCase().replace(/[^a-z0-9\s]/g, ""), dim);
}

/**
 * Fuzzy match a dimension name to the canonical master list name.
 * Returns null if no match found or dimension is too long.
 */
function matchDimension(input: string): string | null {
  // Filter out garbage data (too long)
  if (input.length > 30) return null;

  const normalized = input.toLowerCase().trim();

  // Try exact match first
  if (DIMENSION_LOOKUP.has(normalized)) {
    return DIMENSION_LOOKUP.get(normalized)!;
  }

  // Try without special characters
  const stripped = normalized.replace(/[^a-z0-9\s]/g, "");
  if (DIMENSION_LOOKUP.has(stripped)) {
    return DIMENSION_LOOKUP.get(stripped)!;
  }

  // Try fuzzy matching - find best match by word overlap
  let bestMatch: string | null = null;
  let bestScore = 0;

  const inputWords = new Set(normalized.split(/\s+/).filter((w) => w.length > 2));

  for (const dim of MASTER_DIMENSIONS) {
    const dimWords = new Set(dim.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

    // Count matching words
    let matches = 0;
    for (const word of inputWords) {
      if (dimWords.has(word)) matches++;
    }

    // Score = matches / max(inputWords, dimWords)
    const score = matches / Math.max(inputWords.size, dimWords.size);

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = dim;
    }
  }

  return bestMatch;
}

interface RubricDimension {
  mean: number;
  sd?: number;
  ci95_lower?: number;
  ci95_upper?: number;
  n_tasks?: number;
}

interface BenchmarkResults {
  rubric_dimensions?: Record<string, RubricDimension>;
}

interface RunResults {
  benchmark_results?: BenchmarkResults;
}

interface JudgeScores {
  [key: string]: number | string;
}

interface ModelScores {
  model: string;
  elo: number;
  rawScores: Record<string, number>;
  transformedScores: Record<string, number>;
}

function isNegativeCriterion(name: string): boolean {
  return NEGATIVE_CRITERIA.some((n) => n.toLowerCase() === name.toLowerCase());
}

function shouldIgnore(name: string): boolean {
  return IGNORE_CRITERIA.some((n) => n.toLowerCase() === name.toLowerCase());
}

/**
 * Normalize raw scores from the database to canonical dimension names.
 * Filters out invalid dimensions and applies fuzzy matching.
 */
function normalizeRawScores(scores: Record<string, number>): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [key, value] of Object.entries(scores)) {
    const canonicalName = matchDimension(key);
    if (canonicalName && typeof value === "number" && !isNaN(value)) {
      normalized[canonicalName] = value;
    }
  }

  return normalized;
}

function transformScores(rawScores: Record<string, number>): Record<string, number> {
  const processed: Record<string, number> = {};

  // First pass: invert negative criteria
  for (const [key, value] of Object.entries(rawScores)) {
    if (shouldIgnore(key)) continue;

    if (isNegativeCriterion(key)) {
      const newKey = `Inverted_${key}`;
      processed[newKey] = 20 - value;
    } else {
      processed[key] = value;
    }
  }

  // Apply renames
  const renamed: Record<string, number> = {};
  for (const [key, value] of Object.entries(processed)) {
    const newName = RENAME_MAP[key] || key;
    renamed[newName] = value;
  }

  // Apply combinations
  const combined: Record<string, number> = { ...renamed };
  const toRemove = new Set<string>();

  for (const [newName, srcCols] of Object.entries(COMBINATIONS)) {
    const values: number[] = [];
    for (const src of srcCols) {
      // Try both original and renamed versions
      const renamedSrc = RENAME_MAP[src] || src;
      if (renamedSrc in combined && !isNaN(combined[renamedSrc])) {
        values.push(combined[renamedSrc]);
        toRemove.add(renamedSrc);
      } else if (src in combined && !isNaN(combined[src])) {
        values.push(combined[src]);
        toRemove.add(src);
      }
    }
    if (values.length > 0) {
      combined[newName] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  // Remove combined source columns
  for (const key of toRemove) {
    delete combined[key];
  }

  return combined;
}

export async function GET() {
  // Get all ELO ratings ordered by ELO
  const eloRatings = await prisma.elo_ratings.findMany({
    orderBy: { elo: "desc" },
    select: {
      model_name: true,
      elo: true,
    },
  });

  const modelEloMap = new Map<string, number>();
  for (const r of eloRatings) {
    if (r.elo !== null) {
      modelEloMap.set(r.model_name, r.elo);
    }
  }

  // Get all completed runs with results
  const runs = await prisma.runs.findMany({
    where: { status: "completed" },
    orderBy: { start_time: "desc" },
    select: {
      run_key: true,
      test_model: true,
      results: true,
    },
  });

  // Dedupe by model, keep most recent run
  const modelRunMap = new Map<string, { run_key: string; results: RunResults | null }>();
  for (const run of runs) {
    if (!modelRunMap.has(run.test_model)) {
      modelRunMap.set(run.test_model, {
        run_key: run.run_key,
        results: run.results as RunResults | null,
      });
    }
  }

  // Collect model scores - try runs.results.benchmark_results.rubric_dimensions first
  const modelScores: ModelScores[] = [];
  const modelsNeedingFallback: string[] = [];

  for (const [model, runData] of modelRunMap.entries()) {
    const elo = modelEloMap.get(model);
    if (elo === undefined) continue; // Skip models not in ELO rankings

    const rubricDimensions = runData.results?.benchmark_results?.rubric_dimensions;

    if (rubricDimensions && Object.keys(rubricDimensions).length > 0) {
      // Use precomputed rubric dimensions
      const rawScoresUnfiltered: Record<string, number> = {};
      for (const [dim, data] of Object.entries(rubricDimensions)) {
        if (typeof data.mean === "number" && !isNaN(data.mean)) {
          rawScoresUnfiltered[dim] = data.mean;
        }
      }

      // Normalize to canonical names
      const rawScores = normalizeRawScores(rawScoresUnfiltered);

      if (Object.keys(rawScores).length > 0) {
        modelScores.push({
          model,
          elo,
          rawScores,
          transformedScores: transformScores(rawScores),
        });
      }
    } else {
      // Need to aggregate from judge_results
      modelsNeedingFallback.push(model);
    }
  }

  // Handle fallback: aggregate judge_scores for models without rubric_dimensions
  if (modelsNeedingFallback.length > 0) {
    const runKeys = modelsNeedingFallback
      .map((m) => modelRunMap.get(m)?.run_key)
      .filter((k): k is string => k !== undefined);

    if (runKeys.length > 0) {
      // Get all judge_scores for these runs in one query
      const judgeResults = await prisma.judge_results.findMany({
        where: {
          tasks: {
            run_key: { in: runKeys },
          },
        },
        select: {
          judge_scores: true,
          tasks: {
            select: {
              run_key: true,
            },
          },
        },
      });

      // Group by run_key and aggregate
      const runScoresMap = new Map<string, Map<string, number[]>>();
      for (const jr of judgeResults) {
        const runKey = jr.tasks.run_key;
        const scores = jr.judge_scores as JudgeScores | null;

        if (!scores) continue;

        if (!runScoresMap.has(runKey)) {
          runScoresMap.set(runKey, new Map());
        }
        const dimMap = runScoresMap.get(runKey)!;

        for (const [dim, value] of Object.entries(scores)) {
          // Filter out long strings (garbage data)
          if (dim.length > 30) continue;

          // Match to canonical name
          const canonicalDim = matchDimension(dim);
          if (!canonicalDim) continue;

          if (typeof value === "number" && !isNaN(value) && value <= 20) {
            if (!dimMap.has(canonicalDim)) {
              dimMap.set(canonicalDim, []);
            }
            dimMap.get(canonicalDim)!.push(value);
          }
        }
      }

      // Convert to model scores
      for (const model of modelsNeedingFallback) {
        const elo = modelEloMap.get(model);
        if (elo === undefined) continue;

        const runKey = modelRunMap.get(model)?.run_key;
        if (!runKey) continue;

        const dimMap = runScoresMap.get(runKey);
        if (!dimMap || dimMap.size === 0) continue;

        const rawScores: Record<string, number> = {};
        for (const [dim, values] of dimMap.entries()) {
          if (values.length > 0) {
            rawScores[dim] = values.reduce((a, b) => a + b, 0) / values.length;
          }
        }

        if (Object.keys(rawScores).length > 0) {
          modelScores.push({
            model,
            elo,
            rawScores,
            transformedScores: transformScores(rawScores),
          });
        }
      }
    }
  }

  // Sort by ELO descending
  modelScores.sort((a, b) => b.elo - a.elo);

  // Calculate relative scores for each model (vs n neighbors above/below)
  const N_NEIGHBORS = 6;
  const proficiencies: Record<
    string,
    {
      absoluteScores: Record<string, number>;
      relativeScores: Record<string, number>;
      strengths: Array<{ criterion: string; relativeScore: number }>;
      weaknesses: Array<{ criterion: string; relativeScore: number }>;
    }
  > = {};

  for (let i = 0; i < modelScores.length; i++) {
    const current = modelScores[i];
    const startIdx = Math.max(0, i - N_NEIGHBORS);
    const endIdx = Math.min(modelScores.length - 1, i + N_NEIGHBORS);

    // Get neighbor indices (excluding current)
    const neighborIndices: number[] = [];
    for (let j = startIdx; j <= endIdx; j++) {
      if (j !== i) neighborIndices.push(j);
    }

    // Calculate relative scores
    const relativeScores: Record<string, number> = {};
    const allDimensions = Object.keys(current.transformedScores);

    for (const dim of allDimensions) {
      const curVal = current.transformedScores[dim];
      if (curVal === undefined || isNaN(curVal)) continue;

      const neighborVals = neighborIndices
        .map((idx) => modelScores[idx].transformedScores[dim])
        .filter((v): v is number => v !== undefined && !isNaN(v));

      if (neighborVals.length > 0) {
        const neighborMean = neighborVals.reduce((a, b) => a + b, 0) / neighborVals.length;
        relativeScores[dim] = curVal - neighborMean;
      }
    }

    // Normalize relative scores: min->-1, median->0, max->1
    const relPairs = Object.entries(relativeScores);
    if (relPairs.length >= 3) {
      const sortedVals = [...relPairs].sort((a, b) => a[1] - b[1]).map(([, v]) => v);
      const minVal = sortedVals[0];
      const maxVal = sortedVals[sortedVals.length - 1];
      const medianIdx = Math.floor(sortedVals.length / 2);
      const medianVal =
        sortedVals.length % 2 === 1
          ? sortedVals[medianIdx]
          : (sortedVals[medianIdx - 1] + sortedVals[medianIdx]) / 2;

      const normalizedPairs: Array<{ criterion: string; relativeScore: number }> = [];

      for (const [criterion, value] of relPairs) {
        let normVal: number;
        if (minVal === maxVal) {
          normVal = 0;
        } else if (minVal === medianVal) {
          normVal = value === minVal ? -1 : 1;
        } else if (medianVal === maxVal) {
          normVal = value === minVal ? -1 : 1;
        } else if (value <= medianVal) {
          normVal = -1 + ((value - minVal) * 1) / (medianVal - minVal);
        } else {
          normVal = ((value - medianVal) * 1) / (maxVal - medianVal);
        }
        normalizedPairs.push({ criterion, relativeScore: Math.round(normVal * 100) / 100 });
      }

      // Sort by normalized score
      normalizedPairs.sort((a, b) => a.relativeScore - b.relativeScore);

      const TOP_N = 5;
      const weaknesses = normalizedPairs.slice(0, TOP_N);
      const strengths = [...normalizedPairs.slice(-TOP_N)].reverse();

      proficiencies[current.model] = {
        absoluteScores: current.transformedScores,
        relativeScores,
        strengths,
        weaknesses,
      };
    }
  }

  return NextResponse.json({ proficiencies });
}
