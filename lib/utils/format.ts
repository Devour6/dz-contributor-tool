import { LAMPORTS_PER_SOL } from "@/lib/constants/config";

export function formatSol(lamports: number, decimals = 2): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return sol.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSolFromSol(sol: number, decimals = 2): string {
  return sol.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(ratio: number, decimals = 2): string {
  return (ratio * 100).toFixed(decimals) + "%";
}

export function formatLatencyMs(ns: number): string {
  const ms = ns / 1_000_000;
  if (ms < 1) return "<1ms";
  return ms.toFixed(1) + "ms";
}

export function formatBandwidth(gbps: number): string {
  if (gbps >= 1) return gbps.toFixed(0) + " Gbps";
  return (gbps * 1000).toFixed(0) + " Mbps";
}

export function shortenPubkey(pubkey: string, chars = 4): string {
  if (pubkey.length <= chars * 2 + 3) return pubkey;
  return pubkey.slice(0, chars) + "..." + pubkey.slice(-chars);
}
