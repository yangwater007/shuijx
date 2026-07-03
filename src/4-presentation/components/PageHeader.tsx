/** 表现层 — 页面标题栏组件 */

import type { FC, ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** 右侧操作区 */
  children?: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm opacity-60">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};

export default PageHeader;
