import type { DashboardUrlState } from "@/lib/dashboard-url-state";
import {
  parseDashboardUrlSearch,
  writeDashboardUrlSearch,
} from "@/lib/dashboard-url-state";
import type { TreemapNode } from "@/lib/types";

export const SAVED_VIEWS_STORAGE_KEY = "lumenmap:saved-research-views:v1";

export type SavedResearchView = {
  id: string;
  name: string;
  notes?: string;
  /** Snapshot of dashboard URL search (period, metric, view, path, …). */
  search: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedViewsFile = {
  version: 1;
  views: SavedResearchView[];
};

function nowIso(): string {
  return new Date().toISOString();
}

export function createSavedViewId(): string {
  return `view_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeViewName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function readSavedViewsFromStorage(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): SavedResearchView[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SAVED_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedViewsFile;
    if (parsed?.version !== 1 || !Array.isArray(parsed.views)) return [];
    return parsed.views.filter(
      (view) =>
        view &&
        typeof view.id === "string" &&
        typeof view.name === "string" &&
        typeof view.search === "string",
    );
  } catch {
    return [];
  }
}

export function writeSavedViewsToStorage(
  views: SavedResearchView[],
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  const payload: SavedViewsFile = { version: 1, views };
  storage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(payload));
}

export function validateUniqueName(
  name: string,
  views: SavedResearchView[],
  exceptId?: string,
): string | null {
  const normalized = normalizeViewName(name);
  if (!normalized) return "Name is required.";
  if (normalized.length > 80) return "Name must be 80 characters or fewer.";
  const clash = views.some(
    (view) =>
      view.id !== exceptId &&
      normalizeViewName(view.name).toLowerCase() === normalized.toLowerCase(),
  );
  if (clash) return "A saved view with this name already exists.";
  return null;
}

export function saveCurrentView(input: {
  name: string;
  notes?: string;
  search: string;
  views: SavedResearchView[];
}): { ok: true; views: SavedResearchView[]; saved: SavedResearchView } | { ok: false; error: string } {
  const error = validateUniqueName(input.name, input.views);
  if (error) return { ok: false, error };
  const stamp = nowIso();
  const saved: SavedResearchView = {
    id: createSavedViewId(),
    name: normalizeViewName(input.name),
    notes: input.notes?.trim() || undefined,
    search: input.search.startsWith("?") ? input.search : `?${input.search}`,
    createdAt: stamp,
    updatedAt: stamp,
  };
  return { ok: true, views: [...input.views, saved], saved };
}

export function deleteSavedView(
  id: string,
  views: SavedResearchView[],
): SavedResearchView[] {
  return views.filter((view) => view.id !== id);
}

export function exportSavedViewsJson(views: SavedResearchView[]): string {
  const payload: SavedViewsFile = { version: 1, views };
  return JSON.stringify(payload, null, 2);
}

export function importSavedViewsJson(
  raw: string,
  existing: SavedResearchView[],
):
  | { ok: true; views: SavedResearchView[]; imported: number }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Import file is not valid JSON." };
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as SavedViewsFile).version !== 1 ||
    !Array.isArray((parsed as SavedViewsFile).views)
  ) {
    return { ok: false, error: "Import file is missing version 1 views." };
  }

  const incoming = (parsed as SavedViewsFile).views;
  const next = [...existing];
  let imported = 0;

  for (const view of incoming) {
    if (
      !view ||
      typeof view.id !== "string" ||
      typeof view.name !== "string" ||
      typeof view.search !== "string"
    ) {
      return { ok: false, error: "Import contains a malformed saved view." };
    }
    // Validate search parses without throwing.
    parseDashboardUrlSearch(view.search);
    let name = normalizeViewName(view.name);
    let suffix = 2;
    while (validateUniqueName(name, next) !== null) {
      name = `${normalizeViewName(view.name)} (${suffix})`;
      suffix += 1;
      if (suffix > 50) {
        return { ok: false, error: "Could not resolve unique names on import." };
      }
    }
    next.push({
      ...view,
      id: createSavedViewId(),
      name,
      search: view.search.startsWith("?") ? view.search : `?${view.search}`,
      createdAt: typeof view.createdAt === "string" ? view.createdAt : nowIso(),
      updatedAt: nowIso(),
    });
    imported += 1;
  }

  return { ok: true, views: next, imported };
}

export function snapshotSearchFromDashboard(input: {
  period: DashboardUrlState["period"];
  metric: DashboardUrlState["metric"];
  view: NonNullable<DashboardUrlState["view"]>;
  path: TreemapNode[];
  comparePeriod?: DashboardUrlState["comparePeriod"] | null;
}): string {
  return writeDashboardUrlSearch({
    period: input.period,
    metric: input.metric,
    view: input.view,
    path: input.path,
    comparePeriod: input.comparePeriod ?? null,
  });
}
