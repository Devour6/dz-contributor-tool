import type { ShapleyInput } from "@/lib/types/shapley";
import type { RawSnapshot } from "@/lib/types/snapshot";
import type { ParsedSnapshot } from "@/lib/types/contributor";
import {
  buildCityNameToMetro,
  buildLocationCodeToMetro,
} from "./shapley-input-builder";

interface AddLinkSpec {
  cityA: string; // locationCode
  cityZ: string; // locationCode
}

/**
 * Creates a modified copy of a ShapleyInput for what-if simulation.
 * Removes specified links and adds new ones for the given contributor.
 */
export function modifyShapleyInput(
  baselineInput: ShapleyInput,
  parsed: ParsedSnapshot,
  raw: RawSnapshot,
  contributorCode: string,
  removeLinkPubkeys: string[],
  addLinks: AddLinkSpec[]
): ShapleyInput {
  // Deep clone baseline
  const input: ShapleyInput = {
    devices: baselineInput.devices.map((d) => ({ ...d })),
    private_links: baselineInput.private_links.map((l) => ({ ...l })),
    public_links: baselineInput.public_links.map((l) => ({ ...l })),
    demands: baselineInput.demands.map((d) => ({ ...d })),
    operator_uptime: baselineInput.operator_uptime,
    contiguity_bonus: baselineInput.contiguity_bonus,
    demand_multiplier: baselineInput.demand_multiplier,
  };

  // Build location→metro mapping
  const cityNameToMetro = buildCityNameToMetro(raw);
  const locToMetro = buildLocationCodeToMetro(raw, cityNameToMetro);

  const contributor = parsed.contributors.find(
    (c) => c.code === contributorCode
  );

  // --- Remove links (only if contributor exists) ---
  if (contributor) {
    for (const pubkey of removeLinkPubkeys) {
      const link = contributor.links.find((l) => l.pubkey === pubkey);
      if (!link) continue;

      const metro1 = locToMetro.get(link.sideA.locationCode);
      const metro2 = locToMetro.get(link.sideZ.locationCode);
      if (!metro1 || !metro2) continue;

      // Remove first matching private_link for this metro pair owned by this contributor
      // (both endpoints must have a device belonging to this contributor)
      const contributorMetros = new Set(
        input.devices
          .filter((d) => d.operator === contributorCode)
          .map((d) => d.device)
      );
      const idx = input.private_links.findIndex(
        (pl) =>
          ((pl.device1 === metro1 && pl.device2 === metro2) ||
           (pl.device1 === metro2 && pl.device2 === metro1)) &&
          contributorMetros.has(pl.device1) &&
          contributorMetros.has(pl.device2)
      );
      if (idx !== -1) input.private_links.splice(idx, 1);
    }
  }

  // --- Add links ---
  for (const addLink of addLinks) {
    const metro1 = locToMetro.get(addLink.cityA);
    const metro2 = locToMetro.get(addLink.cityZ);
    if (!metro1 || !metro2 || metro1 === metro2) continue;

    // Add devices if contributor doesn't already have one at these metros
    if (
      !input.devices.some(
        (d) => d.device === metro1 && d.operator === contributorCode
      )
    ) {
      input.devices.push({
        device: metro1,
        edge: 0,
        operator: contributorCode,
      });
    }
    if (
      !input.devices.some(
        (d) => d.device === metro2 && d.operator === contributorCode
      )
    ) {
      input.devices.push({
        device: metro2,
        edge: 0,
        operator: contributorCode,
      });
    }

    input.private_links.push({
      device1: metro1,
      device2: metro2,
      latency: 10,
      bandwidth: 10,
      uptime: 0.99,
      shared: null,
    });
  }

  // --- Remove orphaned devices ---
  // Find all metros where this contributor still has links
  const activeMetros = new Set<string>();
  for (const pl of input.private_links) {
    if (
      input.devices.some(
        (d) => d.device === pl.device1 && d.operator === contributorCode
      )
    ) {
      activeMetros.add(pl.device1);
    }
    if (
      input.devices.some(
        (d) => d.device === pl.device2 && d.operator === contributorCode
      )
    ) {
      activeMetros.add(pl.device2);
    }
  }

  input.devices = input.devices.filter(
    (d) => d.operator !== contributorCode || activeMetros.has(d.device)
  );

  return input;
}
