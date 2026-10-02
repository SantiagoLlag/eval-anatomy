export const ALL = "__all__";

/** Distinct lens names, sorted. */
export function lensesOf(rows: { lens: string }[]): string[] {
  return [...new Set(rows.map((r) => r.lens))].sort((a, b) => a.localeCompare(b));
}

/** Rows whose lens equals `lens`; `ALL` keeps every row. */
export function filterByLens<T extends { lens: string }>(rows: T[], lens: string): T[] {
  return lens === ALL ? rows : rows.filter((r) => r.lens === lens);
}
