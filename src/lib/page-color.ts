import type { CSSProperties } from "react";

export const PAGE_COLORS = {
  green: { id: "green", label: "Green", swatch: "#0b3d2e", deep: "#06281e", soft: "#e6f1ec" },
  navy: { id: "navy", label: "Navy", swatch: "#1e3a5f", deep: "#12243c", soft: "#e8eef5" },
  teal: { id: "teal", label: "Teal", swatch: "#115e59", deep: "#0a3d3a", soft: "#e6f4f3" },
  burgundy: { id: "burgundy", label: "Burgundy", swatch: "#6b2d3c", deep: "#421c25", soft: "#f6e8eb" },
  brown: { id: "brown", label: "Brown", swatch: "#5c4033", deep: "#3a2820", soft: "#f3ebe6" },
} as const;

export type PageColorId = keyof typeof PAGE_COLORS;

export const PAGE_COLOR_IDS = Object.keys(PAGE_COLORS) as PageColorId[];

export function resolvePageColor(value?: string | null) {
  const id = (value && value in PAGE_COLORS ? value : "green") as PageColorId;
  const color = PAGE_COLORS[id];
  return {
    id,
    vars: {
      "--green": color.swatch,
      "--green-deep": color.deep,
      "--green-soft": color.soft,
    } as CSSProperties,
  };
}
