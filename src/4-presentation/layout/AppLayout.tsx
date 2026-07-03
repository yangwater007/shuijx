/** 表现层 — 全局应用布局（侧边栏 + 内容区） */

import { NavLink, Outlet } from "react-router-dom";
import type { FC } from "react";

/** 导航项配置 */
const NAV_ITEMS = [
  { path: "/ladder", label: "连板天梯", icon: "📊" },
  { path: "/hot", label: "热榜", icon: "🔥" },
  { path: "/sector-analysis", label: "板块轮动", icon: "🔄" },
  { path: "/selector", label: "条件选股", icon: "🔍" },
  { path: "/themes", label: "题材库", icon: "📚" },
  { path: "/charts", label: "数据可视化", icon: "📈" },
  { path: "/ai", label: "AI 分析", icon: "🤖" },
] as const;

/** 获取 NavLink 样式 */
function getNavClass(isActive: boolean): string {
  const base =
    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors";
  if (isActive) {
    return `${base} bg-red-500/20 text-red-400`;
  }
  return `${base} text-slate-400 hover:bg-slate-800 hover:text-slate-200`;
}

const AppLayout: FC = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <aside
        className="flex h-full w-[220px] shrink-0 flex-col border-r"
        style={{
          backgroundColor: "var(--board-card)",
          borderColor: "var(--board-border)",
        }}
      >
        {/* Logo 区域 */}
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="text-2xl">🐂</span>
          <div>
            <h1 className="text-base font-bold text-white">Stock Platform</h1>
            <p className="text-xs text-slate-500">短线复盘工具</p>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => getNavClass(isActive)}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 底部信息 */}
        <div
          className="border-t px-4 py-3 text-center text-xs"
          style={{ borderColor: "var(--board-border)" }}
        >
          <p className="text-slate-600">数据来源: stock.quicktiny.cn</p>
          <p className="mt-1 text-slate-700">仅供学习参考，不构成投资建议</p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main
        className="flex-1 overflow-y-auto p-6"
        style={{ backgroundColor: "var(--board-bg)" }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
