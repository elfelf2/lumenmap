import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  isMetricSupportedOnNetwork,
  resolveDashboardNetwork,
  resolveHubbleDataset,
  toProvenanceNetwork,
} from "./network";

describe("dashboard network", () => {
  const previous = {
    network: process.env.LUMENMAP_NETWORK,
    dataset: process.env.LUMENMAP_BIGQUERY_DATASET,
    mainnet: process.env.LUMENMAP_MAINNET_BIGQUERY_DATASET,
    testnet: process.env.LUMENMAP_TESTNET_BIGQUERY_DATASET,
  };

  beforeEach(() => {
    delete process.env.LUMENMAP_NETWORK;
    delete process.env.LUMENMAP_BIGQUERY_DATASET;
    delete process.env.LUMENMAP_MAINNET_BIGQUERY_DATASET;
    delete process.env.LUMENMAP_TESTNET_BIGQUERY_DATASET;
  });

  afterEach(() => {
    const restore = (
      key: keyof typeof previous,
      envKey: string,
    ) => {
      if (previous[key] === undefined) delete process.env[envKey];
      else process.env[envKey] = previous[key];
    };
    restore("network", "LUMENMAP_NETWORK");
    restore("dataset", "LUMENMAP_BIGQUERY_DATASET");
    restore("mainnet", "LUMENMAP_MAINNET_BIGQUERY_DATASET");
    restore("testnet", "LUMENMAP_TESTNET_BIGQUERY_DATASET");
  });

  it("defaults to mainnet", () => {
    assert.equal(resolveDashboardNetwork(), "mainnet");
    assert.equal(toProvenanceNetwork("mainnet"), "stellar_mainnet");
  });

  it("accepts explicit and env testnet selection", () => {
    assert.equal(resolveDashboardNetwork("testnet"), "testnet");
    process.env.LUMENMAP_NETWORK = "testnet";
    assert.equal(resolveDashboardNetwork(), "testnet");
    assert.equal(toProvenanceNetwork("testnet"), "stellar_testnet");
  });

  it("resolves dataset overrides without leaking defaults for bare testnet", () => {
    assert.equal(
      resolveHubbleDataset("mainnet"),
      "crypto-stellar.crypto_stellar_dbt",
    );
    assert.equal(resolveHubbleDataset("testnet"), "");
    process.env.LUMENMAP_TESTNET_BIGQUERY_DATASET = "my-proj.testnet_dbt";
    assert.equal(resolveHubbleDataset("testnet"), "my-proj.testnet_dbt");
  });

  it("blocks unsupported metrics on testnet", () => {
    assert.equal(isMetricSupportedOnNetwork("ops", "testnet"), true);
    assert.equal(isMetricSupportedOnNetwork("usdc", "testnet"), false);
    assert.equal(isMetricSupportedOnNetwork("usdc", "mainnet"), true);
  });
});
