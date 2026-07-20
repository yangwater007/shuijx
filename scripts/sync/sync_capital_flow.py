"""
sync_capital_flow.py - 从东财获取板块资金流向写入 Supabase
数据源: push2.eastmoney.com
"""
import psycopg2, json, urllib.request, ssl
from datetime import date

POOLER_URL = "postgresql://postgres.qzqpymvboltyvddpmpct:UNqPsVDtDQ27jtD1@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
EASTMONEY_URL = "https://push2.eastmoney.com/api/qt/clist/get"

def fetch_sector_flow():
    """拉取板块资金流向 TOP50"""
    params = {
        "pn": "1", "pz": "50", "po": "1", "np": "1",
        "fltt": "2", "invt": "2", "fid": "f62",
        "fs": "m:90+t:2",
        "fields": "f2,f3,f12,f14,f62,f184,f66,f69,f70,f72,f74"
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{EASTMONEY_URL}?{qs}"
    
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://data.eastmoney.com/"
    })
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    items = data.get("data", {}).get("diff", [])
    results = []
    for item in items:
        results.append({
            "code": str(item.get("f12", "")),
            "name": str(item.get("f14", "")),
            "change_pct": float(item.get("f3", 0) or 0),
            "main_net_in": int(float(item.get("f62", 0) or 0)),
            "main_net_in_pct": float(item.get("f184", 0) or 0),
            "super_large_net_in": int(float(item.get("f66", 0) or 0)),
            "large_net_in": int(float(item.get("f69", 0) or 0)),
            "mid_net_in": int(float(item.get("f70", 0) or 0)),
            "small_net_in": int(float(item.get("f72", 0) or 0)),
        })
    return results

def main():
    conn = psycopg2.connect(POOLER_URL, connect_timeout=10)
    cur = conn.cursor()
    
    today = date.today().isoformat()
    print(f"Fetching sector capital flow for {today}...")
    
    try:
        items = fetch_sector_flow()
    except Exception as e:
        print(f"ERROR fetching: {e}")
        cur.close(); conn.close()
        return
    
    if not items:
        print("No data returned")
        cur.close(); conn.close()
        return
    
    count = 0
    for item in items:
        cur.execute("""
            INSERT INTO sector_capital_flow 
            (trade_date, sector_code, sector_name, main_net_in, main_net_in_pct,
             super_large_net_in, large_net_in, mid_net_in, small_net_in, change_pct)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (trade_date, sector_code) DO UPDATE SET
                main_net_in=EXCLUDED.main_net_in,
                main_net_in_pct=EXCLUDED.main_net_in_pct,
                super_large_net_in=EXCLUDED.super_large_net_in,
                large_net_in=EXCLUDED.large_net_in,
                mid_net_in=EXCLUDED.mid_net_in,
                small_net_in=EXCLUDED.small_net_in,
                change_pct=EXCLUDED.change_pct
        """, (today, item["code"], item["name"], item["main_net_in"],
              item["main_net_in_pct"], item["super_large_net_in"],
              item["large_net_in"], item["mid_net_in"], item["small_net_in"],
              item["change_pct"]))
        count += 1
    
    conn.commit()
    print(f"Inserted/Updated {count} sector capital flow records")
    cur.close(); conn.close()

if __name__ == "__main__":
    main()
