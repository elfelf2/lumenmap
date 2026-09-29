import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  extractTotalBytesBilled,
  getBytesBilledDegradedThreshold,
  getBytesBilledWindowMinutes,
  getRollingBytesBilled,
  recordBytesBilled,
  resetBytesBilledTelemetry,
} from "./bytes-billed-telemetry";

describe("bytes-billed telemetry", () => {
  const previous = {
    window: process.env.BIGQUERY_BYTES_BILLED_WINDOW_MINUTES,
    threshold: process.env.BIGQUERY_BYTES_BILLED_DEGRADED_THRESHOLD,
  };

  beforeEach(() => {
    resetBytesBilledTelemetry();
    delete process.env.BIGQUERY_BYTES_BILLED_WINDOW_MINUTES;
    delete process.env.BIGQUERY_BYTES_BILLED_DEGRADED_THRESHOLD;
  });

  afterEach(() => {
    resetBytesBilledTelemetry();
    if (previous.window === undefined) {
      delete process.env.BIGQUERY_BYTES_BILLED_WINDOW_MINUTES;
    } else {
      process.env.BIGQUERY_BYTES_BILLED_WINDOW_MINUTES = previous.window;
    }
    if (previous.threshold === undefined) {
      delete process.env.BIGQUERY_BYTES_BILLED_DEGRADED_THRESHOLD;
    } else {
      process.env.BIGQUERY_BYTES_BILLED_DEGRADED_THRESHOLD = previous.threshold;
    }
  });

  it("aggregates samples inside the rolling window", () => {
    process.env.BIGQUERY_BYTES_BILLED_WINDOW_MINUTES = "15";
    const now = 1_000_000;
    recordBytesBilled(100, now - 14 * 60_000);
    recordBytesBilled(250, now - 60_000);
    recordBytesBilled(50, now);
    assert.equal(getRollingBytesBilled(now), 400);
  });

  it("drops samples older than the window", () => {
    process.env.BIGQUERY_BYTES_BILLED_WINDOW_MINUTES = "5";
    const now = 2_000_000;
    recordBytesBilled(999, now - 6 * 60_000);
    recordBytesBilled(10, now);
    assert.equal(getRollingBytesBilled(now), 10);
  });

  it("parses mocked BigQuery job statistics", () => {
    assert.equal(
      extractTotalBytesBilled({
        statistics: { query: { totalBytesBilled: "12345" } },
      }),
      12345,
    );
    assert.equal(
      extractTotalBytesBilled({
        statistics: { query: { totalBytesBilled: 99 } },
      }),
      99,
    );
    assert.equal(extractTotalBytesBilled({}), 0);
  });

  it("reads configured threshold and window", () => {
    process.env.BIGQUERY_BYTES_BILLED_WINDOW_MINUTES = "30";
    process.env.BIGQUERY_BYTES_BILLED_DEGRADED_THRESHOLD = "5000";
    assert.equal(getBytesBilledWindowMinutes(), 30);
    assert.equal(getBytesBilledDegradedThreshold(), 5000);
  });
});
