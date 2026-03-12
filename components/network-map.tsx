"use client";

import { useMemo, useState } from "react";
import type { ParsedSnapshot, Contributor, Link } from "@/lib/types/contributor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getContributorDisplayName } from "@/lib/constants/config";

interface NetworkMapProps {
  snapshot: ParsedSnapshot;
}

// Map a lat/lng to SVG coordinates using Mercator-ish projection
// Focused on the regions where DZ infrastructure exists (Americas + Europe mainly)
function toSvg(
  lat: number,
  lng: number,
  width: number,
  height: number,
  padding = 40
): { x: number; y: number } {
  // Normalize lng from [-180, 180] to [0, 1]
  const x = ((lng + 180) / 360) * (width - padding * 2) + padding;
  // Normalize lat from [90, -90] to [0, 1] (flipped for SVG Y axis)
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y =
    (0.5 - mercN / (2 * Math.PI)) * (height - padding * 2) + padding;
  return { x, y };
}

// Generate a deterministic color for a contributor code
const CONTRIBUTOR_COLORS: Record<string, string> = {
  jump_: "#FF6B6B",
  dgt: "#4ECDC4",
  tsw: "#45B7D1",
  glxy: "#96CEB4",
  stakefac: "#FFEAA7",
  cherry: "#DDA0DD",
  rox: "#98D8C8",
  s3v: "#F7DC6F",
  laconic: "#BB8FCE",
  infiber: "#85C1E9",
  cdrw: "#F0B27A",
  latitude: "#82E0AA",
  velia: "#F1948A",
  allnodes: "#AED6F1",
};

function getContributorColor(code: string): string {
  return CONTRIBUTOR_COLORS[code] || "#F3EED9";
}

