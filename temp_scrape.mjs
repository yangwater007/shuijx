// Navigate to the visualization page and intercept network requests
var { chromium } = await import("playwright");
var browser = await chromium.launch({ headless: false });
var context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
var page = await context.newPage();

// Collect all API responses
var apiResponses = [];
page.on("response", async (response) => {
  var url = response.url();
  if (url.includes("/api/") && response.headers()["content-type"]?.includes("json")) {
    try {
      var body = await response.json();
      apiResponses.push({ url, body: JSON.stringify(body).substring(0, 3000) });
    } catch (e) {}
  }
});

await page.goto("https://stock.quicktiny.cn/visualization?tab=theme-evolution", { 
  waitUntil: "networkidle", 
  timeout: 30000 
});

// Wait for data to load
await page.waitForTimeout(5000);

// Also capture XHR/fetch responses that might come late
await page.waitForTimeout(3000);

nodeRepl.write(JSON.stringify(apiResponses, null, 2));

// Take screenshot
var screenshot = await page.screenshot({ fullPage: true });
await nodeRepl.emitImage({ bytes: screenshot, mimeType: "image/png" });

await browser.close();
