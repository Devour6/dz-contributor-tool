"use client";

import useSWR from "swr";
import type { RawSnapshot } from "@/lib/types/snapshot";
import type { ParsedSnapshot } from "@/lib/types/contributor";
import { parseSnapshot } from "@/lib/utils/snapshot-parser";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export function useRawSnapshot(epoch: number | null) {
  return useSWR<RawSnapshot>(
    epoch !== null ? `/api/snapshot?epoch=${epoch}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );
}

export function useSnapshot(epoch: number | null) {
  const { data: raw, error, isLoading, mutate } = useRawSnapshot(epoch);

  const parsed: ParsedSnapshot | undefined = raw ? parseSnapshot(raw) : undefined;

  return {
    data: parsed,
    raw,
    error,
    isLoading,
    mutate,
  };
}
