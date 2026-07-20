/**
 * quicktiny Repository — 将 MCP 工具映射到 quicktiny REST API
 * 替代 Supabase MCP 数据源
 */
const BASE = "https://stock.quicktiny.cn/api";

// 缓存 ladder 数据（同一请求内复用）
var ladderCache: { data: any; ts: number } | null = null;
async function getLadder() {
  if (ladderCache && Date.now() - ladderCache.ts < 30000) return ladderCache.data;
  var resp = await fetch(BASE + "/ladder");
  var data = await resp.json();
  ladderCache = { data, ts: Date.now() };
  return data;
}

export async function callQuicktinyTool(name: string, args: Record<string, unknown>): Promise<string | null> {
  try {
    switch (name) {
      case "market_overview": {
        var ladder = await getLadder();
        var dates = ladder.dates || [];
        var latest = dates[0];
        if (!latest) return null;
        var total = latest.totalStocks || 0;
        var up = 0, down = 0;
        var themes: Record<string, number> = {};
        for (var b of latest.boards || []) {
          for (var s of b.stocks || []) {
            if (s.change_rate > 0) up++; else down++;
            var th = s.primary_theme || s.reason_type || "other";
            themes[th] = (themes[th] || 0) + 1;
          }
        }
        var topThemes = Object.entries(themes).sort((a,b) => b[1]-a[1]).slice(0,5).map(e=>e[0]+":"+e[1]).join(", ");
        return "=== A股概况 (" + latest.date.slice(0,4) + "-" + latest.date.slice(4,6) + "-" + latest.date.slice(6,8) + ") ===\n" +
          "涨停 " + total + "家 | 炸板率 " + ((latest.pauseRatio||0)*100).toFixed(0) + "%\n" +
          "题材分布: " + topThemes + "\n" +
          "数据来源: stock.quicktiny.cn";
      }

      case "limit_stats": {
        var ladder = await getLadder();
        var dates = ladder.dates || [];
        var latest = dates[0];
        if (!latest) return null;
        var total = latest.totalStocks || 0;
        var broken = Math.round(total * (latest.pauseRatio || 0));
        var sealRate = total > 0 ? ((total - broken) / total * 100).toFixed(1) : "0";
        return "[quicktiny] " + latest.date.slice(0,4) + "-" + latest.date.slice(4,6) + "-" + latest.date.slice(6,8) + " 涨停统计:\n" +
          "涨停: " + total + "家 | 炸板: " + broken + "家\n封板率: " + sealRate + "%";
      }

      case "limit_up_ladder": {
        var ladder = await getLadder();
        var dates = ladder.dates || [];
        var latest = dates[0];
        if (!latest) return null;
        var byLevel: Record<number, string[]> = {};
        for (var b of latest.boards || []) {
          var lv = b.level || 1;
          if (!byLevel[lv]) byLevel[lv] = [];
          for (var s of b.stocks || []) {
            byLevel[lv].push(s.name + "(" + s.code + ") " + s.change + " 换" + (s.turnover_rate||0).toFixed(1) + "% " + (s.reason_info||"").split("\n")[0]);
          }
        }
        var lines = ["=== 连板天梯 (" + latest.date.slice(0,4) + "-" + latest.date.slice(4,6) + "-" + latest.date.slice(6,8) + ") ==="];
        lines.push("总数: " + latest.totalStocks + "家 | 数据来源: quicktiny");
        var sorted = Object.entries(byLevel).sort((a,b) => Number(b[0]) - Number(a[0]));
        for (var [lv, stocks] of sorted) {
          lines.push(lv + "板 (" + stocks.length + "只): " + stocks.slice(0, 5).join(" | "));
        }
        return lines.join("\n");
      }

      case "broken_limit_up": {
        var ladder = await getLadder();
        var dates = ladder.dates || [];
        var latest = dates[0];
        var brokenStocks: string[] = [];
        for (var b of latest.boards || []) {
          for (var s of b.stocks || []) {
            if (s.open_num && s.open_num > 0) {
              brokenStocks.push(s.name + "(" + s.code + ") 炸" + s.open_num + "次 " + s.change);
            }
          }
        }
        return brokenStocks.length ? "=== 炸板 (" + latest.date + ") ===\n" + brokenStocks.join("\n") : "[quicktiny] 无炸板记录";
      }

      case "limit_down": {
        // quicktiny ladder doesn't directly have limit-down; return note
        return "[quicktiny] 跌停数据需从 market 接口获取，当前 ladder 仅含涨停。建议关注连板天梯中的炸板率参考市场情绪。";
      }

      case "sector_analysis": {
        var period = (args.period as number) || 60;
        var sp = (args.strengthPeriod as number) || 5;
        var resp = await fetch(BASE + "/sector-analysis/quadrant?source=industry&period=" + period + "&strengthPeriod=" + sp);
        var data = await resp.json();
        var quadrants = data.quadrants || {};
        var lines = ["=== 板块分析 ==="];
        var addQ = (label: string, key: string) => {
          var items = quadrants[key] || [];
          if (!items.length) return;
          lines.push("\n## " + label + " (" + items.length + "个)");
          for (var item of items.slice(0, 10)) {
            lines.push(item.name + ": " + item.todayChange.toFixed(2) + "% (周期" + item.periodChange.toFixed(1) + "% | 近" + sp + "日" + item.recentChange.toFixed(1) + "%)");
          }
        };
        addQ("领涨 (高涨幅+高位)", "highStrong");
        addQ("补涨 (低涨幅+高位)", "highWeak");
        addQ("滞涨 (高涨幅+低位)", "lowStrong");
        addQ("领跌 (低涨幅+低位)", "lowWeak");
        return lines.join("\n");
      }

      case "concept_ranking": {
        var ladder = await getLadder();
        var dates = ladder.dates || [];
        var latest = dates[0];
        var themeMap: Record<string, { count: number; stocks: string[] }> = {};
        for (var b of latest.boards || []) {
          for (var s of b.stocks || []) {
            var th = s.primary_theme || "其他";
            if (!themeMap[th]) themeMap[th] = { count: 0, stocks: [] };
            themeMap[th].count++;
            if (themeMap[th].stocks.length < 3) themeMap[th].stocks.push(s.name);
          }
        }
        var sorted = Object.entries(themeMap).sort((a,b) => b[1].count - a[1].count);
        return "=== 概念排行 ===\n" + sorted.slice(0, 20).map(e => e[0] + " (" + e[1].count + "只) " + e[1].stocks.join(",")).join("\n") + "\n数据来源: quicktiny";
      }

      case "capital_flow": {
        var type = (args.type as string) || "sector";
        var resp = await fetch(BASE + "/sector-capital-flow/snapshot");
        var data = await resp.json();
        var rows = data.data?.rows || [];
        var lines = ["=== 板块资金流向 (" + data.data?.tradeDate + ") ==="];
        for (var r of rows.slice(0, 20)) {
          lines.push(r.sectorName + ": " + (r.mainNetAmount/1e8).toFixed(2) + "亿 " + r.pctChg.toFixed(2) + "%");
        }
        return lines.join("\n");
      }

      case "kline": {
        // quicktiny doesn't provide individual stock K-line, fallback to null
        return null;
      }

      case "stock_rank": {
        var ladder = await getLadder();
        var dates = ladder.dates || [];
        var latest = dates[0];
        var stocks: any[] = [];
        for (var b of latest.boards || []) {
          for (var s of b.stocks || []) stocks.push(s);
        }
        stocks.sort((a,b) => (b.change_rate||0) - (a.change_rate||0));
        return "=== 涨幅榜 (涨停股) ===\n" + stocks.slice(0, 15).map((s,i) => (i+1) + ". " + s.name + "(" + s.code + ") " + s.change + " " + (s.reason_type||"")).join("\n");
      }

      case "limit_yesterday_premium": {
        var ladder = await getLadder();
        var dates = ladder.dates || [];
        if (dates.length < 2) return "[quicktiny] 需要至少2天数据";
        var today = dates[0], yesterday = dates[1];
        var yCodes = new Set<string>();
        for (var b of yesterday.boards || []) for (var s of b.stocks || []) yCodes.add(s.code);
        var premiums: number[] = [];
        for (var b of today.boards || []) {
          for (var s of b.stocks || []) {
            if (yCodes.has(s.code)) premiums.push(s.change_rate || 0);
          }
        }
        var avg = premiums.length ? (premiums.reduce((a,b)=>a+b,0)/premiums.length).toFixed(2) : "0";
        return "[quicktiny] 昨日涨停" + yCodes.size + "只 → 今日均值" + avg + "% (" + premiums.length + "只有效)";
      }
    }
  } catch(e) { /* fall through to null */ }
  return null; // 不支持的或失败的返回 null，调用方 fallback
}
