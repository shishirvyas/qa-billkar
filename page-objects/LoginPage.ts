import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export class LoginPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.waitForLoad();
  }

  /** Expect the login form to be visible. */
  async expectLoginForm(): Promise<void> {
    const form = this.page
      .locator("[data-testid='login-form'], form")
      .first();
    await expect(form).toBeVisible({ timeout: 8_000 });
  }

  /** Fill credentials and submit. */
  async login(email: string, password: string): Promise<void> {
    const emailInp = this.page
      .locator("[data-testid='email'], input[type='email']")
      .or(this.page.getByLabel(/email/i))
      .first();
    const passInp  = this.page
      .locator("[data-testid='password'], input[type='password']")
      .or(this.page.getByLabel(/password/i))
      .first();
    const submitBtn = this.page
      .locator("[data-testid='login-btn'], button[type='submit']")
      .or(this.page.getByRole("button", { name: /login|sign in/i }))
      .first();

    await emailInp.fill(email);
    await passInp.fill(password);
    await submitBtn.click();
    // Wait for the nav shell to appear (successful login)
    await this.page
      .locator("nav, [data-testid='app-shell']")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => undefined); // let tests assert outcome themselves
  }

  /** Login using a role context (email = ctx.userId + "@test.com"). */
  async loginWithRole(ctx: { userId: string; role: string }): Promise<void> {
    await this.login(`${ctx.userId}@test.com`, "Test@1234");
  }

  /** Expect an invalid-credentials error to appear. */
  async expectLoginError(): Promise<void> {
    await this.expectError(/invalid|incorrect|wrong|not found/i);
  }
}
