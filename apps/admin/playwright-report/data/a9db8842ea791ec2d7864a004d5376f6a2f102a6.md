# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Admin App Visual Tests >> homepage loads and matches snapshot
- Location: tests/e2e/visual.spec.ts:4:3

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  561516 pixels (ratio 0.61 of all image pixels) are different.

  Snapshot: homepage.png

Call log:
  - Expect "toHaveScreenshot(homepage.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 561516 pixels (ratio 0.61 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 561516 pixels (ratio 0.61 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e7]:
    - link "Refine Project" [ref=e9] [cursor=pointer]:
        - /url: /admin
        - generic [ref=e10]:
            - img [ref=e13]
            - heading "Refine Project" [level=1] [ref=e17]
    - generic [ref=e19]:
        - heading "Welcome Back" [level=3] [ref=e20]
        - text: Sign in to your admin account
    - generic [ref=e22]:
        - generic [ref=e24]:
            - generic "Email" [ref=e26]
            - generic [ref=e30]:
                - img "user" [ref=e32]:
                    - img [ref=e33]
                - textbox "Email" [ref=e35]:
                    - /placeholder: email@example.com
        - generic [ref=e37]:
            - generic "Password" [ref=e39]
            - generic [ref=e43]:
                - img "lock" [ref=e45]:
                    - img [ref=e46]
                - textbox "Password" [ref=e48]:
                    - /placeholder: ••••••••
                - img "eye-invisible" [ref=e50] [cursor=pointer]:
                    - img [ref=e51]
        - button "Sign In" [ref=e59] [cursor=pointer]:
            - generic [ref=e60]: Sign In
    - generic [ref=e61]: "Default credentials: superadmin@example.sch.id / Admin123!"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Admin App Visual Tests', () => {
  4  |   test('homepage loads and matches snapshot', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await page.waitForLoadState('networkidle');
> 7  |     await expect(page).toHaveScreenshot('homepage.png', {
     |                        ^ Error: expect(page).toHaveScreenshot(expected) failed
  8  |       fullPage: true,
  9  |       animations: 'disabled',
  10 |     });
  11 |   });
  12 |
  13 |   test('login page loads and matches snapshot', async ({ page }) => {
  14 |     await page.goto('/login');
  15 |     await page.waitForLoadState('networkidle');
  16 |     await expect(page).toHaveScreenshot('login-page.png', {
  17 |       fullPage: true,
  18 |       animations: 'disabled',
  19 |     });
  20 |   });
  21 |
  22 |   test('dashboard loads and matches snapshot', async ({ page }) => {
  23 |     await page.goto('/dashboard');
  24 |     await page.waitForLoadState('networkidle');
  25 |     await expect(page).toHaveScreenshot('dashboard.png', {
  26 |       fullPage: true,
  27 |       animations: 'disabled',
  28 |     });
  29 |   });
  30 |
  31 |   test('mobile viewport homepage', async ({ page }) => {
  32 |     await page.setViewportSize({ width: 375, height: 667 });
  33 |     await page.goto('/');
  34 |     await page.waitForLoadState('networkidle');
  35 |     await expect(page).toHaveScreenshot('homepage-mobile.png', {
  36 |       fullPage: true,
  37 |       animations: 'disabled',
  38 |     });
  39 |   });
  40 | });
```
