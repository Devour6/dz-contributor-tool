export interface EpochFee {
  solanaEpoch: number;
  totalFeeLamports: number;
  totalFeeSol: number;
  validatorCount: number;
}

export interface FeeHistory {
  epochs: EpochFee[];
  averageFeeSol: number;
  totalFeeSol: number;
  latestEpoch: number;
  earliestEpoch: number;
}

export interface ConsolidatedFeeRow {
  solanaEpoch: number;
  totalFeeLamports: number;
  totalPaymentLamports: number;
  status: string;
}
