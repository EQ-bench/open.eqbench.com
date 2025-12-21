"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export interface ScoreBarPalette {
  id: string;
  name: string;
  gradient: string;
  preview: string[]; // Array of hex colors for preview
}

export const scoreBarPalettes: ScoreBarPalette[] = [
  {
    id: "current",
    name: "Current (Purple → Cyan)",
    gradient: "bg-gradient-to-r from-[oklch(0.488_0.243_264.376)] to-[oklch(0.696_0.17_162.48)]",
    preview: ["#7c3aed", "#22d3ee"],
  },
  {
    id: "logo-pink",
    name: "Logo Pink Gradient",
    gradient: "bg-gradient-to-r from-[#fb4c94] to-[#fb84ac]",
    preview: ["#fb4c94", "#fb84ac"],
  },
  {
    id: "purple-to-pink",
    name: "Purple → Violet Red",
    gradient: "bg-gradient-to-r from-violet-700 to-[#c93d77] dark:from-violet-500 dark:to-[#fb4c94]",
    preview: ["#8b5cf6", "#fb4c94"],
  },
  {
    id: "aubergine-pink",
    name: "Aubergine → Pink",
    gradient: "bg-gradient-to-r from-[#3d0f1f] via-[#fb4c94] to-[#fb84ac]",
    preview: ["#3d0f1f", "#fb4c94", "#fb84ac"],
  },
  {
    id: "violet-magenta",
    name: "Violet → Magenta",
    gradient: "bg-gradient-to-r from-violet-600 to-fuchsia-500",
    preview: ["#7c3aed", "#d946ef"],
  },
  {
    id: "deep-purple",
    name: "Deep Purple → Lavender",
    gradient: "bg-gradient-to-r from-purple-700 to-purple-400",
    preview: ["#7e22ce", "#c084fc"],
  },
  {
    id: "pink-purple",
    name: "Pink → Purple",
    gradient: "bg-gradient-to-r from-[#fb4c94] to-violet-600",
    preview: ["#fb4c94", "#7c3aed"],
  },
  {
    id: "sunset-violet",
    name: "Sunset Violet",
    gradient: "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500",
    preview: ["#f43f5e", "#d946ef", "#8b5cf6"],
  },
  {
    id: "neon-pink",
    name: "Neon Pink",
    gradient: "bg-gradient-to-r from-pink-500 to-rose-400",
    preview: ["#ec4899", "#fb7185"],
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    gradient: "bg-gradient-to-r from-indigo-600 to-purple-500",
    preview: ["#4f46e5", "#a855f7"],
  },
  {
    id: "berry",
    name: "Berry Crush",
    gradient: "bg-gradient-to-r from-[#1c040c] via-[#7b1f47] to-[#fb4c94]",
    preview: ["#1c040c", "#7b1f47", "#fb4c94"],
  },
  {
    id: "holographic",
    name: "Holographic",
    gradient: "bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500",
    preview: ["#22d3ee", "#8b5cf6", "#d946ef"],
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    gradient: "bg-gradient-to-r from-blue-900 via-blue-600 to-cyan-400",
    preview: ["#1e3a8a", "#2563eb", "#22d3ee"],
  },
  {
    id: "emerald",
    name: "Emerald",
    gradient: "bg-gradient-to-r from-emerald-700 to-emerald-400",
    preview: ["#047857", "#34d399"],
  },
  {
    id: "arctic",
    name: "Arctic",
    gradient: "bg-gradient-to-r from-slate-600 via-blue-400 to-cyan-300",
    preview: ["#475569", "#60a5fa", "#67e8f9"],
  },
  {
    id: "forest",
    name: "Forest",
    gradient: "bg-gradient-to-r from-green-900 via-green-600 to-lime-400",
    preview: ["#14532d", "#16a34a", "#a3e635"],
  },
  {
    id: "midnight",
    name: "Midnight Purple",
    gradient: "bg-gradient-to-r from-slate-900 via-violet-800 to-violet-500",
    preview: ["#0f172a", "#5b21b6", "#8b5cf6"],
  },
  {
    id: "copper",
    name: "Copper",
    gradient: "bg-gradient-to-r from-amber-900 via-orange-600 to-amber-400",
    preview: ["#78350f", "#ea580c", "#fbbf24"],
  },
  {
    id: "steel",
    name: "Steel",
    gradient: "bg-gradient-to-r from-slate-700 to-slate-400",
    preview: ["#334155", "#94a3b8"],
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    gradient: "bg-gradient-to-r from-blue-600 to-blue-400",
    preview: ["#2563eb", "#60a5fa"],
  },
  {
    id: "aurora",
    name: "Aurora",
    gradient: "bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-500",
    preview: ["#0d9488", "#06b6d4", "#3b82f6"],
  },
  {
    id: "gold",
    name: "Gold",
    gradient: "bg-gradient-to-r from-yellow-700 via-amber-500 to-yellow-400",
    preview: ["#a16207", "#f59e0b", "#facc15"],
  },
  {
    id: "autumn-1",
    name: "Autumn Quill",
    gradient: "bg-gradient-to-r from-amber-900 via-amber-600 via-60% to-rose-400",
    preview: ["#78350f", "#d97706", "#fb7185"],
  },
  {
    id: "autumn-2",
    name: "Manuscript",
    gradient: "bg-gradient-to-r from-stone-700 via-amber-700 via-50% via-orange-500 via-80% to-rose-400",
    preview: ["#44403c", "#b45309", "#f97316", "#fb7185"],
  },
  {
    id: "autumn-3",
    name: "Parchment Sunset",
    gradient: "bg-gradient-to-r from-yellow-900 via-orange-600 via-70% to-pink-400",
    preview: ["#713f12", "#ea580c", "#f472b6"],
  },
  {
    id: "autumn-4",
    name: "Old Library",
    gradient: "bg-gradient-to-r from-stone-800 via-amber-800 via-40% via-amber-500 via-75% to-orange-400",
    preview: ["#292524", "#92400e", "#f59e0b", "#fb923c"],
  },
  {
    id: "autumn-5",
    name: "Sepia to Blush",
    gradient: "bg-gradient-to-r from-amber-950 via-amber-700 via-45% via-orange-400 via-80% to-rose-300",
    preview: ["#451a03", "#b45309", "#fb923c", "#fda4af"],
  },
  {
    id: "autumn-6",
    name: "Fireside",
    gradient: "bg-gradient-to-r from-stone-900 via-red-900 via-35% via-orange-600 via-70% to-amber-400",
    preview: ["#1c1917", "#7f1d1d", "#ea580c", "#fbbf24"],
  },
  {
    id: "autumn-7",
    name: "Inkwell Dusk",
    gradient: "bg-gradient-to-r from-stone-900 via-amber-900 via-30% via-orange-500 via-65% via-rose-400 via-90% to-pink-300",
    preview: ["#1c1917", "#78350f", "#f97316", "#fb7185", "#f9a8d4"],
  },
];

