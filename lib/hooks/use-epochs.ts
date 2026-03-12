"use client";

import useSWR from "swr";

interface EpochsData {
  latest: number;
  earliest: number;
  available: number[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useEpochs() {
  return useSWR<EpochsData>("/api/epochs", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 min
  });
}
