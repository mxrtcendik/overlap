import { expect, test } from "./fixtures";

// Screenshot comparisons. Baselines are per platform (…-win32.png, …-linux.png):
// fonts render differently on each, so CI keeps its own set. Regenerate with
//   bunx playwright test e2e/visual.spec.ts --update-snapshots
// or, for the Linux set, run the "Update visual baselines" workflow on GitHub.

test.use({ reducedMotion: "reduce" });

const HIDE_DEV_BADGE = "nextjs-portal { display: none !important; }";

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode @visual`, () => {
    test.use({ colorScheme });

    test("design system", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/design");
      await page.getByRole("heading", { name: "Design system" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: HIDE_DEV_BADGE });
      await expect(page).toHaveScreenshot(`design-${colorScheme}.png`, { fullPage: true, maxDiffPixelRatio: 0.01 });
    });

    test("landing hero", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: HIDE_DEV_BADGE });
      // The clocks show today's date and the visitor's zone, so they change daily.
      await expect(page).toHaveScreenshot(`hero-${colorScheme}.png`, {
        mask: [page.getByRole("complementary", { name: "What the page answers" })],
        maxDiffPixelRatio: 0.01,
      });
    });
  });
}
