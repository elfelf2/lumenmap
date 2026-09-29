import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  generateSafeFilename,
  flattenTreemapForCsv,
  getStructuredRowsForExport,
  buildDashboardPdfDocument,
  buildTextPdf,
} from "./export-utils";
import type { TreemapNode } from "@/lib/types";

describe("export-utils", () => {
  test("generateSafeFilename sanitizes metric and period", () => {
    const name = generateSafeFilename("lumenmap", "Network Activity", "7d", "csv", "20260101");
    assert.equal(name, "lumenmap-network-activity-7d-20260101.csv");
  });

  test("flattenTreemapForCsv walks hierarchy", () => {
    const root: TreemapNode = {
      name: "root",
      value: 10,
      children: [
        { name: "a", value: 6 },
        { name: "other", value: 4 },
      ],
    };
    const rows = flattenTreemapForCsv(root);
    assert.ok(rows.length >= 2);
    assert.ok(rows.some((r) => r.name === "a"));
  });

  test("getStructuredRowsForExport uses treemap view", () => {
    const data = {
      period: "1d" as const,
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-01T23:59:59.999Z",
      source: "hubble" as const,
      sourceTimestamp: "2026-01-02T00:00:00.000Z",
      isPeriodComplete: true,
      kpis: {} as never,
      treemaps: {
        events: { name: "events", value: 3, children: [{ name: "payment", value: 3 }] },
      } as never,
      metricProvenance: {} as never,
    };
    const { rows, syntheticIdentifiers } = getStructuredRowsForExport(data as never, "events");
    assert.ok(Array.isArray(rows));
    assert.ok(syntheticIdentifiers.includes("other"));
  });

  test("buildTextPdf produces a PDF header", async () => {
    const blob = buildTextPdf(["hello", "world"]);
    const text = await blob.text();
    assert.ok(text.startsWith("%PDF-1.4"));
    assert.ok(text.includes("hello"));
  });

  test("buildDashboardPdfDocument fails while loading and names period in body", async () => {
    assert.throws(
      () =>
        buildDashboardPdfDocument({
          metadata: {
            metric: "Network Activity",
            unit: "operations",
            period: "1d",
            timezone: "UTC",
            freshness: "2026-01-01T00:00:00.000Z",
            filters: { period: "1d", view: "events", source: "fixture" },
            generatedAt: "2026-01-02T00:00:00.000Z",
            view: "events",
          },
          kpiLines: ["ops: 1"],
          chartTitle: "Operation Types",
          loading: true,
        }),
      /still loading/i,
    );

    const blob = buildDashboardPdfDocument({
      metadata: {
        metric: "Network Activity",
        unit: "operations",
        period: "1d",
        timezone: "UTC",
        freshness: "2026-01-01T00:00:00.000Z",
        filters: { period: "1d", view: "events", source: "fixture" },
        generatedAt: "2026-01-02T00:00:00.000Z",
        view: "events",
      },
      kpiLines: ["ops: 12"],
      chartTitle: "Operation Types",
      loading: false,
    });
    const text = await blob.text();
    assert.ok(text.includes("Period: 1d"));
    assert.ok(text.includes("ops: 12"));
    assert.ok(text.includes("Operation Types"));
  });
});
