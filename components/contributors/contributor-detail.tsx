"use client";

import type { Contributor } from "@/lib/types/contributor";
import { Badge } from "@/components/ui/badge";
import { formatLatencyMs, formatBandwidth, shortenPubkey } from "@/lib/utils/format";
import { Cable, Server, MapPin } from "lucide-react";

interface ContributorDetailProps {
  contributor: Contributor;
}

export function ContributorDetail({ contributor }: ContributorDetailProps) {
  return (
    <div className="bg-cream-5 border-t border-cream-8 p-6 space-y-6">
      {/* Links */}
      <div>
        <h4 className="flex items-center gap-2 text-sm font-medium text-cream-60 mb-3">
          <Cable className="size-4" />
          Links ({contributor.linkCount})
        </h4>
        <div className="grid gap-2">
          {contributor.links.map((link) => (
            <div
              key={link.pubkey}
              className="flex items-center gap-4 rounded-lg bg-cream-5 border border-cream-8 px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2 min-w-[180px]">
                <MapPin className="size-3 text-cream-30" />
                <span className="text-cream-80">
                  {link.sideA.city || link.sideA.locationCode}
                </span>
              </div>
              <span className="text-cream-20">→</span>
              <div className="flex items-center gap-2 min-w-[180px]">
                <MapPin className="size-3 text-cream-30" />
                <span className="text-cream-80">
                  {link.sideZ.city || link.sideZ.locationCode}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {link.linkType}
              </Badge>
              <span className="text-cream-40 text-xs">
                {formatLatencyMs(link.delayMs * 1_000_000)}
              </span>
              <span className="text-cream-40 text-xs">
                {formatBandwidth(link.bandwidthGbps)}
              </span>
              <Badge
                variant="secondary"
                className={
                  link.health === "Healthy"
                    ? "bg-green/10 text-green border-green/20"
                    : "bg-red/10 text-red border-red/20"
                }
              >
                {link.health}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Devices */}
      <div>
        <h4 className="flex items-center gap-2 text-sm font-medium text-cream-60 mb-3">
          <Server className="size-4" />
          Devices ({contributor.deviceCount})
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {contributor.devices.map((device) => (
            <div
              key={device.pubkey}
              className="flex items-center justify-between rounded-lg bg-cream-5 border border-cream-8 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-cream-60">
                  {device.locationName || device.locationCode}
                </span>
                <span className="text-cream-20 text-xs">
                  {device.deviceType}
                </span>
              </div>
              <span className="text-cream-30 text-xs">
                {shortenPubkey(device.pubkey)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
