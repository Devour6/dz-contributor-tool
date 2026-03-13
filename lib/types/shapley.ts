// Types matching the DZ network-shapley-rs algorithm input/output format

export interface ShapleyDevice {
  device: string;     // location code (node identifier)
  edge: number;       // 1 if validators present, 0 otherwise
  operator: string;   // contributor code
}

export interface ShapleyPrivateLink {
  device1: string;    // location code of endpoint A
  device2: string;    // location code of endpoint Z
  latency: number;    // milliseconds
  bandwidth: number;  // Gbps
  uptime: number;     // 0-1
  shared: number | null;
}

export interface ShapleyPublicLink {
  city1: string;      // metro code (3-letter)
  city2: string;      // metro code (3-letter)
  latency: number;    // milliseconds
}

export interface ShapleyDemand {
  start: string;      // metro code
  end: string;        // metro code
  receivers: number;
  traffic: number;
  priority: number;
  type: number;
  multicast: boolean;
}

export interface ShapleyInput {
  devices: ShapleyDevice[];
  private_links: ShapleyPrivateLink[];
  public_links: ShapleyPublicLink[];
  demands: ShapleyDemand[];
  operator_uptime: number;
  contiguity_bonus: number;
  demand_multiplier: number;
}

export interface ShapleyOperatorValue {
  value: number;
  share: number; // 0-1 normalized
}

export type ShapleyOutput = Record<string, ShapleyOperatorValue>;

export interface ShapleyResponse {
  epoch: number;
  method: string;
  operatorCount: number;
  values: ShapleyOutput;
  inputSummary: {
    deviceCount: number;
    privateLinkCount: number;
    publicLinkCount: number;
    demandCount: number;
  };
}
