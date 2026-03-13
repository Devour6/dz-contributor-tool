"use client";

import useSWR from "swr";
import type { ShapleyResponse } from "@/lib/types/shapley";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useShapleyValues(epoch: number | null) {
  return useSWR<ShapleyResponse>(
    epoch !== null ? `/api/shapley?epoch=${epoch}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 min
    }
  );
}
