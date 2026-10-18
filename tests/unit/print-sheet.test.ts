import { describe, expect, it } from "vitest";
import { layoutSheet, SHEET_GAP_MM, SHEET_PAPERS } from "@/lib/presets/print-sheet";

describe("passport print sheet layout", () => {
  it("fits 8 photos of 35 × 45 mm on 4 × 6 in paper (landscape) and 30 on A4", () => {
    const sheet = layoutSheet(35, 45, "4x6");
    expect(sheet).toMatchObject({ count: 8, columns: 4, rows: 2, landscape: true });
    expect(layoutSheet(35, 45, "a4")).toMatchObject({ count: 30, columns: 5, rows: 6, landscape: false });
  });

  it("fits Canada's 50 × 70 mm photo 2 to a 4 × 6 sheet and 12 on A4", () => {
    expect(layoutSheet(50, 70, "4x6").count).toBe(2);
    expect(layoutSheet(50, 70, "a4").count).toBe(12);
  });

  it("keeps every photo inside the margins and never overlapping", () => {
    for (const [w, h] of [[35, 45], [51, 51], [50, 70], [20, 25]] as const) {
      for (const paper of ["4x6", "a4"] as const) {
        const sheet = layoutSheet(w, h, paper);
        const margin = SHEET_PAPERS[paper].margin;
        for (const p of sheet.positions) {
          expect(p.x).toBeGreaterThanOrEqual(margin - 1e-6);
          expect(p.y).toBeGreaterThanOrEqual(margin - 1e-6);
          expect(p.x + w).toBeLessThanOrEqual(sheet.width - margin + 1e-6);
          expect(p.y + h).toBeLessThanOrEqual(sheet.height - margin + 1e-6);
        }
        if (sheet.columns > 1) expect(sheet.positions[1].x - sheet.positions[0].x).toBeCloseTo(w + SHEET_GAP_MM);
        expect(sheet.positions).toHaveLength(sheet.count);
      }
    }
  });

  it("reports zero when the photo is larger than the paper", () => {
    expect(layoutSheet(120, 160, "4x6").count).toBe(0);
  });
});
