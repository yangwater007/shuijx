# -*- coding: utf-8 -*-
"""sync_concepts.py v4 — 东方财富概念板块同步 (最终版)
======================================================
修复: ON CONFLICT DO UPDATE category='em' 确保已存在概念也被处理
"""
import sys, os, time, argparse, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, r"D:\quicktiny")
from ths_bridge_v3 import _pg_exec, HAS_PG
import logging
logging.basicConfig(level=logging.INFO, format="[SYNC] %(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("sync")

EM = "https://push2delay.eastmoney.com"
S = requests.Session()
S.headers.update({"User-Agent": "Mozilla/5.0", "Referer": "https://wap.eastmoney.com/"})

def get_all_concepts():
    all_items = []
    for pn in range(1, 10):
        r = S.get(f"{EM}/api/qt/clist/get", params={
            "pn": str(pn), "pz": "100", "po": "1", "np": "1",
            "fltt": "2", "invt": "2", "fid": "f3", "fs": "m:90+t:3",
            "fields": "f12,f14",
        }, timeout=10)
        items = r.json().get("data", {}).get("diff", [])
        if not items: break
        all_items.extend(items)
        if len(items) < 100: break
    log.info(f"获取 {len(all_items)} 个概念板块")
    return [(it["f12"], it["f14"]) for it in all_items]

def get_stocks(code):
    r = S.get(f"{EM}/api/qt/clist/get", params={
        "pn": "1", "pz": "500", "po": "1", "np": "1",
        "fltt": "2", "invt": "2", "fid": "f3", "fs": f"b:{code}",
        "fields": "f12",
    }, timeout=10)
    return [it["f12"] for it in r.json().get("data", {}).get("diff", [])]

def sync_one(code, name):
    try:
        stocks = get_stocks(code)
        if not stocks: return (name, 0)
        # Upsert concept (overwrite category to em)
        _pg_exec("INSERT INTO base_concepts (concept_name, category) VALUES (%s,'em') ON CONFLICT (concept_name) DO UPDATE SET category='em'", (name,))
        rows = _pg_exec("SELECT concept_id FROM base_concepts WHERE concept_name=%s", (name,))
        if not rows: return (name, 0)
        cid = rows[0]["concept_id"]
        n = 0
        for sc in stocks:
            try:
                _pg_exec("INSERT INTO base_stock_concepts (code, concept_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (sc, cid))
                n += 1
            except: pass
        return (name, n)
    except Exception as e:
        return (name, 0)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--workers", type=int, default=8)
    p.add_argument("--limit", type=int, default=0)
    args = p.parse_args()

    if not HAS_PG: log.error("PostgreSQL required"); return

    concepts = get_all_concepts()
    if args.limit > 0: concepts = concepts[:args.limit]

    ok, fail, total = 0, 0, 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(sync_one, c, n): n for c, n in concepts}
        for i, f in enumerate(as_completed(futs)):
            name, cnt = f.result()
            if cnt > 0: ok += 1; total += cnt
            else: fail += 1
            done = i + 1
            if done % 50 == 0 or done == len(concepts):
                log.info(f"进度: {done}/{len(concepts)} | OK:{ok} FAIL:{fail} | 映射:{total} | {time.time()-t0:.0f}s")

    elapsed = time.time() - t0
    log.info(f"完成! {elapsed:.0f}s | 概念:{ok}/{len(concepts)} | 映射:{total} | 均:{total//max(ok,1)}只")

if __name__ == "__main__":
    main()
