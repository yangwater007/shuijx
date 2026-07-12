/**
 * AppLayout — responsive layout
 * Desktop: fixed sidebar 220px
 * Mobile: tap hamburger → drawer overlay + bottom tab bar
 */

import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, type FC } from "react";

const NAV_ITEMS = [
  { path: "/ladder", label: "连板天梯", icon: "📊" },
  { path: "/hot", label: "热榜", icon: "🔥" },
  { path: "/sector-analysis", label: "板块轮动", icon: "🔄" },
  { path: "/dragon-tiger", label: "龙虎榜", icon: "🐉" },
  { path: "/selector", label: "条件选股", icon: "🔍" },
  { path: "/themes", label: "题材库", icon: "📚" },
  { path: "/charts", label: "可视化", icon: "📈" },
  { path: "/ai", label: "AI分析", icon: "🤖" },
] as const;

const linkBase = "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150";

function SideNavLink({ path, label, icon }: { path: string; label: string; icon: string }) {
  return (
    <NavLink to={path} className={({ isActive }) =>
      linkBase + " px-4 py-2.5 " + (isActive ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
    }>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function BottomTab({ path, label, icon }: { path: string; label: string; icon: string }) {
  return (
    <NavLink to={path} className={({ isActive }) =>
      "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors duration-150 " +
      (isActive ? "text-red-400" : "text-slate-500")
    }>
      <span className="text-lg">{icon}</span>
      <span className="truncate max-w-[48px]">{label}</span>
    </NavLink>
  );
}

const AppLayout: FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden md:flex h-full w-[220px] shrink-0 flex-col border-r"
        style={{ backgroundColor: "var(--board-card)", borderColor: "var(--board-border)" }}>
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="text-2xl">🐂</span>
          <div><h1 className="text-base font-bold text-white">Stock Platform</h1><p className="text-xs text-slate-500">短线复盘工具</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => <SideNavLink key={item.path} {...item} />)}
        </nav>
        <div className="border-t px-4 py-3 text-center text-xs" style={{ borderColor: "var(--board-border)" }}>
          <p className="text-slate-600">数据: stock.quicktiny.cn</p>
        </div>
      </aside>

      {/* ═══ MOBILE DRAWER ═══ */}
      <div className={"md:hidden fixed inset-0 z-50 transition-opacity duration-200 " + (drawerOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div className={"absolute inset-0 bg-black/60 transition-opacity duration-200 " + (drawerOpen ? "opacity-100" : "opacity-0")}
          onClick={closeDrawer} />
        <div className={"absolute left-0 top-0 h-full w-[260px] transition-transform duration-200 ease-out " + (drawerOpen ? "translate-x-0" : "-translate-x-full")}
          style={{ backgroundColor: "var(--board-card)", boxShadow: "4px 0 20px rgba(0,0,0,0.5)" }}
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: "var(--board-border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐂</span>
              <div><h1 className="text-base font-bold text-white">Stock Platform</h1><p className="text-[10px] text-slate-500">短线复盘工具</p></div>
            </div>
            <button onClick={closeDrawer} className="rounded-lg p-2.5 text-slate-400 hover:bg-white/10 active:bg-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <nav className="space-y-0.5 px-3 py-3">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path} onClick={closeDrawer}
                className={({ isActive }) => linkBase + " px-4 py-3 " + (isActive ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t px-4 py-3 text-[10px] text-center" style={{ borderColor: "var(--board-border)", color: "#4a6a8a" }}>
            stock.quicktiny.cn
          </div>
        </div>
      </div>

      {/* ═══ MOBILE TOP BAR ═══ */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: "var(--board-card)", borderBottom: "1px solid var(--board-border)" }}>
        <button onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2.5 -ml-1 text-slate-300 hover:bg-white/10 active:bg-white/15 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">🐂</span>
          <h1 className="text-sm font-bold text-white">Stock Platform</h1>
        </div>
        <div className="w-9" />
      </div>

      {/* ═══ MAIN + BOTTOM NAV ═══ */}
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-y-auto p-2 md:p-6 pb-20 md:pb-6"
          style={{ backgroundColor: "var(--board-bg)" }}>
          <Outlet />
        </main>
        <nav className="md:hidden flex items-center justify-around border-t pb-safe"
          style={{ backgroundColor: "var(--board-card)", borderColor: "var(--board-border)" }}>
          {NAV_ITEMS.slice(0, 5).map((item) => <BottomTab key={item.path} {...item} />)}
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
