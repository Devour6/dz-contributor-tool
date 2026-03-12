"use client";

import useSWR from "swr";
import type { FeeHistory } from "@/lib/types/fees";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useFees() {
  return useSWR<FeeHistory>("/api/fees", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 min
  });
}
