import type { RawSnapshot } from "@/lib/types/snapshot";
import type { ParsedSnapshot, CityDemand } from "@/lib/types/contributor";
import type {
  ShapleyInput,
  ShapleyDevice,
  ShapleyPrivateLink,
  ShapleyPublicLink,
  ShapleyDemand,
} from "@/lib/types/shapley";
import { SHAPLEY_PARAMS } from "@/lib/constants/config";

// --- Metro code mapping ---
// Location codes (e.g., "DRT-ORD13") and exchange codes (e.g., "chi") use
// different naming. We build a mapping from location city name to exchange
// metro code (uppercased) so everything uses the same namespace.

function buildCityNameToMetro(
  raw: RawSnapshot
): Map<string, string> {
  const svc = raw.fetch_data.dz_serviceability;
  const map = new Map<string, string>();

  // Exchange name → exchange code (uppercased)
  // e.g., "Frankfurt" → "FRA", "Chicago" → "CHI"
  for (const ex of Object.values(svc.exchanges)) {
    map.set(ex.name.toLowerCase(), ex.code.toUpperCase());
  }

  return map;
}

function buildLocationCodeToMetro(
  raw: RawSnapshot,
  cityNameToMetro: Map<string, string>
): Map<string, string> {
  const svc = raw.fetch_data.dz_serviceability;
  const map = new Map<string, string>();

  for (const loc of Object.values(svc.locations)) {
    const metro = cityNameToMetro.get(loc.name.toLowerCase());
    if (metro) {
      map.set(loc.code, metro);
    }
  }

  return map;
}

// --- Aggregate city demands by metro ---

interface MetroAggregate {
  metro: string;
  validatorCount: number;
  totalSlots: number;
  userCount: number;
}

function aggregateByMetro(
  cityDemands: CityDemand[],
  usersPerLocation: Map<string, Set<string>>,
  locToMetro: Map<string, string>
): MetroAggregate[] {
  const map = new Map<string, MetroAggregate>();
  for (const cd of cityDemands) {
    const metro = locToMetro.get(cd.locationCode);
    if (!metro) continue;
    const existing = map.get(metro) || {
      metro,
      validatorCount: 0,
      totalSlots: 0,
      userCount: 0,
    };
    existing.validatorCount += cd.validatorCount;
    existing.totalSlots += cd.totalSlots;
    existing.userCount += usersPerLocation.get(cd.locationCode)?.size || 0;
    map.set(metro, existing);
  }
  return Array.from(map.values());
}

// --- Build ShapleyInput sections ---

function buildDevices(
  parsed: ParsedSnapshot,
  usersPerLocation: Map<string, Set<string>>,
  locToMetro: Map<string, string>
): ShapleyDevice[] {
  const seen = new Set<string>();
  const devices: ShapleyDevice[] = [];

  for (const contrib of parsed.contributors) {
    for (const device of contrib.devices) {
      const metro = locToMetro.get(device.locationCode);
      if (!metro) continue;

      const key = `${metro}:${contrib.code}`;
      if (seen.has(key)) continue;
      seen.add(key);

      devices.push({
        device: metro,
        edge: usersPerLocation.has(device.locationCode) ? 1 : 0,
        operator: contrib.code,
      });
    }
  }
  return devices;
}

function buildPrivateLinks(
  parsed: ParsedSnapshot,
  locToMetro: Map<string, string>
): ShapleyPrivateLink[] {
  const links: ShapleyPrivateLink[] = [];
  for (const contrib of parsed.contributors) {
    for (const link of contrib.links) {
      const metro1 = locToMetro.get(link.sideA.locationCode);
      const metro2 = locToMetro.get(link.sideZ.locationCode);
      if (!metro1 || !metro2) continue;
      links.push({
        device1: metro1,
        device2: metro2,
        latency: link.delayMs,
        bandwidth: link.bandwidthGbps,
        uptime: link.health === "Healthy" ? 0.99 : 0.9,
        shared: null,
      });
    }
  }
  return links;
}

