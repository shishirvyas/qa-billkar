/**
 * GST Test Suite — 10 tests validating GST computation accuracy.
 *
 * Tests: GST 0%, 5%, 12%, 18%, 28%, inclusive-mode, cgst+sgst intrastate,
 *        igst interstate, multi-line invoice, hsn-code validation
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import {
  calcLine,
  calcInvoice,
  isValidHsn,
} from "../../utils/gstCalculator.js";
import { CTX_ADMIN, TAX_GST5, TAX_GST18 } from "../../fixtures/testData.js";

test.beforeEach(async ({ page }) => {
  await injectBridge(page, { ctx: CTX_ADMIN, taxSlabs: [TAX_GST5, TAX_GST18] });
  await page.goto("/");
});

// ── T-GST-01: GST 0% produces no tax ─────────────────────────────────────────
test("T-GST-01: 0% GST rate produces zero tax amount", async () => {
  const result = calcLine({ unitPrice: 100, qty: 2, taxRate: 0, discountPct: 0, taxMode: "exclusive", supply: "intrastate" });
  expect(result.taxAmt).toBe(0);
  expect(result.lineTotal).toBe(200);
});

// ── T-GST-02: GST 5% ─────────────────────────────────────────────────────────
test("T-GST-02: 5% GST rate is computed correctly", async () => {
  const result = calcLine({ unitPrice: 200, qty: 1, taxRate: 5, discountPct: 0, taxMode: "exclusive", supply: "intrastate" });
  expect(result.taxAmt).toBe(10);
  expect(result.lineTotal).toBe(210);
  expect(result.cgst).toBe(5);
  expect(result.sgst).toBe(5);
  expect(result.igst).toBe(0);
});

// ── T-GST-03: GST 12% ────────────────────────────────────────────────────────
test("T-GST-03: 12% GST rate is computed correctly", async () => {
  const result = calcLine({ unitPrice: 500, qty: 1, taxRate: 12, discountPct: 0, taxMode: "exclusive", supply: "intrastate" });
  expect(result.taxAmt).toBe(60);
  expect(result.lineTotal).toBe(560);
  expect(result.cgst).toBe(30);
  expect(result.sgst).toBe(30);
});

// ── T-GST-04: GST 18% ────────────────────────────────────────────────────────
test("T-GST-04: 18% GST rate is computed correctly (CGST 9% + SGST 9%)", async () => {
  const result = calcLine({ unitPrice: 1000, qty: 1, taxRate: 18, discountPct: 0, taxMode: "exclusive", supply: "intrastate" });
  expect(result.taxAmt).toBe(180);
  expect(result.lineTotal).toBe(1180);
  expect(result.cgst).toBe(90);
  expect(result.sgst).toBe(90);
  expect(result.igst).toBe(0);
});

// ── T-GST-05: GST 28% ────────────────────────────────────────────────────────
test("T-GST-05: 28% GST rate is computed correctly", async () => {
  const result = calcLine({ unitPrice: 100, qty: 1, taxRate: 28, discountPct: 0, taxMode: "exclusive", supply: "intrastate" });
  expect(result.taxAmt).toBe(28);
  expect(result.cgst).toBe(14);
  expect(result.sgst).toBe(14);
});

// ── T-GST-06: Inclusive tax mode ─────────────────────────────────────────────
test("T-GST-06: inclusive mode extracts tax from the listed price", async () => {
  // Listed price 118 includes 18% GST → taxable = 100, tax = 18
  const result = calcLine({ unitPrice: 118, qty: 1, taxRate: 18, discountPct: 0, taxMode: "inclusive", supply: "intrastate" });
  expect(result.taxableAmt).toBeCloseTo(100, 1);
  expect(result.taxAmt).toBeCloseTo(18, 1);
  expect(result.lineTotal).toBeCloseTo(118, 1);
});

// ── T-GST-07: Interstate supply uses IGST ────────────────────────────────────
test("T-GST-07: interstate supply produces IGST (not CGST+SGST)", async () => {
  const result = calcLine({ unitPrice: 1000, qty: 1, taxRate: 18, discountPct: 0, taxMode: "exclusive", supply: "interstate" });
  expect(result.cgst).toBe(0);
  expect(result.sgst).toBe(0);
  expect(result.igst).toBe(180);
});

// ── T-GST-08: Multi-line invoice tax totals ───────────────────────────────────
test("T-GST-08: multi-line invoice tax totals are accurate", async () => {
  const lines = [
    { unitPrice: 500, qty: 2, taxRate: 18, discountPct: 0, taxMode: "exclusive" as const, supply: "intrastate" as const },
    { unitPrice: 200, qty: 1, taxRate: 5,  discountPct: 0, taxMode: "exclusive" as const, supply: "intrastate" as const },
  ];
  const totals = calcInvoice(lines);
  // Line 1: taxable=1000, tax=180 → total=1180
  // Line 2: taxable=200,  tax=10  → total=210
  expect(totals.subTotal).toBe(1200);
  expect(totals.taxTotal).toBe(190);
  expect(totals.grandTotal).toBe(1390);
});

// ── T-GST-09: Discount before tax ────────────────────────────────────────────
test("T-GST-09: discount is applied to taxable amount before GST", async () => {
  const result = calcLine({ unitPrice: 1000, qty: 1, taxRate: 18, discountPct: 10, taxMode: "exclusive", supply: "intrastate" });
  // taxable = 1000 - 100 = 900; tax = 900 × 0.18 = 162; total = 1062
  expect(result.discountAmt).toBe(100);
  expect(result.taxableAmt).toBe(900);
  expect(result.taxAmt).toBe(162);
  expect(result.lineTotal).toBe(1062);
});

// ── T-GST-10: HSN code validation ────────────────────────────────────────────
test("T-GST-10: isValidHsn rejects empty and accepts valid 4/6/8-digit HSN codes", async () => {
  expect(isValidHsn("")).toBe(false);
  expect(isValidHsn("01")).toBe(false);
  expect(isValidHsn("1001")).toBe(true);     // 4-digit
  expect(isValidHsn("100110")).toBe(true);   // 6-digit
  expect(isValidHsn("10011001")).toBe(true); // 8-digit
  expect(isValidHsn("100110010")).toBe(false); // 9-digit invalid
});
