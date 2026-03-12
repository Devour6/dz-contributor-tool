"use client";

import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps";
import type { ParsedSnapshot } from "@/lib/types/contributor";
import { Card, CardContent } from "@/components/ui/card";
import {
  getContributorDisplayName,
  getContributorColor,
} from "@/lib/constants/config";

const GEO_URL = "/world-110m.json";

interface NetworkMapProps {
  snapshot: ParsedSnapshot;
}

export function NetworkMap({ snapshot }: NetworkMapProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [selectedContributor, setSelectedContributor] = useState<string | null>(
    null
  );

  // Build unique city coordinates from link endpoints
  const cities = useMemo(() => {
    const coords: Record<
      string,
      { code: string; name: string; country: string; lat: number; lng: number }
    > = {};
    for (const contributor of snapshot.contributors) {
      for (const link of contributor.links) {
        if (link.sideA.lat && link.sideA.lng) {
          coords[link.sideA.locationCode] = {
            code: link.sideA.locationCode,
            name: link.sideA.city || link.sideA.locationCode,
            country: link.sideA.country,
            lat: link.sideA.lat,
            lng: link.sideA.lng,
          };
        }
        if (link.sideZ.lat && link.sideZ.lng) {
          coords[link.sideZ.locationCode] = {
            code: link.sideZ.locationCode,
            name: link.sideZ.city || link.sideZ.locationCode,
            country: link.sideZ.country,
            lat: link.sideZ.lat,
            lng: link.sideZ.lng,
          };
        }
      }
    }
    return coords;
  }, [snapshot]);

  // Build link arcs
  const arcs = useMemo(() => {
    const lines: {
      key: string;
      from: [number, number];
      to: [number, number];
      contributor: string;
    }[] = [];
    for (const contributor of snapshot.contributors) {
      for (const link of contributor.links) {
        const a = cities[link.sideA.locationCode];
        const z = cities[link.sideZ.locationCode];
        if (a && z) {
          lines.push({
            key: link.pubkey,
            from: [a.lng, a.lat],
            to: [z.lng, z.lat],
            contributor: contributor.code,
          });
        }
      }
    }
    return lines;
  }, [snapshot, cities]);

  // Check if a city is relevant to the selected contributor
  const isCityActive = (code: string) => {
    if (!selectedContributor) return true;
    return snapshot.contributors
      .find((c) => c.code === selectedContributor)
      ?.links.some(
        (l) =>
          l.sideA.locationCode === code || l.sideZ.locationCode === code
      );
  };

  return (
    <div className="space-y-4">
      {/* Map */}
      <Card className="bg-cream-5 border-cream-8 overflow-hidden">
        <CardContent className="p-0">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 130,
              center: [15, 20],
            }}
            style={{ width: "100%", height: "auto" }}
            viewBox="0 0 800 420"
          >
            {/* Country outlines */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#161513"
                    stroke="#2a2825"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#1c1b18" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Fiber link arcs */}
            {arcs.map((arc) => {
              const isActive =
                !selectedContributor ||
                selectedContributor === arc.contributor;
              return (
                <Line
                  key={arc.key}
                  from={arc.from}
                  to={arc.to}
                  stroke={getContributorColor(arc.contributor)}
                  strokeWidth={isActive ? 1.5 : 0.3}
                  strokeOpacity={isActive ? 0.6 : 0.04}
                  strokeLinecap="round"
                />
              );
            })}

            {/* City markers */}
            {Object.values(cities).map((city) => {
              const active = isCityActive(city.code);
              const isHovered = hoveredCity === city.code;
              return (
                <Marker
                  key={city.code}
                  coordinates={[city.lng, city.lat]}
                  onMouseEnter={() => setHoveredCity(city.code)}
                  onMouseLeave={() => setHoveredCity(null)}
                >
                  {/* Glow */}
                  <circle
                    r={active ? 5 : 2}
                    fill="rgba(243,238,217,0.06)"
                  />
                  {/* Dot */}
                  <circle
                    r={active ? 2.5 : 1.2}
                    fill={active ? "#F3EED9" : "rgba(243,238,217,0.25)"}
                    style={{ cursor: "pointer" }}
                  />
                  {/* Label on hover */}
                  {(isHovered || (active && selectedContributor)) && (
                    <text
                      textAnchor="middle"
                      y={-9}
                      style={{
                        fontFamily: "var(--font-outfit)",
                        fontSize: 8,
                        fill: "rgba(243,238,217,0.7)",
                        pointerEvents: "none",
                      }}
                    >
                      {city.name}
                    </text>
                  )}
                </Marker>
              );
            })}
          </ComposableMap>
        </CardContent>
      </Card>

      {/* Contributor legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {snapshot.contributors
          .filter((c) => c.linkCount > 0)
          .sort((a, b) => b.linkCount - a.linkCount)
          .map((c) => (
            <button
              key={c.code}
              onClick={() =>
                setSelectedContributor(
                  selectedContributor === c.code ? null : c.code
                )
              }
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all border ${
                selectedContributor === c.code
                  ? "border-cream-30 bg-cream-10"
                  : "border-cream-8 hover:border-cream-15"
              }`}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: getContributorColor(c.code) }}
              />
              <span className="text-cream-60">
                {getContributorDisplayName(c.code)}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
