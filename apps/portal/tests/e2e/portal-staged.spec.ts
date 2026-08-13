import { expect, test } from "@playwright/test";

const staged = process.env.PORTAL_STAGED === "1";
const email = process.env.PORTAL_E2E_EMAIL;
const password = process.env.PORTAL_E2E_PASSWORD;

test.skip(
  !staged || !email || !password,
  "Set PORTAL_STAGED, PORTAL_E2E_EMAIL, and PORTAL_E2E_PASSWORD for staging acceptance."
);

test("staging portal login and read-only shell smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Kata sandi").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nilai Akademik" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Kehadiran" }).click();
  await expect(page.getByRole("heading", { name: "Kehadiran" })).toBeVisible();
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page.getByRole("heading", { name: "Masuk ke Portal" })).toBeVisible();
});
