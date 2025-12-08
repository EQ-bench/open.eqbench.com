"use client";

import * as React from "react";
import { usePalette, type PaletteKey } from "./palette-provider";

export function PaletteSwitcher() {
  const { palette, setPalette, palettes } = usePalette();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <select className="h-9 rounded-md border border-input bg-background px-3 text-sm opacity-0">
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select
      value={palette}
      onChange={(e) => setPalette(e.target.value as PaletteKey)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground cursor-pointer hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {Object.entries(palettes).map(([key, { name }]) => (
        <option key={key} value={key}>
          {name}
        </option>
      ))}
    </select>
  );
}
