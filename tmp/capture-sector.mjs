/**
 * 无头浏览器抓取 sector-analysis 页面完整 DOM
 * 等待异步数据渲染完毕，输出到 tmp/sector-full-dom.html
 */
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

  // 等待异步渲染：ECharts 图表 + API 数据加载
  console.log("Waiting for async rendering...");
  await page.waitForTimeout(8000);

  // 等 API 数据渲染完成（检测关键DOM节点）
  try {
    await page.waitForSelector(".sector-quadrant-chart, .quadrant-chart, [class*='quadrant'], [class*='sankey']", {
      timeout: 15000,
    });
  } catch {
    console.log("Timeout waiting for quadrant chart, continuing...");
  }

  // 额外等待 ECharts 初始化
  await page.waitForTimeout(3000);

  // 提取完整的渲染后 HTML
  const fullHTML = await page.evaluate(() => {
    // 去掉 script 标签（但保留 DOM 结构）
    const clone = document.documentElement.cloneNode(true);
    const scripts = clone.querySelectorAll("script");
    scripts.forEach(s => s.remove());
    return "<!DOCTYPE html>\n" + clone.outerHTML;
  });

  // 保存
  const outPath = path.join(__dirname, "tmp", "sector-full-dom.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, fullHTML, "utf-8");
  console.log(`DOM saved to: ${outPath} (${fullHTML.length} chars)`);

  // 同时截图用于视觉参考
  await page.screenshot({
    path: path.join(__dirname, "tmp", "sector-full-page.png"),
    fullPage: true,
  });
  console.log("Screenshot saved.");

  // 提取关键结构信息
  const structure = await page.evaluate(() => {
    const result = [];
    function walk(el, depth) {
      if (el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      const cls = el.className && typeof el.className === "string" ? el.className : "";
      const id = el.id || "";
      // 只保留有意义的容器
      const meaningful = cls || id || ["div", "section", "main", "aside", "nav", "header", "footer", "article"].includes(tag);
      if (meaningful) {
        result.push({
          depth,
          tag,
          cls: cls.slice(0, 80),
          id: id.slice(0, 40),
          childCount: el.children.length,
          textPreview: el.textContent?.trim().slice(0, 60) || "",
        });
      }
      for (const child of el.children) {
        walk(child, depth + 1);
      }
    }
    walk(document.body, 0);
    return result;
  });

  fs.writeFileSync(
    path.join(__dirname, "tmp", "sector-structure-raw.json"),
    JSON.stringify(structure, null, 2),
    "utf-8"
  );
  console.log(`Structure extracted: ${structure.length} nodes`);

  await browser.close();
  console.log("Done.");
})();
