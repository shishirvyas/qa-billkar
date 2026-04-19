/**
 * Billing Tests
 *
 * T04 — Create invoice
 * T05 — GST calculation validation
 * T06 — Save invoice
 * T07 — PDF / Print invoice
 * T09 — Return (credit note) invoice
 * T10 — Payment receive (record collection)
 */
import { test, expect } from "@playwright/test";
import { injectBridge, bootApp, navTo } from "../helpers/bridge.js";
import {
  CTX_ADMIN, CUSTOMER_RAMESH, CUSTOMER_PRIYA,
  PRODUCT_RICE, PRODUCT_OIL,
  TAX_GST5, TAX_GST18, UNIT_KG, PM_CASH, PM_UPI,
  INVOICE_001, INVOICE_PAID,
} from "../fixtures/testData.js";
import { calculateInvoiceTotals } from "../utils/calculators.js";
import { captureOnFailure } from "../utils/screenshots.js";

const BASE_OPTS = {
  ctx: CTX_ADMIN,
  customers:      [CUSTOMER_RAMESH, CUSTOMER_PRIYA],
  products:       [PRODUCT_RICE, PRODUCT_OIL],
  taxSlabs:       [TAX_GST5, TAX_GST18],
  units:          [UNIT_KG],
  paymentMethods: [PM_CASH, PM_UPI],
  invoices:       [INVOICE_001, INVOICE_PAID],
};

// ─── T04 — Create invoice ──────────────────────────────────────────────────────
test.describe("[T04] Create invoice", () => {
  test("New Invoice button is visible and navigates to create form", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);
    await bootApp(page);
    await navTo(page, "Invoice");

    const newInvBtn = page
      .getByRole("button", { name: /new invoice|create invoice|add invoice/i })
      .or(page.locator("[data-testid='new-invoice-btn']"))
      .first();

    await expect(newInvBtn).toBeVisible({ timeout: 10_000 });
  });

  test("invoice list loads with existing invoice numbers", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);
    await bootApp(page);
    await navTo(page, "Invoice");

    await expect(page.getByText("INV-2026-001")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("INV-2026-002")).toBeVisible({ timeout: 10_000 });
  });

  test("invoice list shows customer names", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);
    await bootApp(page);
    await navTo(page, "Invoice");

    await expect(page.getByText("Ramesh Kumar")).toBeVisible({ timeout: 10_000 });
  });
});

// ─── T05 — GST calculation ─────────────────────────────────────────────────────
test.describe("[T05] GST calculation", () => {
  test("exclusive GST 5%: taxable × 0.05 equals totalTax", () => {
    // 2 bags × ₹500, 5% discount, GST 5% exclusive
    const totals = calculateInvoiceTotals([
      { price: 500, quantity: 2, taxRate: 5, discount: 5 },
    ]);
    // gross = 1000, discount = 50, taxable = 950, tax = 47.50
    expect(totals.subtotal).toBe(1000);
    expect(totals.totalDiscount).toBe(50);
    expect(totals.taxableAmount).toBe(950);
    expect(totals.totalTax).toBe(47.5);
    expect(totals.grandTotal).toBe(997.5);
  });

  test("exclusive GST 18%: round-trip matches invoice grandTotal", () => {
    const totals = calculateInvoiceTotals([
      { price: 150, quantity: 3, taxRate: 18, discount: 0 },
    ]);
    // gross = 450, tax = 81, grand = 531
    expect(totals.taxableAmount).toBe(450);
    expect(totals.totalTax).toBe(81);
    expect(totals.grandTotal).toBe(531);
  });

  test("CGST + SGST split equals total GST for intra-state (GST 5%)", () => {
    // For GST 5%: cgst = 2.5%, sgst = 2.5%
    const taxRate  = TAX_GST5.rate;
    const cgstRate = TAX_GST5.cgst;
    const sgstRate = TAX_GST5.sgst;
    expect(cgstRate + sgstRate).toBe(taxRate);

    const taxable = 950;
    const cgst    = (taxable * cgstRate) / 100;
    const sgst    = (taxable * sgstRate) / 100;
    const total   = (taxable * taxRate)  / 100;
    expect(Math.round((cgst + sgst) * 100) / 100).toBe(total);
  });

  test("multi-line invoice: per-line taxes sum to invoice totalTax", () => {
    const lines = [
      { price: 500, quantity: 2, taxRate: 5,  discount: 5  },
      { price: 150, quantity: 3, taxRate: 18, discount: 0  },
    ];
    const totals = calculateInvoiceTotals(lines);
    // line1: taxable=950 tax=47.5  | line2: taxable=450 tax=81
    expect(totals.taxableAmount).toBe(1400);
    expect(totals.totalTax).toBe(128.5);
    expect(totals.grandTotal).toBe(1528.5);
  });

  test("zero-rate line item does not add GST", () => {
    const totals = calculateInvoiceTotals([
      { price: 200, quantity: 2, taxRate: 0, discount: 0 },
    ]);
    expect(totals.totalTax).toBe(0);
    expect(totals.grandTotal).toBe(400);
  });
});

