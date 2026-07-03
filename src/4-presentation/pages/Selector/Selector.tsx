/** 表现层 — 条件选股页面 */

import type { FC, ChangeEvent } from "react";
import type { SelectorCriteria } from "@data/dto/selector";
import { STOCK_UP, STOCK_DOWN, STOCK_FLAT } from "@infra/config";
import { formatPrice, formatPercent, formatVolume } from "@infra/utils/format";
import useStockSelector from "@business/selector/useStockSelector";
import PageHeader from "@ui/components/PageHeader";

/** 输入框组件 */
const Field: FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="mb-3">
    <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
    {children}
  </div>
);

/** 数字输入 */
const NumberInput: FC<{
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  step?: string;
}> = ({ value, onChange, placeholder, step }) => (
  <input
    type="number"
    value={value ?? ""}
    step={step ?? "0.01"}
    placeholder={placeholder}
    onChange={(e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val === "" ? undefined : parseFloat(val));
    }}
    className="w-full rounded-lg px-3 py-1.5 text-sm text-white outline-none"
    style={{
      backgroundColor: "var(--board-bg)",
      border: "1px solid var(--board-border)",
    }}
  />
);

/** 排序方式选项 */
const SORT_OPTIONS: { value: SelectorCriteria["sortBy"]; label: string }[] = [
  { value: "changePct", label: "涨跌幅" },
  { value: "volume", label: "成交量" },
  { value: "price", label: "股价" },
];