export function NetworkMap({ snapshot }: NetworkMapProps) {
  const [hoveredContributor, setHoveredContributor] = useState<string | null>(null);
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);

  const width = 1100;
  const height = 550;

  // Build location coordinate map from links (they have lat/lng on endpoints)
  const locationCoords = useMemo(() => {
    const coords: Record<string, { x: number; y: number; city: string; country: string; lat: number; lng: number }> = {};
    for (const contributor of snapshot.contributors) {
      for (const link of contributor.links) {
        if (link.sideA.lat && link.sideA.lng) {
          const pos = toSvg(link.sideA.lat, link.sideA.lng, width, height);
          coords[link.sideA.locationCode] = {
            ...pos,
            city: link.sideA.city || link.sideA.locationCode,
            country: link.sideA.country,
            lat: link.sideA.lat,
            lng: link.sideA.lng,
          };
        }
        if (link.sideZ.lat && link.sideZ.lng) {
          const pos = toSvg(link.sideZ.lat, link.sideZ.lng, width, height);
          coords[link.sideZ.locationCode] = {
            ...pos,
            city: link.sideZ.city || link.sideZ.locationCode,
            country: link.sideZ.country,
            lat: link.sideZ.lat,
            lng: link.sideZ.lng,
          };
        }
      }
    }
    return coords;
  }, [snapshot]);

  // Build all link lines
  const linkLines = useMemo(() => {
    const lines: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      contributor: string;
      sideA: string;
      sideZ: string;
      health: string;
    }[] = [];

    for (const contributor of snapshot.contributors) {
      for (const link of contributor.links) {
        const a = locationCoords[link.sideA.locationCode];
        const z = locationCoords[link.sideZ.locationCode];
        if (a && z) {
          lines.push({
            key: link.pubkey,
            x1: a.x,
            y1: a.y,
            x2: z.x,
            y2: z.y,
            contributor: contributor.code,
            sideA: a.city,
            sideZ: z.city,
            health: link.health,
          });
        }
      }
    }
    return lines;
  }, [snapshot, locationCoords]);

  const activeFilter = selectedContributor || hoveredContributor;

  // Stats for selected contributor
  const selectedStats = useMemo(() => {
    if (!activeFilter) return null;
    const c = snapshot.contributors.find((c) => c.code === activeFilter);
    if (!c) return null;
    return {
      name: getContributorDisplayName(c.code),
      code: c.code,
      links: c.linkCount,
      devices: c.deviceCount,
      cities: c.cities.length,
    };
  }, [activeFilter, snapshot]);

  return (
    <div className="space-y-4">
      {/* Legend / contributor filter */}
      <Card className="bg-cream-5 border-cream-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-cream-60">Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {snapshot.contributors
              .filter((c) => c.linkCount > 0)
              .sort((a, b) => b.linkCount - a.linkCount)
              .map((c) => (
                <button
                  key={c.code}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all border ${
                    selectedContributor === c.code
                      ? "border-cream-40 bg-cream-10"
                      : "border-cream-8 hover:border-cream-20"
                  }`}
                  onMouseEnter={() => setHoveredContributor(c.code)}
                  onMouseLeave={() => setHoveredContributor(null)}
                  onClick={() =>
                    setSelectedContributor(
                      selectedContributor === c.code ? null : c.code
                    )
                  }
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: getContributorColor(c.code) }}
                  />
                  <span className="text-cream-60">
                    {getContributorDisplayName(c.code)}
                  </span>
                  <span className="text-cream-20">{c.linkCount}</span>
                </button>
              ))}
          </div>
          {selectedStats && (
            <div className="mt-3 flex items-center gap-4 text-xs text-cream-40">
              <span className="text-cream">{selectedStats.name}</span>
              <span>{selectedStats.links} links</span>
              <span>{selectedStats.devices} devices</span>
              <span>{selectedStats.cities} cities</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="bg-cream-5 border-cream-8 overflow-hidden">
        <CardContent className="p-0">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            style={{ minHeight: 400 }}
          >
            {/* Background */}
            <rect width={width} height={height} fill="#0F0E0C" />

            {/* Grid lines for reference */}
            {[-60, -30, 0, 30, 60].map((lat) => {
              const { y } = toSvg(lat, 0, width, height);
              return (
                <line
                  key={`lat-${lat}`}
                  x1={40}
                  y1={y}
                  x2={width - 40}
                  y2={y}
                  stroke="rgba(243,238,217,0.03)"
                  strokeWidth={0.5}
                />
              );
            })}
            {[-120, -60, 0, 60, 120].map((lng) => {
              const { x } = toSvg(0, lng, width, height);
              return (
                <line
                  key={`lng-${lng}`}
                  x1={x}
                  y1={40}
                  x2={x}
                  y2={height - 40}
                  stroke="rgba(243,238,217,0.03)"
                  strokeWidth={0.5}
                />
              );
            })}

            {/* Links */}
            {linkLines.map((line) => {
              const isActive = !activeFilter || line.contributor === activeFilter;
              const color = getContributorColor(line.contributor);
              return (
                <line
                  key={line.key}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={color}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  strokeOpacity={isActive ? 0.7 : 0.08}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Location dots */}
            {Object.entries(locationCoords).map(([code, loc]) => {
              // Check if any active link touches this location
              const isActive =
                !activeFilter ||
                snapshot.contributors
                  .find((c) => c.code === activeFilter)
                  ?.links.some(
                    (l) =>
                      l.sideA.locationCode === code ||
                      l.sideZ.locationCode === code
                  );
              return (
                <g key={code}>
                  {/* Glow */}
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={isActive ? 6 : 3}
                    fill="rgba(243,238,217,0.08)"
                  />
                  {/* Dot */}
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={isActive ? 3 : 1.5}
                    fill={isActive ? "#F3EED9" : "rgba(243,238,217,0.3)"}
                  />
                  {/* Label */}
                  {isActive && (
                    <text
                      x={loc.x}
                      y={loc.y - 8}
                      textAnchor="middle"
                      fontSize={9}
                      fill="rgba(243,238,217,0.6)"
                      fontFamily="var(--font-outfit)"
                    >
                      {loc.city}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-cream-5 border-cream-8">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-cream-40 mb-1">Unique Locations</p>
            <p className="text-lg font-display text-cream">
              {Object.keys(locationCoords).length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-cream-5 border-cream-8">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-cream-40 mb-1">Total Links</p>
            <p className="text-lg font-display text-cream">
              {linkLines.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-cream-5 border-cream-8">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-cream-40 mb-1">Active Contributors</p>
            <p className="text-lg font-display text-cream">
              {snapshot.contributors.filter((c) => c.linkCount > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
