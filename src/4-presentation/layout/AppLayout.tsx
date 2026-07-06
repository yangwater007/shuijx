/**
 * AppLayout — responsive application layout
 * Desktop: fixed sidebar 220px + content area
 * Mobile: hamburger drawer overlay + bottom tab bar
 */

import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, type FC } from "react";

const NAV_ITEMS = [
  { path: "/ladder", label: "连板天梯", icon: "📊" },
  { path: "/hot", label: "热榜", icon: "🔥" },
  { path: "/sector-analysis", label: "板块轮动", icon: "🔄" },
  { path: "/selector", label: "条件选股", icon: "🔍" },
  { path: "/themes", label: "题材库", icon: "📚" },
  { path: "/charts", label: "数据可视化", icon: "📈" },
  { path: "/ai", label: "AI 分析", icon: "🤖" },
] as const;

/** Desktop sidebar nav link */
function SideNavLink({ path, label, icon }: { path: string; label: string; icon: string }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors " +
        (isActive ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
      }
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

/** Mobile bottom tab bar link */
function BottomTab({ path, label, icon }: { path: string; label: string; icon: string }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        "flex flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors " +
        (isActive ? "text-red-400" : "text-slate-500")
      }
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

const AppLayout: FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside
        className="hidden md:flex h-full w-[220px] shrink-0 flex-col border-r"
        style={{ backgroundColor: "var(--board-card)", borderColor: "var(--board-border)" }}
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="text-2xl">🐂</span>
          <div>
            <h1 className="text-base font-bold text-white">Stock Platform</h1>
            <p className="text-xs text-slate-500">短线复盘工具</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <SideNavLink key={item.path} {...item} />
          ))}
        </nav>

        <div className="border-t px-4 py-3 text-center text-xs" style={{ borderColor: "var(--board-border)" }}>
          <p className="text-slate-600">数据来源: stock.quicktiny.cn</p>
          <p className="mt-1 text-slate-700">仅供学习参考</p>
        </div>
      </aside>

      {/* ==================== MOBILE DRAWER OVERLAY ==================== */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setDrawerOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 h-full w-[240px] animate-slide-in"
            style={{ backgroundColor: "var(--board-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐂</span>
                <div>
                  <h1 className="text-base font-bold text-white">Stock Platform</h1>
                  <p className="text-xs text-slate-500">短线复盘工具</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-1 px-3 py-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors " +
                    (isActive ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ==================== MOBILE TOP BAR ==================== */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-2.5 border-b"
        style={{ backgroundColor: "var(--board-card)", borderColor: "var(--board-border)" }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">🐂</span>
          <h1 className="text-sm font-bold text-white">Stock Platform</h1>
        </div>
        <div className="w-8" /> {/* spacer for centering */}
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex flex-col flex-1 min-w-0">
        <main
          className="flex-1 overflow-y-auto p-3 md:p-6 pb-16 md:pb-6"
          style={{ backgroundColor: "var(--board-bg)" }}
        >
          <Outlet />
        </main>

        {/* ==================== MOBILE BOTTOM TAB BAR ==================== */}
        <nav
          className="md:hidden flex items-center justify-around border-t pb-safe"
          style={{ backgroundColor: "var(--board-card)", borderColor: "var(--board-border)" }}
        >
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <BottomTab key={item.path} {...item} />
          ))}
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
