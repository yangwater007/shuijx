/**
 * 同花顺 → PostgreSQL 数据抓取与填充脚本
 * 用法: node scripts/seed-ths.mjs [股票代码1] [股票代码2] ...
 *
 * 抓取流程:
 *   1. 从同花顺 API 获取K线/分时数据
 *   2. 解析 JSONP 响应
 *   3. 写入 PostgreSQL
 */

import pg from "pg";
import https from "https";

const { Pool } = pg;

// ─── 配置 ─────────────────────────────────

const POOL = new Pool({
  host: "localhost",
  port: 5432,
  database: "quicktiny",
  user: "quicktiny",
  password: "quicktiny123",
});

const THS_KL_BASE = "https://d.10jqka.com.cn/v2/line";
const THS_TS_BASE = "https://d.10jqka.com.cn/v2/time";

// ─── 工具函数 ───────────────────────────

function fetchJSONP(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = data.replace(/^[^(]*\(/, "").replace(/\)\s*$/, "");
          resolve(JSON.parse(json));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function getMarketPrefix(code) {
  if (code.startsWith("6")) return "hs";
  if (["0", "2", "3"].some((p) => code.startsWith(p))) return "sz";
  return "hs";
}

// ─── 核心逻辑 ──────────────────────────

async function seedKLine(code, name) {
  const market = getMarketPrefix(code);
  const url = `${THS_KL_BASE}/${market}_${code}/01/last.js`;

  console.log(`[K线] ${code} ${name} fetching...`);
  const parsed = await fetchJSONP(url);
  if (!parsed?.data) {
    console.log(`  -> no data`);
    return 0;
  }

  const lines = parsed.data.split(";").filter(Boolean);
  const rows = lines.map((line) => {
    const p = line.split(",");
    if (p.length < 7) return null;
    return {
      code,
      trade_date: p[0],
      open: parseFloat(p[1]),
      high: parseFloat(p[2]),
      low: parseFloat(p[3]),
      close: parseFloat(p[4]),
      volume: parseInt(p[5], 10),
      amount: parseFloat(p[6]),
    };
  }).filter(Boolean);

  if (rows.length === 0) return 0;

  const client = await POOL.connect();
  try {
    // upsert stock
    await client.query(
      `INSERT INTO base_stocks (code, name, market) VALUES ($1,$2,$3)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name=$2, updated_at=now()`,
      [code, name, code.startsWith("6") ? "SH" : "SZ"]
    );

    // batch insert kline
    const values = rows.map((r, i) =>
      `($1,'${r.trade_date}',${r.open},${r.high},${r.low},${r.close},${r.volume},${r.amount})`
    ).join(",");

    await client.query(
      `INSERT INTO daily_kline (code, trade_date, open, high, low, close, volume, amount)
       VALUES ${values}
       ON CONFLICT (code, trade_date) DO NOTHING`,
      [code]
    );
  } finally {
    client.release();
  }

  console.log(`  -> ${rows.length} rows inserted`);
  return rows.length;
}

async function main() {
  const codes = process.argv.slice(2);
  if (codes.length === 0) {
    console.log("用法: node scripts/seed-ths.mjs 600519 000858 300750 ...");
    process.exit(1);
  }

  console.log(`开始抓取 ${codes.length} 只股票的K线数据...\n`);

  let total = 0;
  for (const code of codes) {
    try {
      const count = await seedKLine(code, code);
      total += count;
      // 礼貌延迟
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`  [${code}] 错误: ${e.message}`);
    }
  }

  console.log(`\n完成! 共写入 ${total} 条记录`);
  await POOL.end();
}

main();
