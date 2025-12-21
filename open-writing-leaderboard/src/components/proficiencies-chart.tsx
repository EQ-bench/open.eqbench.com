"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface ProficiencyData {
  absoluteScores: Record<string, number>;
  relativeScores: Record<string, number>;
  strengths: Array<{ criterion: string; relativeScore: number }>;
  weaknesses: Array<{ criterion: string; relativeScore: number }>;
}

interface StrengthsWeaknessesListProps {
  data: ProficiencyData;
  initialCount?: number;
}

export function StrengthsWeaknessesList({
  data,
  initialCount = 5,
}: StrengthsWeaknessesListProps) {
  const [expanded, setExpanded] = useState(false);

  const strengthsToShow = expanded ? data.strengths : data.strengths.slice(0, initialCount);
  const weaknessesToShow = expanded ? data.weaknesses : data.weaknesses.slice(0, initialCount);
  const hasMore = data.strengths.length > initialCount || data.weaknesses.length > initialCount;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Strengths */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">Strengths</h4>
          <div className="space-y-1">
            {strengthsToShow.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm bg-green-500/10 rounded px-2 py-1"
                title={item.criterion}
              >
                <span className="truncate mr-2 text-xs cursor-help">{item.criterion}</span>
                <span className="font-mono text-xs text-green-600 dark:text-green-400 shrink-0">
                  +{item.relativeScore.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">Weaknesses</h4>
          <div className="space-y-1">
            {weaknessesToShow.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm bg-red-500/10 rounded px-2 py-1"
                title={item.criterion}
              >
                <span className="truncate mr-2 text-xs cursor-help">{item.criterion}</span>
                <span className="font-mono text-xs text-red-600 dark:text-red-400 shrink-0">
                  {item.relativeScore.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

interface RadarChartSectionProps {
  data: ProficiencyData;
}

export function ProficienciesRadarChart({ data }: RadarChartSectionProps) {
  const radarData = Object.entries(data.relativeScores)
    .map(([criterion, value]) => ({
      criterion: shortenLabel(criterion),
      fullCriterion: criterion,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => a.criterion.localeCompare(b.criterion));

  const values = radarData.map((d) => d.value);
  const maxAbs = Math.max(Math.abs(Math.min(...values)), Math.abs(Math.max(...values)), 0.5);
  const domain = [-Math.ceil(maxAbs * 10) / 10, Math.ceil(maxAbs * 10) / 10];

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--color-muted-foreground)" strokeOpacity={0.3} />
          <PolarAngleAxis
            dataKey="criterion"
            tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={domain}
            tick={{ fontSize: 8, fill: "var(--color-muted-foreground)" }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Relative Score"
            dataKey="value"
            stroke="hsl(var(--chart-1))"
            fill="hsl(var(--chart-1))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const item = payload[0].payload;
              return (
                <div className="bg-popover border rounded-md px-3 py-2 text-sm shadow-md">
                  <div className="font-medium">{item.fullCriterion}</div>
                  <div className="text-muted-foreground">
                    Relative: {item.value > 0 ? "+" : ""}
                    {item.value.toFixed(2)}
                  </div>
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RubricBarChartProps {
  data: ProficiencyData;
  compact?: boolean;
}

export function RubricBarChart({ data, compact = false }: RubricBarChartProps) {
  const barData = Object.entries(data.absoluteScores)
    .map(([criterion, value]) => ({
      criterion,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);

  const getBarColor = (value: number) => {
    if (value >= 16) return "hsl(142, 76%, 36%)"; // green
    if (value >= 12) return "hsl(48, 96%, 53%)"; // yellow
    if (value >= 8) return "hsl(25, 95%, 53%)"; // orange
    return "hsl(0, 84%, 60%)"; // red
  };

  // Bar height: 3 (12px) for compact, ~25px for wide view (2.1x)
  const barHeightClass = compact ? "h-3" : "h-[26px]";
  const spacingClass = compact ? "space-y-1.5" : "space-y-2.5";
  const roundedClass = compact ? "rounded-full" : "rounded";

  return (
    <div className={spacingClass}>
      {barData.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 group relative">
          <span
            className="text-xs text-muted-foreground w-32 truncate shrink-0 cursor-help"
            title={item.criterion}
          >
            {item.criterion}
          </span>
          <div className={`flex-1 ${barHeightClass} bg-muted ${roundedClass} overflow-hidden`}>
            <div
              className={`h-full ${roundedClass} transition-all`}
              style={{
                width: `${(item.value / 20) * 100}%`,
                backgroundColor: getBarColor(item.value),
              }}
            />
          </div>
          <span className="text-xs font-mono w-8 text-right shrink-0">
            {item.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function shortenLabel(label: string): string {
  const shortNames: Record<string, string> = {
    "Instruction Following": "Instructions",
    "Strong Dialogue": "Dialogue",
    "Show-Don't-Tell": "Show Don't Tell",
    "Creativity": "Creativity",
    "Avoids Amateurish Prose": "Avoid Amateur",
    "Pacing": "Pacing",
    "Descriptive Imagery": "Imagery",
    "Consistent Voice & Tone": "Voice/Tone",
    "Sentence Flow": "Flow",
    "Emotional Depth": "Emotion",
    "Avoids Positivity Bias": "Avoid Positivity",
    "Avoids Purple Prose": "Avoid Purple",
    "Believable Characters": "Characters",
    "Elegant Prose": "Elegant",
    "Coherent": "Coherent",
  };
  return shortNames[label] || (label.length > 14 ? label.slice(0, 12) + "..." : label);
}
