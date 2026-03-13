"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ComposableMap,
  ZoomableGroup,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps";
import type { ParsedSnapshot } from "@/lib/types/contributor";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getContributorDisplayName,
  getContributorColor,
  CONTRIBUTOR_SHARE,
} from "@/lib/constants/config";
import { formatPercent, formatSolFromSol } from "@/lib/utils/format";
import { Cable, MapPin, Server, ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";

const GEO_URL = "/world-110m.json";

interface NetworkMapProps {
  snapshot: ParsedSnapshot;
}

interface CityInfo {
  code: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  linkCount: number;
  contributors: string[];
}

interface TooltipData {
  x: number;
  y: number;
  city: CityInfo;
}

export function NetworkMap({ snapshot }: NetworkMapProps) {
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([15, 20]);

  // Build unique city coordinates with enriched data
  const cities = useMemo(() => {
    const coords: Record<string, CityInfo> = {};
    for (const contributor of snapshot.contributors) {
      for (const link of contributor.links) {
        for (const side of [link.sideA, link.sideZ]) {
          if (side.lat && side.lng) {
            if (!coords[side.locationCode]) {
              coords[side.locationCode] = {
                code: side.locationCode,
                name: side.city || side.locationCode,
                country: side.country,
                lat: side.lat,
                lng: side.lng,
                linkCount: 0,
                contributors: [],
              };
            }
            coords[side.locationCode].linkCount++;
            if (!coords[side.locationCode].contributors.includes(contributor.code)) {
              coords[side.locationCode].contributors.push(contributor.code);
            }
          }
        }
      }
    }
    return coords;
  }, [snapshot]);

  // Build link arcs with richer data
  const arcs = useMemo(() => {
    const lines: {
      key: string;
      from: [number, number];
      to: [number, number];
      contributor: string;
      cityA: string;
      cityZ: string;
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
            cityA: link.sideA.locationCode,
            cityZ: link.sideZ.locationCode,
          });
        }
      }
    }
    return lines;
  }, [snapshot, cities]);

  // Filter logic: arc is visible if it matches contributor AND/OR city filter
  const isArcActive = useCallback(
    (arc: (typeof arcs)[0]) => {
      const matchesContributor = !selectedContributor || arc.contributor === selectedContributor;
      const matchesCity = !selectedCity || arc.cityA === selectedCity || arc.cityZ === selectedCity;
      return matchesContributor && matchesCity;
    },
    [selectedContributor, selectedCity]
  );

  const isCityActive = useCallback(
    (code: string) => {
      if (selectedContributor) {
        return snapshot.contributors
          .find((c) => c.code === selectedContributor)
          ?.links.some(
            (l) => l.sideA.locationCode === code || l.sideZ.locationCode === code
          ) ?? false;
      }
      if (selectedCity) {
        if (code === selectedCity) return true;
        // Also highlight cities connected to the selected city
        return arcs.some(
          (a) =>
            (a.cityA === selectedCity && a.cityZ === code) ||
            (a.cityZ === selectedCity && a.cityA === code)
        );
      }
      return true;
    },
    [selectedContributor, selectedCity, snapshot, arcs]
  );

  // Selected contributor stats
  const selectedContributorData = useMemo(() => {
    if (!selectedContributor) return null;
    return snapshot.contributors.find((c) => c.code === selectedContributor) || null;
  }, [selectedContributor, snapshot]);

  // Selected city connections
  const selectedCityLinks = useMemo(() => {
    if (!selectedCity) return [];
    return arcs.filter((a) => a.cityA === selectedCity || a.cityZ === selectedCity);
  }, [selectedCity, arcs]);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.5, 8));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, 1));
  const handleReset = () => {
    setZoom(1);
    setCenter([15, 20]);
  };

  const handleCityClick = (code: string, city: CityInfo) => {
    if (selectedCity === code) {
      setSelectedCity(null);
    } else {
      setSelectedCity(code);
      setCenter([city.lng, city.lat]);
      setZoom((z) => Math.max(z, 3));
    }
  };

  const clearFilters = () => {
    setSelectedContributor(null);
    setSelectedCity(null);
    handleReset();
  };

  const hasActiveFilter = selectedContributor || selectedCity;

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Map */}
        <Card className="bg-cream-5 border-cream-8 overflow-hidden">
          <CardContent className="p-0 relative">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 130,
                center: [15, 20],
              }}
              style={{ width: "100%", height: "auto" }}
              viewBox="0 0 800 420"
            >
              <ZoomableGroup
                center={center}
                zoom={zoom}
                onMoveEnd={({ coordinates, zoom: z }) => {
                  setCenter(coordinates);
                  setZoom(z);
                }}
                minZoom={1}
                maxZoom={8}
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
                        strokeWidth={0.4 / zoom}
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
                  const active = isArcActive(arc);
                  return (
                    <Line
                      key={arc.key}
                      from={arc.from}
                      to={arc.to}
                      stroke={getContributorColor(arc.contributor)}
                      strokeWidth={(active ? 1.5 : 0.3) / zoom}
                      strokeOpacity={active ? 0.7 : 0.03}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* City markers */}
                {Object.values(cities).map((city) => {
                  const active = isCityActive(city.code);
                  const isSelected = selectedCity === city.code;
                  // Scale dot by connection count, compensate for zoom
                  const baseR = Math.min(2 + city.linkCount * 0.15, 5) / zoom;
                  const glowR = (active ? Math.min(2 + city.linkCount * 0.15, 5) + 3 : 2) / zoom;
                  const inactiveR = 1.2 / zoom;
                  return (
                    <Marker
                      key={city.code}
                      coordinates={[city.lng, city.lat]}
                      onMouseEnter={(e: React.MouseEvent) => {
                        const rect = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                        if (rect) {
                          setTooltip({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                            city,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => handleCityClick(city.code, city)}
                    >
                      {/* Pulse ring for selected city */}
                      {isSelected && (
                        <circle
                          r={10 / zoom}
                          fill="none"
                          stroke="#F3EED9"
                          strokeWidth={0.5 / zoom}
                          strokeOpacity={0.3}
                        >
                          <animate
                            attributeName="r"
                            from={`${4 / zoom}`}
                            to={`${14 / zoom}`}
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="stroke-opacity"
                            from="0.4"
                            to="0"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                      {/* Glow */}
                      <circle
                        r={glowR}
                        fill="rgba(243,238,217,0.06)"
                      />
                      {/* Dot */}
                      <circle
                        r={active ? baseR : inactiveR}
                        fill={
                          isSelected
                            ? "#F3EED9"
                            : active
                            ? "rgba(243,238,217,0.8)"
                            : "rgba(243,238,217,0.2)"
                        }
                        style={{ cursor: "pointer" }}
                      />
                      {/* Label — show when zoomed, selected, or filtering */}
                      {(isSelected || (active && (selectedContributor || zoom > 2))) && (
                        <text
                          textAnchor="middle"
                          y={-(baseR + 4 / zoom)}
                          style={{
                            fontFamily: "var(--font-outfit)",
                            fontSize: 8 / zoom,
                            fill: isSelected ? "#F3EED9" : "rgba(243,238,217,0.6)",
                            fontWeight: isSelected ? 600 : 400,
                            pointerEvents: "none",
                          }}
                        >
                          {city.name}
                        </text>
                      )}
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-50 pointer-events-none"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y - 10,
                }}
              >
                <div className="rounded-lg bg-dark border border-cream-15 px-3 py-2 shadow-lg min-w-[160px]">
                  <p className="text-sm font-medium text-cream">{tooltip.city.name}</p>
                  <p className="text-xs text-cream-40">{tooltip.city.country}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-cream-60">
                    <span>{tooltip.city.linkCount} links</span>
                    <span>{tooltip.city.contributors.length} contributors</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tooltip.city.contributors.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 text-[10px] text-cream-40"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: getContributorColor(c) }}
                        />
                        {getContributorDisplayName(c)}
                      </span>
                    ))}
                    {tooltip.city.contributors.length > 4 && (
                      <span className="text-[10px] text-cream-20">
                        +{tooltip.city.contributors.length - 4}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] text-cream-20">Click to focus</p>
                </div>
              </div>
            )}

            {/* Zoom controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              <button
                onClick={handleZoomIn}
                className="rounded-md bg-dark/80 border border-cream-8 p-1.5 text-cream-40 hover:text-cream hover:border-cream-15 transition-colors"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="rounded-md bg-dark/80 border border-cream-8 p-1.5 text-cream-40 hover:text-cream hover:border-cream-15 transition-colors"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                onClick={handleReset}
                className="rounded-md bg-dark/80 border border-cream-8 p-1.5 text-cream-40 hover:text-cream hover:border-cream-15 transition-colors"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>

            {/* Active filter clear button */}
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-dark/80 border border-cream-8 px-3 py-1.5 text-xs text-cream-60 hover:text-cream hover:border-cream-15 transition-colors"
              >
                <X className="size-3" />
                Clear filter
              </button>
            )}
          </CardContent>
        </Card>

        {/* Detail panel — shows when contributor or city is selected */}
        {(selectedContributorData || selectedCity) && (
          <div className="absolute top-3 left-3 z-40 max-w-[260px]" style={{ top: hasActiveFilter ? 44 : 12 }}>
            <div className="rounded-xl bg-dark/95 border border-cream-10 p-4 shadow-xl backdrop-blur-sm">
              {selectedContributorData && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: getContributorColor(selectedContributorData.code) }}
                    />
                    <span className="font-display text-sm text-cream">
                      {getContributorDisplayName(selectedContributorData.code)}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-cream-40">
                        <Cable className="size-3" /> Links
                      </span>
                      <span className="text-cream">{selectedContributorData.linkCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-cream-40">
                        <MapPin className="size-3" /> Cities
                      </span>
                      <span className="text-cream">{selectedContributorData.cities.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-cream-40">
                        <Server className="size-3" /> Devices
                      </span>
                      <span className="text-cream">{selectedContributorData.deviceCount}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-cream-8">
                      <div className="flex items-center justify-between">
                        <span className="text-cream-40">Reward share</span>
                        <span className="text-cream font-medium">
                          {formatPercent(selectedContributorData.estimatedShare)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {selectedCity && !selectedContributorData && cities[selectedCity] && (
                <>
                  <p className="font-display text-sm text-cream mb-1">
                    {cities[selectedCity].name}
                  </p>
                  <p className="text-xs text-cream-40 mb-3">{cities[selectedCity].country}</p>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-cream-60">{cities[selectedCity].linkCount} links through this city</p>
                    <p className="text-cream-60">{cities[selectedCity].contributors.length} contributors present</p>
                    <div className="mt-2 pt-2 border-t border-cream-8 space-y-1">
                      <p className="text-cream-40 mb-1">Connected to:</p>
                      {selectedCityLinks.slice(0, 6).map((link) => {
                        const otherCode = link.cityA === selectedCity ? link.cityZ : link.cityA;
                        const otherCity = cities[otherCode];
                        return (
                          <div key={link.key} className="flex items-center gap-1.5">
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: getContributorColor(link.contributor) }}
                            />
                            <span className="text-cream-60">{otherCity?.name || otherCode}</span>
                          </div>
                        );
                      })}
                      {selectedCityLinks.length > 6 && (
                        <p className="text-cream-20">+{selectedCityLinks.length - 6} more</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contributor legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {snapshot.contributors
          .filter((c) => c.linkCount > 0)
          .sort((a, b) => b.linkCount - a.linkCount)
          .map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setSelectedCity(null);
                setSelectedContributor(
                  selectedContributor === c.code ? null : c.code
                );
                if (selectedContributor === c.code) {
                  handleReset();
                }
              }}
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
              <span className="text-cream-20">{c.linkCount}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
