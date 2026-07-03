const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log("Navigating to sector-analysis...");
  await page.goto("https://stock.quicktiny.cn/sector-analysis", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  console.log("Waiting for async rendering...");
  await page.waitForTimeout(8000);

  try {
    await page.waitForSelector("[class*='quadrant'], [class*='sankey'], canvas", { timeout: 15000 });
  } catch {
    console.log("Timeout waiting for chart elements, continuing...");
  }

  await page.waitForTimeout(3000);

  const fullHTML = await page.evaluate(() => {
    const clone = document.documentElement.cloneNode(true);
    const scripts = clone.querySelectorAll("script");
    scripts.forEach(s => s.remove());
    return "<!DOCTYPE html>\n" + clone.outerHTML;
  });

  const outPath = path.join(__dirname, "tmp", "sector-full-dom.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, fullHTML, "utf-8");
  console.log(`DOM saved: ${fullHTML.length} chars`);

  await page.screenshot({
    path: path.join(__dirname, "tmp", "sector-full-page.png"),
    fullPage: true,
  });
  console.log("Screenshot saved.");

  const structure = await page.evaluate(() => {
    const result = [];
    function walk(el, depth) {
      if (el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      const cls = el.className && typeof el.className === "string" ? el.className : "";
      const id = el.id || "";
      if (cls || id || ["div","section","main","aside","nav","header","footer","article","table","ul","ol","form"].includes(tag)) {
        result.push({
          depth, tag,
          cls: cls.slice(0, 100),
          id: id.slice(0, 50),
          childCount: el.children.length,
          textPreview: (el.textContent || "").trim().slice(0, 80),
        });
      }
      for (const child of el.children) walk(child, depth + 1);
    }
    walk(document.body, 0);
    return result;
  });

  fs.writeFileSync(path.join(__dirname, "tmp", "sector-structure-raw.json"), JSON.stringify(structure, null, 2), "utf-8");
  console.log(`Structure: ${structure.length} nodes`);

  await browser.close();
  console.log("Done.");
})();
