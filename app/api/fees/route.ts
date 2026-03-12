import { NextResponse } from "next/server";
import { FEE_CONSOLIDATED_URL } from "@/lib/constants/config";
import { parseConsolidatedCsv, computeFeeHistory } from "@/lib/utils/fee-parser";

let feeCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  // Check cache
  if (feeCache && Date.now() - feeCache.timestamp < CACHE_TTL) {
    return NextResponse.json(feeCache.data);
  }

  try {
    const res = await fetch(FEE_CONSOLIDATED_URL, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch fees: ${res.status}` },
        { status: res.status }
      );
    }

    const csv = await res.text();
    const epochs = parseConsolidatedCsv(csv);
    const history = computeFeeHistory(epochs);

    // Cache it
    feeCache = { data: history, timestamp: Date.now() };

    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch fees: ${err}` },
      { status: 500 }
    );
  }
}
