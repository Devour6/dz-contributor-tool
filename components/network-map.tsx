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
import { ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";

const GEO_URL = "/world-110m.json";

const DEFAULT_CENTER: [number, number] = [0, 30];
const DEFAULT_ZOOM = 1;
const PROJECTION_SCALE = 130;

interface NetworkMapProps {
  snapshot: ParsedSnapshot;
}

interface CityInfo {
  key: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  linkCount: number;
  contributors: string[];
  locationCodes: string[];
}

interface TooltipData {
  x: number;
  y: number;
  city: CityInfo;
}

// Derive a stable city key from a link endpoint — aggregate by city name
function cityKey(side: { city?: string; locationCode: string }): string {
  return side.city || side.locationCode;
}

export function NetworkMap({ snapshot }: NetworkMapProps) {
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);

  // Build unique cities — aggregate all data centers in the same city into one marker
  const cities = useMemo(() => {
    const coords: Record<string, CityInfo> = {};
    for (const contributor of snapshot.contributors) {
      for (const link of contributor.links) {
        for (const side of [link.sideA, link.sideZ]) {
          if (side.lat && side.lng) {
            const key = cityKey(side);
            if (!coords[key]) {
              coords[key] = {
                key,
                name: side.city || side.locationCode,
                country: side.country,
                lat: side.lat,
                lng: side.lng,
                linkCount: 0,
                contributors: [],
                locationCodes: [],
              };
            }
            coords[key].linkCount++;
            if (!coords[key].contributors.includes(contributor.code)) {
              coords[key].contributors.push(contributor.code);
            }
            if (!coords[key].locationCodes.includes(side.locationCode)) {
              coords[key].locationCodes.push(side.locationCode);
            }
          }
        }
      }
    }
    return coords;
  }, [snapshot]);

  // Build link arcs — deduplicate arcs between the same two cities by the same contributor
  const arcs = useMemo(() => {
    const seen = new Set<string>();
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
        const keyA = cityKey(link.sideA);
        const keyZ = cityKey(link.sideZ);
        const a = cities[keyA];
        const z = cities[keyZ];
        if (a && z && keyA !== keyZ) {
          // Deduplicate: same contributor, same city pair = one visual arc
          const dedupKey = `${contributor.code}:${[keyA, keyZ].sort().join("-")}`;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            lines.push({
              key: link.pubkey,
              from: [a.lng, a.lat],
              to: [z.lng, z.lat],
              contributor: contributor.code,
              cityA: keyA,
              cityZ: keyZ,
            });
          }
        }
      }
    }
    return lines;
  }, [snapshot, cities]);

  // Filter logic
  const isArcActive = useCallback(
    (arc: (typeof arcs)[0]) => {
      const matchesContributor = !selectedContributor || arc.contributor === selectedContributor;
      const matchesCity = !selectedCity || arc.cityA === selectedCity || arc.cityZ === selectedCity;
      return matchesContributor && matchesCity;
    },
    [selectedContributor, selectedCity]
  );

  const isCityActive = useCallback(
    (key: string) => {
      if (selectedContributor) {
        return arcs.some(
          (a) =>
            a.contributor === selectedContributor &&
            (a.cityA === key || a.cityZ === key)
        );
      }
      if (selectedCity) {
        if (key === selectedCity) return true;
        return arcs.some(
          (a) =>
            (a.cityA === selectedCity && a.cityZ === key) ||
            (a.cityZ === selectedCity && a.cityA === key)
        );
      }
      return true;
    },
    [selectedContributor, selectedCity, arcs]
  );

  // Label collision detection — only show labels that won't overlap
  const visibleLabels = useMemo(() => {
    const cityList = Object.values(cities);
    // Sort by importance: more contributors/links = higher priority
    const sorted = [...cityList].sort(
      (a, b) => b.contributors.length * 10 + b.linkCount - (a.contributors.length * 10 + a.linkCount)
    );
    // Minimum distance in degrees before labels overlap (shrinks with zoom)
    const minDist = 12 / zoom;
    const placed: { lng: number; lat: number }[] = [];
    const labels = new Set<string>();

    for (const city of sorted) {
      const tooClose = placed.some((p) => {
        const dLng = Math.abs(city.lng - p.lng);
        const dLat = Math.abs(city.lat - p.lat);
        return dLng < minDist && dLat < minDist * 0.6;
      });
      if (!tooClose) {
        labels.add(city.key);
        placed.push({ lng: city.lng, lat: city.lat });
      }
    }
    return labels;
  }, [cities, zoom]);

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
    setZoom(DEFAULT_ZOOM);
    setCenter(DEFAULT_CENTER);
  };

  const handleCityClick = (key: string, city: CityInfo) => {
    if (selectedCity === key) {
      setSelectedCity(null);
    } else {
      setSelectedCity(key);
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
                scale: PROJECTION_SCALE,
              }}
              width={800}
              height={320}
              style={{ width: "100%", height: "auto" }}
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
                      strokeWidth={(active ? 1.2 : 0.5) / zoom}
                      strokeOpacity={active ? 0.7 : 0.15}
                      strokeLinecap="round"
                      strokeDasharray={active ? `${4 / zoom} ${2 / zoom}` : undefined}
                      className={active ? "link-flow" : undefined}
                      style={active ? { animationDuration: `${1.5 + Math.random() * 1.5}s` } : undefined}
                    />
                  );
                })}

                {/* City markers */}
                {Object.values(cities).map((city) => {
                  const active = isCityActive(city.key);
                  const isSelected = selectedCity === city.key;
                  const baseR = Math.min(2 + city.linkCount * 0.15, 5) / zoom;
                  const glowR = (active ? Math.min(2 + city.linkCount * 0.15, 5) + 3 : 2) / zoom;
                  const inactiveR = 1.2 / zoom;
                  return (
                    <Marker
                      key={city.key}
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
                      onClick={() => handleCityClick(city.key, city)}
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
                        className={active && !isSelected ? "dot-pulse" : undefined}
                        style={active && !isSelected ? { animationDelay: `${Math.random() * 3}s` } : undefined}
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
                      {/* Label — collision-detected placement */}
                      {(isSelected || (active && (selectedContributor || visibleLabels.has(city.key)))) && (
                        <text
                          textAnchor="middle"
                          y={-(baseR + 4 / zoom)}
                          style={{
                            fontFamily: "var(--font-outfit)",
                            fontSize: 7 / zoom,
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
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1">
              <button
                aria-label="Zoom in"
                onClick={handleZoomIn}
                className="rounded-md bg-dark/80 border border-cream-8 p-2 sm:p-1.5 text-cream-40 hover:text-cream hover:border-cream-15 focus-visible:ring-2 focus-visible:ring-cream-20 transition-colors"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                aria-label="Zoom out"
                onClick={handleZoomOut}
                className="rounded-md bg-dark/80 border border-cream-8 p-2 sm:p-1.5 text-cream-40 hover:text-cream hover:border-cream-15 focus-visible:ring-2 focus-visible:ring-cream-20 transition-colors"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                aria-label="Reset map view"
                onClick={handleReset}
                className="rounded-md bg-dark/80 border border-cream-8 p-2 sm:p-1.5 text-cream-40 hover:text-cream hover:border-cream-15 focus-visible:ring-2 focus-visible:ring-cream-20 transition-colors"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>

            {/* Active filter clear button */}
            {hasActiveFilter && (
              <button
                aria-label="Clear map filter"
                onClick={clearFilters}
                className="absolute top-3 left-3 z-50 flex items-center gap-1.5 rounded-full bg-dark/80 border border-cream-8 px-3 py-1.5 text-xs text-cream-60 hover:text-cream hover:border-cream-15 focus-visible:ring-2 focus-visible:ring-cream-20 transition-colors"
              >
                <X className="size-3" />
                Clear filter
              </button>
            )}
          </CardContent>
        </Card>

        {/* Detail panel — shows when contributor or city is selected */}
        {(selectedContributorData || selectedCity) && (
          <div className="absolute left-2 sm:left-3 z-40 max-w-[200px] sm:max-w-[260px]" style={{ top: hasActiveFilter ? 48 : 12 }}>
            <div className="rounded-xl bg-dark border border-cream-10 p-3 sm:p-4 shadow-xl max-h-[280px] sm:max-h-[320px] overflow-y-auto">
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
                      <span className="text-cream-40">Links</span>
                      <span className="text-cream">{selectedContributorData.linkCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream-40">Cities</span>
                      <span className="text-cream">{selectedContributorData.cities.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream-40">Devices</span>
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
                        const otherKey = link.cityA === selectedCity ? link.cityZ : link.cityA;
                        const otherCity = cities[otherKey];
                        return (
                          <div key={link.key} className="flex items-center gap-1.5">
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: getContributorColor(link.contributor) }}
                            />
                            <span className="text-cream-60">{otherCity?.name || otherKey}</span>
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
      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
        {snapshot.contributors
          .filter((c) => c.linkCount > 0)
          .sort((a, b) => b.linkCount - a.linkCount)
          .map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setSelectedCity(null);
                if (selectedContributor === c.code) {
                  setSelectedContributor(null);
                  handleReset();
                } else {
                  setSelectedContributor(c.code);
                  const contributorCities = Object.values(cities).filter(
                    (city) => city.contributors.includes(c.code)
                  );
                  if (contributorCities.length > 0) {
                    // Bounding box of all contributor cities
                    const lngs = contributorCities.map((ct) => ct.lng);
                    const lats = contributorCities.map((ct) => ct.lat);
                    const minLng = Math.min(...lngs);
                    const maxLng = Math.max(...lngs);
                    const minLat = Math.min(...lats);
                    const maxLat = Math.max(...lats);

                    // Center on midpoint
                    setCenter([(minLng + maxLng) / 2, (minLat + maxLat) / 2]);

                    // Zoom to fit — if span is large, zoom stays low (world view)
                    const dLng = maxLng - minLng;
                    const dLat = maxLat - minLat;
                    const DEG_TO_RAD = Math.PI / 180;
                    const PAD = 1.5;
                    const zLng = dLng > 5 ? 800 / (PROJECTION_SCALE * dLng * DEG_TO_RAD * PAD) : 4;
                    const zLat = dLat > 5 ? 320 / (PROJECTION_SCALE * dLat * DEG_TO_RAD * PAD) : 4;
                    setZoom(Math.max(1, Math.min(Math.min(zLng, zLat), 6)));
                  }
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
