/**
 * Custom Playwright expect matchers for the Billkar QA suite.
 *
 * Usage:
 *   import { matchers } from '../utils/matchers.js';
 *   expect.extend(matchers);
 *
 *   expect("29ABCDE1234F1Z5").toBeValidGstin();
 *   expect("1001").toBeValidHsn();
 *   expect(100.004).toBeWithinTolerance(100, 0.01);
 *   expect("PAID").toHaveStatus("PAID");
 *   expect("INV-2024-001").toBeValidInvoiceNumber();
 */

import { expect } from "@playwright/test";
import { isValidGstin, isValidHsn } from "./gstCalculator.js";

export const matchers = {
  toBeValidGstin(received: string) {
    const pass = isValidGstin(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" NOT to be a valid GSTIN`
          : `Expected "${received}" to be a valid GSTIN (15-char format: 2-digit state, 10-char PAN, entity, Z, checksum)`,
    };
  },

  toBeValidHsn(received: string) {
    const pass = isValidHsn(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" NOT to be a valid HSN code`
          : `Expected "${received}" to be a valid HSN code (4, 6, or 8 digits)`,
    };
  },

  toBeWithinTolerance(received: number, expected: number, tolerance = 0.01) {
    const diff = Math.abs(received - expected);
    const pass = diff <= tolerance;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} NOT to be within ±${tolerance} of ${expected}`
          : `Expected ${received} to be within ±${tolerance} of ${expected} (diff: ${diff.toFixed(6)})`,
    };
  },

  toHaveStatus(received: string, expected: string) {
    const pass = received === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected status NOT to be "${expected}"`
          : `Expected status "${received}" to equal "${expected}"`,
    };
  },

  toBeValidInvoiceNumber(received: string) {
    // Accepts: INV-YYYY-NNN or INV-YYYY-NNNN
    const pass = /^INV-\d{4}-\d{3,6}$/.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" NOT to be a valid invoice number`
          : `Expected "${received}" to match invoice number format INV-YYYY-NNN[N]`,
    };
  },
};

// Extend the global expect so callers can use expect(x).toBeValidGstin() etc.
expect.extend(matchers);

// TypeScript augmentation for type safety
declare module "@playwright/test" {
  interface Matchers<R> {
    toBeValidGstin(): R;
    toBeValidHsn(): R;
    toBeWithinTolerance(expected: number, tolerance?: number): R;
    toHaveStatus(expected: string): R;
    toBeValidInvoiceNumber(): R;
  }
}
