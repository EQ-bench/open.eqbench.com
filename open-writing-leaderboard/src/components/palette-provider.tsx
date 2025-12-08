"use client";

import * as React from "react";

export type PaletteKey = "default" | "ocean" | "forest" | "sunset" | "lavender" | "mono";

interface PaletteColors {
  light: Record<string, string>;
  dark: Record<string, string>;
}

const palettes: Record<PaletteKey, { name: string; colors: PaletteColors }> = {
  default: {
    name: "Default",
    colors: {
      light: {
        "--background": "oklch(1 0 0)",
        "--foreground": "oklch(0.145 0 0)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.145 0 0)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.145 0 0)",
        "--primary": "oklch(0.205 0 0)",
        "--primary-foreground": "oklch(0.985 0 0)",
        "--secondary": "oklch(0.97 0 0)",
        "--secondary-foreground": "oklch(0.205 0 0)",
        "--muted": "oklch(0.97 0 0)",
        "--muted-foreground": "oklch(0.556 0 0)",
        "--accent": "oklch(0.97 0 0)",
        "--accent-foreground": "oklch(0.205 0 0)",
        "--border": "oklch(0.922 0 0)",
        "--input": "oklch(0.922 0 0)",
        "--ring": "oklch(0.708 0 0)",
      },
      dark: {
        "--background": "oklch(0.145 0 0)",
        "--foreground": "oklch(0.985 0 0)",
        "--card": "oklch(0.205 0 0)",
        "--card-foreground": "oklch(0.985 0 0)",
        "--popover": "oklch(0.205 0 0)",
        "--popover-foreground": "oklch(0.985 0 0)",
        "--primary": "oklch(0.922 0 0)",
        "--primary-foreground": "oklch(0.205 0 0)",
        "--secondary": "oklch(0.269 0 0)",
        "--secondary-foreground": "oklch(0.985 0 0)",
        "--muted": "oklch(0.269 0 0)",
        "--muted-foreground": "oklch(0.708 0 0)",
        "--accent": "oklch(0.269 0 0)",
        "--accent-foreground": "oklch(0.985 0 0)",
        "--border": "oklch(1 0 0 / 10%)",
        "--input": "oklch(1 0 0 / 15%)",
        "--ring": "oklch(0.556 0 0)",
      },
    },
  },
  ocean: {
    name: "Ocean",
    colors: {
      light: {
        "--background": "oklch(0.98 0.01 220)",
        "--foreground": "oklch(0.2 0.02 240)",
        "--card": "oklch(0.99 0.005 220)",
        "--card-foreground": "oklch(0.2 0.02 240)",
        "--popover": "oklch(0.99 0.005 220)",
        "--popover-foreground": "oklch(0.2 0.02 240)",
        "--primary": "oklch(0.5 0.15 240)",
        "--primary-foreground": "oklch(0.98 0.01 220)",
        "--secondary": "oklch(0.92 0.03 200)",
        "--secondary-foreground": "oklch(0.25 0.03 240)",
        "--muted": "oklch(0.94 0.02 210)",
        "--muted-foreground": "oklch(0.45 0.03 230)",
        "--accent": "oklch(0.7 0.12 190)",
        "--accent-foreground": "oklch(0.15 0.02 240)",
        "--border": "oklch(0.88 0.03 215)",
        "--input": "oklch(0.88 0.03 215)",
        "--ring": "oklch(0.5 0.15 240)",
      },
      dark: {
        "--background": "oklch(0.15 0.02 240)",
        "--foreground": "oklch(0.95 0.01 210)",
        "--card": "oklch(0.2 0.025 235)",
        "--card-foreground": "oklch(0.95 0.01 210)",
        "--popover": "oklch(0.2 0.025 235)",
        "--popover-foreground": "oklch(0.95 0.01 210)",
        "--primary": "oklch(0.7 0.12 210)",
        "--primary-foreground": "oklch(0.15 0.02 240)",
        "--secondary": "oklch(0.28 0.03 235)",
        "--secondary-foreground": "oklch(0.92 0.01 210)",
        "--muted": "oklch(0.28 0.03 235)",
        "--muted-foreground": "oklch(0.65 0.04 215)",
        "--accent": "oklch(0.55 0.1 200)",
        "--accent-foreground": "oklch(0.95 0.01 210)",
        "--border": "oklch(0.35 0.03 230)",
        "--input": "oklch(0.35 0.03 230)",
        "--ring": "oklch(0.6 0.12 210)",
      },
    },
  },
  forest: {
    name: "Forest",
    colors: {
      light: {
        "--background": "oklch(0.98 0.01 140)",
        "--foreground": "oklch(0.2 0.03 150)",
        "--card": "oklch(0.99 0.008 140)",
        "--card-foreground": "oklch(0.2 0.03 150)",
        "--popover": "oklch(0.99 0.008 140)",
        "--popover-foreground": "oklch(0.2 0.03 150)",
        "--primary": "oklch(0.45 0.12 155)",
        "--primary-foreground": "oklch(0.98 0.01 140)",
        "--secondary": "oklch(0.93 0.03 130)",
        "--secondary-foreground": "oklch(0.25 0.04 150)",
        "--muted": "oklch(0.94 0.02 135)",
        "--muted-foreground": "oklch(0.45 0.04 145)",
        "--accent": "oklch(0.65 0.1 120)",
        "--accent-foreground": "oklch(0.2 0.03 150)",
        "--border": "oklch(0.88 0.03 140)",
        "--input": "oklch(0.88 0.03 140)",
        "--ring": "oklch(0.45 0.12 155)",
      },
      dark: {
        "--background": "oklch(0.14 0.02 150)",
        "--foreground": "oklch(0.94 0.02 130)",
        "--card": "oklch(0.19 0.025 148)",
        "--card-foreground": "oklch(0.94 0.02 130)",
        "--popover": "oklch(0.19 0.025 148)",
        "--popover-foreground": "oklch(0.94 0.02 130)",
        "--primary": "oklch(0.65 0.13 145)",
        "--primary-foreground": "oklch(0.14 0.02 150)",
        "--secondary": "oklch(0.26 0.03 148)",
        "--secondary-foreground": "oklch(0.92 0.02 130)",
        "--muted": "oklch(0.26 0.03 148)",
        "--muted-foreground": "oklch(0.62 0.04 140)",
        "--accent": "oklch(0.5 0.1 125)",
        "--accent-foreground": "oklch(0.94 0.02 130)",
        "--border": "oklch(0.32 0.03 148)",
        "--input": "oklch(0.32 0.03 148)",
        "--ring": "oklch(0.55 0.12 145)",
      },
    },
  },
  sunset: {
    name: "Sunset",
    colors: {
      light: {
        "--background": "oklch(0.99 0.01 50)",
        "--foreground": "oklch(0.2 0.03 30)",
        "--card": "oklch(0.995 0.008 45)",
        "--card-foreground": "oklch(0.2 0.03 30)",
        "--popover": "oklch(0.995 0.008 45)",
        "--popover-foreground": "oklch(0.2 0.03 30)",
        "--primary": "oklch(0.55 0.2 25)",
        "--primary-foreground": "oklch(0.99 0.01 50)",
        "--secondary": "oklch(0.95 0.04 60)",
        "--secondary-foreground": "oklch(0.25 0.04 30)",
        "--muted": "oklch(0.95 0.03 55)",
        "--muted-foreground": "oklch(0.5 0.05 35)",
        "--accent": "oklch(0.75 0.15 70)",
        "--accent-foreground": "oklch(0.2 0.03 30)",
        "--border": "oklch(0.9 0.04 55)",
        "--input": "oklch(0.9 0.04 55)",
        "--ring": "oklch(0.55 0.2 25)",
      },
      dark: {
        "--background": "oklch(0.14 0.02 25)",
        "--foreground": "oklch(0.96 0.02 55)",
        "--card": "oklch(0.19 0.03 28)",
        "--card-foreground": "oklch(0.96 0.02 55)",
        "--popover": "oklch(0.19 0.03 28)",
        "--popover-foreground": "oklch(0.96 0.02 55)",
        "--primary": "oklch(0.7 0.18 35)",
        "--primary-foreground": "oklch(0.14 0.02 25)",
        "--secondary": "oklch(0.28 0.04 30)",
        "--secondary-foreground": "oklch(0.94 0.02 55)",
        "--muted": "oklch(0.28 0.04 30)",
        "--muted-foreground": "oklch(0.65 0.05 45)",
        "--accent": "oklch(0.6 0.15 50)",
        "--accent-foreground": "oklch(0.96 0.02 55)",
        "--border": "oklch(0.35 0.04 30)",
        "--input": "oklch(0.35 0.04 30)",
        "--ring": "oklch(0.65 0.18 35)",
      },
    },
  },
  lavender: {
    name: "Lavender",
    colors: {
      light: {
        "--background": "oklch(0.98 0.015 290)",
        "--foreground": "oklch(0.22 0.03 280)",
        "--card": "oklch(0.99 0.01 290)",
        "--card-foreground": "oklch(0.22 0.03 280)",
        "--popover": "oklch(0.99 0.01 290)",
        "--popover-foreground": "oklch(0.22 0.03 280)",
        "--primary": "oklch(0.55 0.15 300)",
        "--primary-foreground": "oklch(0.98 0.015 290)",
        "--secondary": "oklch(0.94 0.04 285)",
        "--secondary-foreground": "oklch(0.28 0.04 280)",
        "--muted": "oklch(0.94 0.03 288)",
        "--muted-foreground": "oklch(0.5 0.04 285)",
        "--accent": "oklch(0.7 0.12 320)",
        "--accent-foreground": "oklch(0.22 0.03 280)",
        "--border": "oklch(0.9 0.04 288)",
        "--input": "oklch(0.9 0.04 288)",
        "--ring": "oklch(0.55 0.15 300)",
      },
      dark: {
        "--background": "oklch(0.22 0.03 285)",
        "--foreground": "oklch(0.95 0.02 295)",
        "--card": "oklch(0.28 0.035 283)",
        "--card-foreground": "oklch(0.95 0.02 295)",
        "--popover": "oklch(0.28 0.035 283)",
        "--popover-foreground": "oklch(0.95 0.02 295)",
        "--primary": "oklch(0.75 0.14 305)",
        "--primary-foreground": "oklch(0.18 0.025 285)",
        "--secondary": "oklch(0.35 0.045 283)",
        "--secondary-foreground": "oklch(0.93 0.02 295)",
        "--muted": "oklch(0.35 0.045 283)",
        "--muted-foreground": "oklch(0.68 0.04 290)",
        "--accent": "oklch(0.58 0.12 320)",
        "--accent-foreground": "oklch(0.95 0.02 295)",
        "--border": "oklch(0.42 0.045 283)",
        "--input": "oklch(0.42 0.045 283)",
        "--ring": "oklch(0.65 0.14 305)",
      },
    },
  },
  mono: {
    name: "High Contrast",
    colors: {
      light: {
        "--background": "oklch(1 0 0)",
        "--foreground": "oklch(0 0 0)",
        "--card": "oklch(0.98 0 0)",
        "--card-foreground": "oklch(0 0 0)",
        "--popover": "oklch(0.98 0 0)",
        "--popover-foreground": "oklch(0 0 0)",
        "--primary": "oklch(0 0 0)",
        "--primary-foreground": "oklch(1 0 0)",
        "--secondary": "oklch(0.95 0 0)",
        "--secondary-foreground": "oklch(0 0 0)",
        "--muted": "oklch(0.95 0 0)",
        "--muted-foreground": "oklch(0.35 0 0)",
        "--accent": "oklch(0.92 0 0)",
        "--accent-foreground": "oklch(0 0 0)",
        "--border": "oklch(0.8 0 0)",
        "--input": "oklch(0.8 0 0)",
        "--ring": "oklch(0 0 0)",
      },
      dark: {
        "--background": "oklch(0.08 0 0)",
        "--foreground": "oklch(1 0 0)",
        "--card": "oklch(0.12 0 0)",
        "--card-foreground": "oklch(1 0 0)",
        "--popover": "oklch(0.12 0 0)",
        "--popover-foreground": "oklch(1 0 0)",
        "--primary": "oklch(1 0 0)",
        "--primary-foreground": "oklch(0.08 0 0)",
        "--secondary": "oklch(0.18 0 0)",
        "--secondary-foreground": "oklch(1 0 0)",
        "--muted": "oklch(0.18 0 0)",
        "--muted-foreground": "oklch(0.7 0 0)",
        "--accent": "oklch(0.22 0 0)",
        "--accent-foreground": "oklch(1 0 0)",
        "--border": "oklch(0.35 0 0)",
        "--input": "oklch(0.35 0 0)",
        "--ring": "oklch(1 0 0)",
      },
    },
  },
};

interface PaletteContextType {
  palette: PaletteKey;
  setPalette: (palette: PaletteKey) => void;
  palettes: typeof palettes;
}

const PaletteContext = React.createContext<PaletteContextType | undefined>(undefined);

export function usePalette() {
  const context = React.useContext(PaletteContext);
  if (!context) {
    throw new Error("usePalette must be used within a PaletteProvider");
  }
  return context;
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = React.useState<PaletteKey>("default");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("palette") as PaletteKey | null;
    if (stored && palettes[stored]) {
      setPaletteState(stored);
    }
  }, []);

  const setPalette = React.useCallback((newPalette: PaletteKey) => {
    setPaletteState(newPalette);
    localStorage.setItem("palette", newPalette);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const applyPalette = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const colors = palettes[palette].colors[isDark ? "dark" : "light"];

      Object.entries(colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    };

    applyPalette();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          applyPalette();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [palette, mounted]);

  return (
    <PaletteContext.Provider value={{ palette, setPalette, palettes }}>
      {children}
    </PaletteContext.Provider>
  );
}
