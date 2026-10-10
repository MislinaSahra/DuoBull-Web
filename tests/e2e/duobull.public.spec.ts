import { expect, test } from "@playwright/test";

test.describe("DuoBull public smoke and navigation", () => {
  test("home renders its primary content without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Oyna|Rekabet/i);
    await expect(page.getByRole("link", { name: /DuoBull ana sayfa/i })).toHaveAttribute("href", "/");
    expect(errors).toEqual([]);
  });

  test("blog opens from visible navigation and browser history is stable", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Blog", exact: true }).first().click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/duobull\.com\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/blog$/);
  });

  test("unknown route renders a real 404 experience", async ({ page }) => {
    const response = await page.goto("/bu-sayfa-yok-123");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /404|bulunamadı/i })).toBeVisible();
  });
});

test.describe("DuoBull metadata and crawler endpoints", () => {
  test("robots and sitemap are machine-readable", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect(robots.headers()["content-type"]).toContain("text/plain");
    expect(await robots.text()).toMatch(/User-agent:/i);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(sitemap.headers()["content-type"]).toMatch(/xml/i);
    expect(await sitemap.text()).toMatch(/<urlset[\s>]/i);
  });

  test("home has core SEO metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });
});

test.describe("DuoBull responsive and accessibility smoke", () => {
  test("page has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const sizes = await page.locator("html").evaluate((html) => ({
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
    }));
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
  });

  test("registration controls have programmatic labels", async ({ page }) => {
    await page.goto("/#hesap");
    await page.getByRole("button", { name: /Kayıt Ol/i }).first().click();

    for (const control of await page.locator("input, select, textarea").all()) {
      const accessibleName = await control.getAttribute("aria-label");
      const id = await control.getAttribute("id");
      const labelled = id ? await page.locator(`label[for="${id}"]`).count() : 0;
      expect(Boolean(accessibleName) || labelled > 0).toBeTruthy();
    }
  });

  test("interactive touch targets meet 44 by 44 CSS pixels", async ({ page }) => {
    await page.goto("/");
    const undersized = await page.locator("a, button, input, select, textarea").evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { label: element.getAttribute("aria-label") || element.textContent?.trim(), width: rect.width, height: rect.height };
        })
        .filter((item) => item.width > 0 && item.height > 0 && (item.width < 44 || item.height < 44)),
    );
    expect(undersized).toEqual([]);
  });
});
