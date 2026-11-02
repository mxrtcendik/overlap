import AxeBuilder from "@axe-core/playwright";
import { createPoll, expect, test, vote } from "./fixtures";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test("home page has no accessibility violations", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("heading", { name: "Create a poll" }).waitFor();
      const results = await new AxeBuilder({ page }).withTags(WCAG).exclude("nextjs-portal").analyze();
      expect(results.violations).toEqual([]);
    });

    test("design page has no accessibility violations", async ({ page }) => {
      await page.goto("/design");
      await page.getByRole("heading", { name: "Design system" }).waitFor();
      const results = await new AxeBuilder({ page }).withTags(WCAG).exclude("nextjs-portal").analyze();
      expect(results.violations).toEqual([]);
    });

    test("poll and owner pages have no accessibility violations", async ({ page, request }) => {
      const { id, ownerToken, slots } = await createPoll(request);
      await vote(id, { name: "Ada", slots: slots.slice(0, 4), maybe: slots.slice(4, 6), note: "Remote only" });
      await vote(id, { name: "Bruno", slots: slots.slice(2, 6) });

      for (const path of [`/p/${id}`, `/o/${ownerToken}`]) {
        await page.goto(path);
        await page.locator("tbody .slot").first().waitFor();
        const results = await new AxeBuilder({ page }).withTags(WCAG).exclude("nextjs-portal").analyze();
        expect(results.violations, path).toEqual([]);
      }
    });
  });
}