interface ScoreBarPaletteSelectorProps {
  value: string;
  onChange: (paletteId: string) => void;
}

export function ScoreBarPaletteSelector({ value, onChange }: ScoreBarPaletteSelectorProps) {
  return (
    <div className="mb-6 p-4 rounded-lg border border-dashed border-yellow-500/50 bg-yellow-500/5">
      <div className="text-sm font-medium mb-3 text-yellow-600 dark:text-yellow-400">
        🎨 Score Bar Palette Preview (temporary)
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {scoreBarPalettes.map((palette) => (
          <button
            key={palette.id}
            onClick={() => onChange(palette.id)}
            className={`relative p-2 rounded-md border text-left transition-all ${
              value === palette.id
                ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            {value === palette.id && (
              <div className="absolute top-1 right-1">
                <Check className="h-3 w-3 text-primary" />
              </div>
            )}
            <div className="text-xs font-medium mb-1.5 truncate pr-4">{palette.name}</div>
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{
                background:
                  palette.preview.length === 2
                    ? `linear-gradient(to right, ${palette.preview[0]}, ${palette.preview[1]})`
                    : palette.preview.length === 3
                    ? `linear-gradient(to right, ${palette.preview[0]}, ${palette.preview[1]}, ${palette.preview[2]})`
                    : palette.preview[0],
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function useScoreBarPalette() {
  const [paletteId, setPaletteId] = useState("current");
  const palette = scoreBarPalettes.find((p) => p.id === paletteId) ?? scoreBarPalettes[0];
  return { paletteId, setPaletteId, palette };
}
