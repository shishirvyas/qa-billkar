/**
 * Billing calculation utilities for QA tests.
 */

export interface LineItem {
  price: number;
  quantity: number;
  taxRate: number; // percentage, e.g. 18 for 18%
  discount?: number; // percentage, e.g. 10 for 10%
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
}

export function calculateLineTotal(item: LineItem): number {
  const gross = item.price * item.quantity;
  const discount = gross * ((item.discount ?? 0) / 100);
  return gross - discount;
}

export function calculateInvoiceTotals(items: LineItem[]): InvoiceTotals {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const item of items) {
    const gross = item.price * item.quantity;
    const discount = gross * ((item.discount ?? 0) / 100);
    const taxable = gross - discount;
    const tax = taxable * (item.taxRate / 100);

    subtotal += gross;
    totalDiscount += discount;
    totalTax += tax;
  }

  const taxableAmount = subtotal - totalDiscount;
  const grandTotal = taxableAmount + totalTax;

  return {
    subtotal: round2(subtotal),
    totalDiscount: round2(totalDiscount),
    taxableAmount: round2(taxableAmount),
    totalTax: round2(totalTax),
    grandTotal: round2(grandTotal),
  };
}

export function applyPercentageDiscount(amount: number, discountPercent: number): number {
  return round2(amount - amount * (discountPercent / 100));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
