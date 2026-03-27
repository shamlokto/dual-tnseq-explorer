import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getZScoreColor(z: number | null | undefined): string {
  if (z === null || z === undefined) return "text-muted-foreground";
  if (z < -5) return "text-red-500";
  if (z < -3) return "text-orange-500";
  if (z > 5) return "text-blue-500";
  if (z > 3) return "text-sky-400";
  return "text-muted-foreground";
}

export function getZScoreBg(z: number | null | undefined): string {
  if (z === null || z === undefined) return "";
  if (z < -5) return "bg-red-500/10";
  if (z < -3) return "bg-orange-500/10";
  if (z > 5) return "bg-blue-500/10";
  if (z > 3) return "bg-sky-400/10";
  return "";
}

export function getZScoreLabel(z: number): string {
  if (z < -5) return "Strong negative";
  if (z < -3) return "Moderate negative";
  if (z > 5) return "Strong positive";
  if (z > 3) return "Moderate positive";
  return "Weak / neutral";
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(4);
}
