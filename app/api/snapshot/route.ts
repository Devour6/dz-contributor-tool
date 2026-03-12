import { NextRequest, NextResponse } from "next/server";
import { getSnapshotUrl } from "@/lib/constants/config";

// In-memory cache for snapshots (they're ~5MB each)
const snapshotCache = new Map<number, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const epochStr = searchParams.get("epoch");

  if (!epochStr) {
    return NextResponse.json(
      { error: "epoch parameter required" },
      { status: 400 }
    );
  }

  const epoch = parseInt(epochStr, 10);
  if (isNaN(epoch)) {
    return NextResponse.json(
      { error: "epoch must be a number" },
      { status: 400 }
    );
  }

  // Check cache
  const cached = snapshotCache.get(epoch);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = getSnapshotUrl(epoch);
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: `Epoch ${epoch} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch snapshot: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Cache it
    snapshotCache.set(epoch, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch snapshot: ${err}` },
      { status: 500 }
    );
  }
}
