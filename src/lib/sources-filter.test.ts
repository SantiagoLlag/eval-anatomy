import { describe, expect, it } from "vitest";
import { ALL, filterByLens, lensesOf } from "./sources-filter";

const rows = [{ lens: "B" }, { lens: "A" }, { lens: "B" }];

describe("sources filter", () => {
  it("lists distinct lenses sorted", () => expect(lensesOf(rows)).toEqual(["A", "B"]));
  it("keeps everything for ALL", () => expect(filterByLens(rows, ALL)).toHaveLength(3));
  it("filters by lens", () => expect(filterByLens(rows, "B")).toHaveLength(2));
  it("returns nothing for an unknown lens", () => expect(filterByLens(rows, "Z")).toEqual([]));
});
