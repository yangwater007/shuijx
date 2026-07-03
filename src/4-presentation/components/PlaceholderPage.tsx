/** 表现层 — 占位页面组件（用于未实现的模块） */

import PageHeader from "@ui/components/PageHeader";
import type { FC } from "react";

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div>
      <PageHeader title={title} />
      <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed"
        style={{ borderColor: "var(--board-border)", backgroundColor: "var(--board-card)" }}
      >
        <p className="text-center text-slate-500">
          <span className="block text-4xl mb-2">🚧</span>
          <span className="text-lg">模块开发中</span>
          <span className="block mt-1 text-sm">敬请期待</span>
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
