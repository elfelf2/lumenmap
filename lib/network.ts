export type DashboardNetworkId = "mainnet" | "testnet";

export type ProvenanceNetworkId = "stellar_mainnet" | "stellar_testnet";

const DEFAULT_MAINNET_DATASET = "crypto-stellar.crypto_stellar_dbt";

/** Metrics that require mainnet Hubble coverage today. */
export const TESTNET_UNSUPPORTED_METRICS = [
  "usdc",
  "protocol_tvl",
  "xlm_volume",
] as const;

export type TestnetUnsupportedMetric =
  (typeof TESTNET_UNSUPPORTED_METRICS)[number];

export function isDashboardNetworkId(
  value: string | null | undefined,
): value is DashboardNetworkId {
  return value === "mainnet" || value === "testnet";
}

/**
 * Resolve active network.
 * Precedence: explicit arg → `LUMENMAP_NETWORK` env → mainnet default.
 * Fixture mode can simulate testnet via `LUMENMAP_NETWORK=testnet`.
 */
export function resolveDashboardNetwork(
  explicit?: string | null,
): DashboardNetworkId {
  if (isDashboardNetworkId(explicit)) return explicit;
  const fromEnv = process.env.LUMENMAP_NETWORK?.trim().toLowerCase();
  if (isDashboardNetworkId(fromEnv)) return fromEnv;
  return "mainnet";
}

export function toProvenanceNetwork(
  network: DashboardNetworkId,
): ProvenanceNetworkId {
  return network === "testnet" ? "stellar_testnet" : "stellar_mainnet";
}

export function networkLabel(network: DashboardNetworkId): string {
  return network === "testnet" ? "Testnet" : "Mainnet";
}

/**
 * BigQuery dataset id (`project.dataset`) for Hubble queries.
 * Env overrides:
 * - `LUMENMAP_BIGQUERY_DATASET` — force any network
 * - `LUMENMAP_MAINNET_BIGQUERY_DATASET` / `LUMENMAP_TESTNET_BIGQUERY_DATASET`
 */
export function resolveHubbleDataset(
  network: DashboardNetworkId = resolveDashboardNetwork(),
): string {
  const forced = process.env.LUMENMAP_BIGQUERY_DATASET?.trim();
  if (forced) return forced;

  if (network === "testnet") {
    const testnet = process.env.LUMENMAP_TESTNET_BIGQUERY_DATASET?.trim();
    if (testnet) return testnet;
    return "";
  }

  const mainnet = process.env.LUMENMAP_MAINNET_BIGQUERY_DATASET?.trim();
  return mainnet || DEFAULT_MAINNET_DATASET;
}

export function isTestnetDatasetConfigured(
  network: DashboardNetworkId = resolveDashboardNetwork(),
): boolean {
  if (network !== "testnet") return true;
  return Boolean(resolveHubbleDataset(network));
}

export function isMetricSupportedOnNetwork(
  metric: string,
  network: DashboardNetworkId,
): boolean {
  if (network !== "testnet") return true;
  return !(TESTNET_UNSUPPORTED_METRICS as readonly string[]).includes(metric);
}

export function unsupportedMetricMessage(metric: string): string {
  return `${metric} is not available on Stellar testnet yet. Switch to mainnet or pick a supported metric.`;
}
