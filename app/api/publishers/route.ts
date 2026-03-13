import { NextResponse } from "next/server";

const PUBLISHER_CHECK_URL =
  "https://data.malbeclabs.com/api/dz/publisher-check";

let publisherCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  if (publisherCache && Date.now() - publisherCache.timestamp < CACHE_TTL) {
    return NextResponse.json(publisherCache.data);
  }

  try {
    const res = await fetch(PUBLISHER_CHECK_URL, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch publishers: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    publisherCache = { data, timestamp: Date.now() };
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch publishers: ${err}` },
      { status: 500 }
    );
  }
}
