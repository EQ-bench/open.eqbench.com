"use client";

import { useState } from "react";
import { FileText, BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SamplesModal } from "@/components/samples-modal";
import { AnalysisModal } from "@/components/analysis-modal";

interface Rating {
  model_name: string;
  elo: number | null;
  elo_norm: number | null;
  ci_low: number | null;
  ci_high: number | null;
}

interface LeaderboardProps {
  ratings: Rating[];
}

export function Leaderboard({ ratings }: LeaderboardProps) {
  const [samplesModalModel, setSamplesModalModel] = useState<string | null>(null);
  const [analysisModalModel, setAnalysisModalModel] = useState<string | null>(null);

  const maxElo = Math.max(...ratings.map((r) => r.elo ?? 0));
  const minElo = Math.min(...ratings.map((r) => r.elo ?? 0));
  const eloRange = maxElo - minElo || 1;

  const getEloBarWidth = (elo: number | null) => {
    if (elo === null) return 0;
    return ((elo - minElo) / eloRange) * 100;
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank === 1) return "default";
    if (rank <= 3) return "secondary";
    return "outline";
  };

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="w-[300px]">ELO Score</TableHead>
              <TableHead className="w-24 text-center">Samples</TableHead>
              <TableHead className="w-24 text-center">Analysis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratings.map((rating, index) => {
              const rank = index + 1;
              return (
                <TableRow key={rating.model_name}>
                  <TableCell>
                    <Badge variant={getRankBadgeVariant(rank)} className="font-mono">
                      {rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {rating.model_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-chart-1 to-chart-2 transition-all"
                          style={{ width: `${getEloBarWidth(rating.elo)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-sm">
                        {rating.elo?.toFixed(0) ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:bg-accent/80"
                      onClick={() => setSamplesModalModel(rating.model_name)}
                      title="View writing samples"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:bg-accent/80"
                      onClick={() => setAnalysisModalModel(rating.model_name)}
                      title="View lexical analysis"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <SamplesModal
        modelName={samplesModalModel}
        onClose={() => setSamplesModalModel(null)}
      />

      <AnalysisModal
        modelName={analysisModalModel}
        onClose={() => setAnalysisModalModel(null)}
      />
    </>
  );
}
