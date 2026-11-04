import { expect, test } from "./fixtures";

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
      await expect(page).toHaveScreenshot(`hero-${colorScheme}.png`, {
        mask: [page.getByRole("complementary", { name: "What the page answers" })],
        maxDiffPixelRatio: 0.01,
      });
    });
  });
}
