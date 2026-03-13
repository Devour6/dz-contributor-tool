"use client";

import useSWR from "swr";
import type { PublisherCheckResponse } from "@/lib/types/publisher";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePublishers() {
  return useSWR<PublisherCheckResponse>("/api/publishers", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 min
  });
}