const Selector: FC = () => {
  const {
    criteria,
    updateCriteria,
    resetCriteria,
    result,
    loading,
    hasSearched,
    search,
  } = useStockSelector();

  const handleSearch = () => {
    void search();
  };

  const changeColor = (pct: number) =>
    pct > 0 ? STOCK_UP : pct < 0 ? STOCK_DOWN : STOCK_FLAT;

  return (
    <div>
      <PageHeader title="条件选股" subtitle="多维度筛选 A 股标的">
        <button
          type="button"
          onClick={resetCriteria}
          className="rounded-lg px-4 py-2 text-sm transition-colors hover:opacity-80"
          style={{
            backgroundColor: "var(--board-card)",
            color: "#e2e8f0",
            border: "1px solid var(--board-border)",
          }}
        >
          重置
        </button>
      </PageHeader>

      <div className="flex gap-6">
        {/* 筛选面板 */}
        <div
          className="w-64 shrink-0 rounded-xl p-4"
          style={{ backgroundColor: "var(--board-card)" }}
        >
          <h3 className="mb-4 text-sm font-bold text-slate-300">筛选条件</h3>

          <Field label="概念关键词">
            <input
              type="text"
              value={criteria.concept ?? ""}
              placeholder="如：人工智能、新能源"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateCriteria({ concept: e.target.value || undefined })
              }
              className="w-full rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              style={{
                backgroundColor: "var(--board-bg)",
                border: "1px solid var(--board-border)",
              }}
            />
          </Field>

          <Field label="最低涨跌幅 (%)">
            <NumberInput
              value={criteria.minChangePct}
              onChange={(v) => updateCriteria({ minChangePct: v })}
              placeholder="如：3"
            />
          </Field>

          <Field label="最高涨跌幅 (%)">
            <NumberInput
              value={criteria.maxChangePct}
              onChange={(v) => updateCriteria({ maxChangePct: v })}
              placeholder="如：10"
            />
          </Field>

          <Field label="最低股价">
            <NumberInput
              value={criteria.minPrice}
              onChange={(v) => updateCriteria({ minPrice: v })}
              placeholder="如：5"
            />
          </Field>

          <Field label="最高股价">
            <NumberInput
              value={criteria.maxPrice}
              onChange={(v) => updateCriteria({ maxPrice: v })}
              placeholder="如：100"
            />
          </Field>

          <Field label="最低量比">
            <NumberInput
              value={criteria.minVolumeRatio}
              onChange={(v) => updateCriteria({ minVolumeRatio: v })}
              placeholder="如：1.5"
            />
          </Field>

          <Field label="排序方式">
            <select
              value={criteria.sortBy ?? "changePct"}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                updateCriteria({
                  sortBy: e.target.value as SelectorCriteria["sortBy"],
                })
              }
              className="w-full rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              style={{
                backgroundColor: "var(--board-bg)",
                border: "1px solid var(--board-border)",
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="排序方向">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateCriteria({ sortOrder: "desc" })}
                className="flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors"
                style={{
                  backgroundColor:
                    criteria.sortOrder === "desc"
                      ? STOCK_UP
                      : "var(--board-bg)",
                  color: criteria.sortOrder === "desc" ? "#fff" : "var(--stock-flat)",
                  border: "1px solid var(--board-border)",
                }}
              >
                降序
              </button>
              <button
                type="button"
                onClick={() => updateCriteria({ sortOrder: "asc" })}
                className="flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors"
                style={{
                  backgroundColor:
                    criteria.sortOrder === "asc"
                      ? STOCK_UP
                      : "var(--board-bg)",
                  color: criteria.sortOrder === "asc" ? "#fff" : "var(--stock-flat)",
                  border: "1px solid var(--board-border)",
                }}
              >
                升序
              </button>
            </div>
          </Field>

          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="mt-2 w-full rounded-lg py-2 text-sm font-bold text-white transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: STOCK_UP }}
          >
            {loading ? "筛选中..." : "开始筛选"}
          </button>
        </div>

        {/* 结果区域 */}
        <div className="min-w-0 flex-1">
          {!hasSearched ? (
            <div
              className="flex h-64 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--board-card)" }}
            >
              <p className="text-slate-500">设置条件后点击「开始筛选」</p>
            </div>
          ) : loading ? (
            <div
              className="flex h-64 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--board-card)" }}
            >
              <p className="text-slate-500">筛选中...</p>
            </div>
          ) : result.stocks.length === 0 ? (
            <div
              className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed"
              style={{
                borderColor: "var(--board-border)",
                backgroundColor: "var(--board-card)",
              }}
            >
              <div className="text-center">
                <p className="text-lg text-slate-400">未找到匹配股票</p>
                <p className="mt-1 text-sm text-slate-600">尝试放宽筛选条件</p>
              </div>
            </div>
          ) : (
            <>
              {/* 结果统计 */}
              <div
                className="mb-3 rounded-lg px-4 py-2 text-sm"
                style={{ backgroundColor: "var(--board-card)" }}
              >
                <span className="text-slate-400">筛选结果：</span>
                <span className="ml-1 font-bold" style={{ color: STOCK_UP }}>
                  {result.total}
                </span>
                <span className="text-slate-400"> 只</span>
              </div>

              {/* 结果表格 */}
              <div
                className="overflow-hidden rounded-xl"
                style={{ backgroundColor: "var(--board-card)" }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b text-left text-xs uppercase text-slate-500"
                      style={{ borderColor: "var(--board-border)" }}
                    >
                      <th className="px-4 py-3">代码</th>
                      <th className="px-4 py-3">名称</th>
                      <th className="px-4 py-3 text-right">最新价</th>
                      <th className="px-4 py-3 text-right">涨跌幅</th>
                      <th className="px-4 py-3 text-right">成交量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.stocks || []).filter(Boolean).map((stock) => (
                      <tr
                        key={stock.code}
                        className="border-b transition-colors hover:bg-white/5"
                        style={{ borderColor: "var(--board-border)" }}
                      >
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {stock.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {stock.name}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-300">
                          {formatPrice(stock.price)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-mono font-bold"
                          style={{ color: changeColor(stock.changePct) }}
                        >
                          {formatPercent(stock.changePct)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">
                          {formatVolume(stock.volume)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Selector;
