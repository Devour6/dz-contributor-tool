// Raw S3 snapshot structure — all serviceability collections are dicts keyed by pubkey

export interface RawSnapshot {
  dz_epoch: number;
  solana_epoch: number;
  fetch_data: {
    dz_serviceability: {
      contributors: Record<string, RawContributor>;
      devices: Record<string, RawDevice>;
      links: Record<string, RawLink>;
      locations: Record<string, RawLocation>;
      exchanges: Record<string, RawExchange>;
      users: Record<string, RawUser>;
    };
    dz_telemetry: {
      device_latency_samples: unknown;
    };
    dz_internet: {
      internet_latency_samples: unknown;
    };
  };
  leader_schedule: {
    solana_epoch: number;
    schedule_map: Record<string, number>; // validator_pubkey → slot_count
  };
  metadata: {
    created_at: string;
    network: string;
    exchanges_count: number;
    locations_count: number;
    devices_count: number;
    internet_samples_count: number;
    device_samples_count: number;
  };
}

export interface RawContributor {
  account_type: string;
  status: string;
  code: string;
  reference_count: number;
  ops_manager_pk: string;
}

export interface RawDevice {
  account_type: string;
  location_pk: string;
  exchange_pk: string;
  device_type: string;
  contributor_pk: string;
  device_health: string;
  max_users: number;
  status: string;
  code: string;
  users_count: number;
}

export interface RawLink {
  account_type: string;
  side_a_pk: string;
  side_z_pk: string;
  link_type: string;
  bandwidth: number;
  delay_ns: number;
  jitter_ns: number;
  contributor_pk: string;
  link_health: string;
  status: string;
  code: string;
}

export interface RawLocation {
  account_type: string;
  lat: number;
  lng: number;
  code: string;
  name: string;
  country: string;
  status: string;
  reference_count: number;
}

export interface RawExchange {
  account_type: string;
  lat: number;
  lng: number;
  code: string;
  name: string;
  status: string;
  reference_count: number;
  device1_pk: string;
  device2_pk: string;
}

export interface RawUser {
  account_type: string;
  device_pk: string;
  validator_pubkey: string;
  status: string;
  user_type: string;
}