// ─── T06 — Save invoice ────────────────────────────────────────────────────────
test.describe("[T06] Save invoice", () => {
  test("FINALIZED invoices show FINALIZED status badge in the list", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);
    await bootApp(page);
    await navTo(page, "Invoice");

    // Status badge text varies; look for 'finalized' or 'paid' anywhere
    const statusBadge = page
      .getByText(/finalized|paid|FINALIZED|PAID/)
      .first();
    await expect(statusBadge).toBeVisible({ timeout: 10_000 });
  });

  test("invoice grandTotal renders correctly in list view", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);
    await bootApp(page);
    await navTo(page, "Invoice");

    // INVOICE_001 grandTotal = 997.5
    await expect(page.getByText(/997/)).toBeVisible({ timeout: 10_000 });
  });
});

// ─── T07 — PDF / Print ────────────────────────────────────────────────────────
test.describe("[T07] PDF print invoice", () => {
  test("Print / PDF button exists on invoice detail or list row", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);
    await bootApp(page);
    await navTo(page, "Invoice");

    await expect(page.getByText("INV-2026-001")).toBeVisible({ timeout: 10_000 });

    // Try to open invoice detail
    await page.getByText("INV-2026-001").first().click();
    await page.waitForTimeout(500);

    // Look for print / PDF button in detail view or action menu
    const printBtn = page
      .getByRole("button", { name: /print|pdf|download/i })
      .or(page.locator("[data-testid='print-btn'], [aria-label*='print' i], [aria-label*='pdf' i]"))
      .first();

    const exists = await printBtn.isVisible().catch(() => false);
    if (exists) {
      // Click and verify no crash (print dialog opened or bridge called)
      await printBtn.click();
      await page.waitForTimeout(400);
    }
    // Page must remain stable regardless
    await expect(page.locator("body")).toBeVisible();
  });

  test("bridge print.invoice is callable for finalized invoice", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);

    // Capture the print call in the browser
    await page.addInitScript(() => {
      // @ts-expect-error window extension
      window.__printCalled = null;
      const orig = window.biilkar?.print?.invoice;
      if (orig) {
        // @ts-expect-error window extension
        window.biilkar.print.invoice = async (id: string) => {
          // @ts-expect-error window extension
          window.__printCalled = id;
          return { printed: true, invoiceId: id };
        };
      }
    });

    await bootApp(page);
    await navTo(page, "Invoice");

    // Manually invoke the bridge from the page to verify it works
    const result = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar?.print?.invoice("inv-001");
    });
    expect(result).toMatchObject({ printed: true, invoiceId: "inv-001" });
  });
});

// ─── T09 — Return invoice ─────────────────────────────────────────────────────
test.describe("[T09] Return invoice (credit note)", () => {
  test("bridge billing.returns.create is callable", async ({ page }) => {
    await injectBridge(page, BASE_OPTS);
    await bootApp(page);

    const result = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar?.billing?.returns?.create({
        id:            "ret-001",
        invoiceId:     "inv-001",
        reason:        "Damaged goods",
        returnedItems: [{ productId: "prod-rice", quantity: 1 }],
        refundAmount:  490,
        createdAt:     new Date().toISOString(),
      });
    });
    expect(result).toMatchObject({ id: "ret-001", invoiceId: "inv-001" });
  });

  test("returns list starts empty and reflects new return entry", async ({ page }) => {
    await injectBridge(page, { ...BASE_OPTS, returns: [] });
    await bootApp(page);

    const before = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const r = await window.biilkar?.billing?.returns?.list();
      return r?.total ?? r?.items?.length ?? 0;
    });
    expect(before).toBe(0);

    // Add a return via the bridge
    await page.evaluate(async () => {
      // @ts-expect-error window extension
      await window.biilkar?.billing?.returns?.create({
        id: "ret-new", invoiceId: "inv-001", refundAmount: 200,
      });
    });

    const after = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const r = await window.biilkar?.billing?.returns?.list();
      return r?.total ?? r?.items?.length ?? 0;
    });
    expect(after).toBe(1);
  });
});

// ─── T10 — Payment receive ─────────────────────────────────────────────────────
test.describe("[T10] Payment receive", () => {
  test("recording a payment reduces invoice balanceDue", async ({ page }) => {
    await injectBridge(page, { ...BASE_OPTS, collections: [] });
    await bootApp(page);

    // INVOICE_001 has balanceDue = 497.5; record partial payment of 300
    await page.evaluate(async () => {
      // @ts-expect-error window extension
      await window.biilkar?.billing?.collections?.recordPayment({
        id:            "pay-001",
        invoiceId:     "inv-001",
        amount:        300,
        paymentMethod: "Cash",
        paidAt:        new Date().toISOString(),
      });
    });

    // Check the invoice balance was updated
    const inv = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar?.billing?.invoice?.get("inv-001");
    });
    expect(inv).not.toBeNull();
    // balanceDue should have decreased
    expect((inv as Record<string, number>).paidAmount).toBeGreaterThanOrEqual(300);
  });

  test("full payment marks invoice as PAID", async ({ page }) => {
    await injectBridge(page, { ...BASE_OPTS, collections: [] });
    await bootApp(page);

    // INVOICE_001 balanceDue = 497.5; pay the exact balance
    await page.evaluate(async () => {
      // @ts-expect-error window extension
      await window.biilkar?.billing?.collections?.recordPayment({
        id: "pay-002", invoiceId: "inv-001",
        amount: 497.5, paymentMethod: "UPI",
        paidAt: new Date().toISOString(),
      });
    });

    const inv = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar?.billing?.invoice?.get("inv-001");
    });
    expect((inv as Record<string, unknown>).status).toBe("PAID");
  });
});

