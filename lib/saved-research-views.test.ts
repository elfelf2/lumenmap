import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deleteSavedView,
  exportSavedViewsJson,
  importSavedViewsJson,
  saveCurrentView,
  validateUniqueName,
  type SavedResearchView,
} from "./saved-research-views";

const base: SavedResearchView = {
  id: "a",
  name: "Ops drill",
  search: "?period=1d&metric=ops&view=events&path=payments",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("saved research views", () => {
  it("rejects duplicate names", () => {
    assert.equal(validateUniqueName("Ops drill", [base]), "A saved view with this name already exists.");
    const result = saveCurrentView({
      name: "Ops drill",
      search: "?period=7d&metric=ops&view=events",
      views: [base],
    });
    assert.equal(result.ok, false);
  });

  it("saves unique views and deletes by id", () => {
    const saved = saveCurrentView({
      name: "Weekly",
      search: "period=7d&metric=ops&view=events",
      views: [base],
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(saved.views.length, 2);
    assert.equal(saved.saved.search.startsWith("?"), true);
    assert.equal(deleteSavedView(saved.saved.id, saved.views).length, 1);
  });

  it("exports and imports JSON, rejecting malformed payloads", () => {
    const json = exportSavedViewsJson([base]);
    const ok = importSavedViewsJson(json, []);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.imported, 1);

    const bad = importSavedViewsJson("{not-json", []);
    assert.equal(bad.ok, false);

    const malformed = importSavedViewsJson(
      JSON.stringify({ version: 1, views: [{ id: 1 }] }),
      [],
    );
    assert.equal(malformed.ok, false);
  });
});