function buildPublicLinks(raw: RawSnapshot): ShapleyPublicLink[] {
  const svc = raw.fetch_data.dz_serviceability;
  const samples = raw.fetch_data.dz_internet.internet_latency_samples;
  if (!samples) return [];

  // Exchange pubkey → metro code (uppercased exchange code)
  const exchangeToMetro = new Map<string, string>();
  for (const [pk, ex] of Object.entries(svc.exchanges)) {
    exchangeToMetro.set(pk, ex.code.toUpperCase());
  }

  // Aggregate latency samples by metro pair
  const linkMap = new Map<string, number[]>();
  for (const sample of samples) {
    const metro1 = exchangeToMetro.get(sample.origin_exchange_pk);
    const metro2 = exchangeToMetro.get(sample.target_exchange_pk);
    if (!metro1 || !metro2 || metro1 === metro2) continue;

    const key = [metro1, metro2].sort().join("-");
    const latencies = linkMap.get(key) || [];

    if (sample.samples && sample.samples.length > 0) {
      const sorted = [...sample.samples].sort((a, b) => a - b);
      const medianUs = sorted[Math.floor(sorted.length / 2)];
      latencies.push(medianUs / 1000); // microseconds → milliseconds
    }
    linkMap.set(key, latencies);
  }

  const publicLinks: ShapleyPublicLink[] = [];
  for (const [key, latencies] of linkMap) {
    if (latencies.length === 0) continue;
    const [city1, city2] = key.split("-");
    publicLinks.push({ city1, city2, latency: Math.min(...latencies) });
  }

  return publicLinks;
}

function buildDemands(
  cityDemands: CityDemand[],
  totalSlots: number,
  usersPerLocation: Map<string, Set<string>>,
  locToMetro: Map<string, string>
): ShapleyDemand[] {
  const demands: ShapleyDemand[] = [];

  const metroStakes = aggregateByMetro(cityDemands, usersPerLocation, locToMetro);
  const sorted = [...metroStakes]
    .filter((m) => m.totalSlots > 0)
    .sort((a, b) => b.totalSlots - a.totalSlots);

  if (sorted.length === 0) return demands;

  const leader = sorted[0];
  const topMetros = sorted.slice(0, 10);

  // 1. Block propagation (multicast): leader broadcasts to all other top metros
  for (const metro of topMetros) {
    if (metro.metro === leader.metro) continue;
    demands.push({
      start: leader.metro,
      end: metro.metro,
      receivers: metro.validatorCount,
      traffic: 0.1,
      priority: totalSlots > 0 ? metro.totalSlots / totalSlots : 0,
      type: 1,
      multicast: true,
    });
  }

  // 2. RPC/user traffic (unicast): each non-leader metro sends to leader
  let typeId = 2;
  for (const metro of topMetros) {
    if (metro.metro === leader.metro) continue;
    const traffic = Math.min(10, Math.max(1, metro.userCount / 10));
    demands.push({
      start: metro.metro,
      end: leader.metro,
      receivers: 1,
      traffic,
      priority: 1.0,
      type: typeId++,
      multicast: false,
    });
  }

  return demands;
}

// --- Main builder ---

export function buildShapleyInput(
  raw: RawSnapshot,
  parsed: ParsedSnapshot
): ShapleyInput {
  const svc = raw.fetch_data.dz_serviceability;

  // Build metro code mappings
  const cityNameToMetro = buildCityNameToMetro(raw);
  const locToMetro = buildLocationCodeToMetro(raw, cityNameToMetro);

  // Build users-per-location map
  const usersPerLocation = new Map<string, Set<string>>();
  for (const user of Object.values(svc.users)) {
    if (
      !user.validator_pubkey ||
      user.validator_pubkey === "11111111111111111111111111111111"
    )
      continue;

    const device = svc.devices[user.device_pk];
    if (!device) continue;

    const loc = Object.entries(svc.locations).find(
      ([pk]) => pk === device.location_pk
    );
    if (!loc) continue;

    const locCode = loc[1].code;
    const locUsers = usersPerLocation.get(locCode) || new Set();
    locUsers.add(user.validator_pubkey);
    usersPerLocation.set(locCode, locUsers);
  }

  return {
    devices: buildDevices(parsed, usersPerLocation, locToMetro),
    private_links: buildPrivateLinks(parsed, locToMetro),
    public_links: buildPublicLinks(raw),
    demands: buildDemands(
      parsed.cityDemands,
      parsed.totalSlots,
      usersPerLocation,
      locToMetro
    ),
    operator_uptime: SHAPLEY_PARAMS.operatorUptime,
    contiguity_bonus: SHAPLEY_PARAMS.contiguityBonus,
    demand_multiplier: SHAPLEY_PARAMS.demandMultiplier,
  };
}
