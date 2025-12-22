"use client";

import { useState } from "react";
import { FileText, BarChart3, Info, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { RunDetailsModal } from "@/components/run-details-modal";

interface Rating {
  model_name: string;
  elo: number | null;
  elo_norm: number | null;
  ci_low: number | null;
  ci_high: number | null;
}

interface LeaderboardProps {
  ratings: Rating[];
  isAdmin?: boolean;
}

export function Leaderboard({ ratings, isAdmin }: LeaderboardProps) {
  const router = useRouter();
  const [samplesModalModel, setSamplesModalModel] = useState<string | null>(null);
  const [analysisModalModel, setAnalysisModalModel] = useState<string | null>(null);
  const [runDetailsModalModel, setRunDetailsModalModel] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete "${modelName}" from the leaderboard?\n\nThis will also delete all associated runs and data. This action cannot be undone.`)) {
      return;
    }

    setDeletingModel(modelName);
    try {
      const response = await fetch(`/api/admin/leaderboard?model=${encodeURIComponent(modelName)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete leaderboard entry");
    } finally {
      setDeletingModel(null);
    }
  };

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
      <p className="text-center text-sm text-muted-foreground mb-4">
        [BETA] Leaderboard will reset at launch
      </p>
      <div className="rounded-lg border-2 border-violet-400/50 dark:border-violet-400/70 bg-card shadow-[0_0_15px_rgba(167,139,250,0.15)] dark:shadow-[0_0_15px_rgba(167,139,250,0.3)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead className="min-w-[133px] w-[60%]">Model</TableHead>
              <TableHead className="min-w-[100px] w-[40%]">ELO Score</TableHead>
              <TableHead className="w-24 text-center"><span className="hidden sm:inline">Samples</span></TableHead>
              <TableHead className="w-24 text-center"><span className="hidden sm:inline">Analysis</span></TableHead>
              {isAdmin && <TableHead className="w-16 text-center"></TableHead>}
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
                  <TableCell className="font-medium whitespace-normal break-all">
                    <span className="inline-flex items-center gap-1">
                      {rating.model_name}
                      <button
                        type="button"
                        onClick={() => setRunDetailsModalModel(rating.model_name)}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent/80 transition-colors cursor-pointer flex-shrink-0"
                        title="View run details"
                      >
                        <Info className="h-5 w-5 opacity-50 hover:opacity-100" />
                      </button>
                    </span>
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
                  {isAdmin && (
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(rating.model_name)}
                        disabled={deletingModel === rating.model_name}
                        title="Delete from leaderboard"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
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

      <RunDetailsModal
        modelName={runDetailsModalModel}
        onClose={() => setRunDetailsModalModel(null)}
      />
    </>
  );
}
