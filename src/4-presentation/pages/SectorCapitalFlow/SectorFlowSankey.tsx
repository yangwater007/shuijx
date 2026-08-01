/**
 * 板块资金桑基图 — 复刻 quicktiny CapitalFlowSankey
 * 展示资金从板块→个股的流向关系
 */
import { useMemo, type FC } from "react";
import { Sankey, Tooltip, Rectangle, ResponsiveContainer } from "recharts";
import type { SectorCapitalFlowRow, SectorConstituent } from "@data/dto/sectorCapitalFlow";

interface SankeyNode {
  name: string;
  category?: string;
  itemStyle?: { color: string };
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface Props {
  sectorRows: SectorCapitalFlowRow[];
  constituents?: Record<string, SectorConstituent[]>;
  onSectorClick?: (code: string) => void;
}

const COLORS = {
  inflow: "#ef4444",
  outflow: "#22c55e",
  neutral: "#6b7280",
  sectorStart: "#f6b26b",
  sectorEnd: "#3b82f6",
};

const SectorFlowSankey: FC<Props> = ({ sectorRows, constituents, onSectorClick }) => {
  const { nodes, links } = useMemo(() => {
    const nodeList: SankeyNode[] = [];
    const linkList: SankeyLink[] = [];
    const nodeIndex: Record<string, number> = {};

    const addNode = (name: string, color: string) => {
      if (nodeIndex[name] === undefined) {
        nodeIndex[name] = nodeList.length;
        nodeList.push({ name, itemStyle: { color } });
      }
      return nodeIndex[name];
    };

    // Top 10 sectors by absolute net amount
    const topSectors = [...sectorRows]
      .sort((a, b) => Math.abs(b.mainNetAmount) - Math.abs(a.mainNetAmount))
      .slice(0, 10);

    // Source: "市场资金"
    const marketIdx = addNode("市场资金", COLORS.neutral);

    // Sector nodes
    for (const row of topSectors) {
      const color = row.mainNetAmount >= 0 ? COLORS.inflow : COLORS.outflow;
      const sectorIdx = addNode(row.sectorName + " ↑", color);
      linkList.push({
        source: marketIdx,
        target: sectorIdx,
        value: Math.abs(row.mainNetAmount),
      });

      // If we have constituents, add stock nodes
      if (constituents && row.sectorCode && constituents[row.sectorCode]) {
        const stocks = constituents[row.sectorCode]!
          .sort((a, b) => Math.abs(b.mainNetAmount) - Math.abs(a.mainNetAmount))
          .slice(0, 5);
        for (const stock of stocks) {
          const stockIdx = addNode(stock.stockName, stock.mainNetAmount >= 0 ? COLORS.inflow : COLORS.outflow);
          linkList.push({
            source: sectorIdx,
            target: stockIdx,
            value: Math.abs(stock.mainNetAmount),
          });
        }
      }
    }

    return { nodes: nodeList, links: linkList };
  }, [sectorRows, constituents]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "#6b7280" }}>
        暂无桑基图数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={420}>
      <Sankey
        data={{ nodes, links }}
        nodePadding={20}
        nodeWidth={16}
        linkCurvature={0.6}
        margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
        node={({ payload, x, y, width, height }) => (
          <g onClick={() => payload.name.includes("↑") && onSectorClick?.(payload.name)}>
            <Rectangle x={x} y={y} width={width} height={height} fill={(payload as any).itemStyle?.color || "#6b7280"} fillOpacity={0.85} rx={2} />
            <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#9aaec9" fontSize={11}>
              {payload.name.replace(" ↑", "")}
            </text>
          </g>
        )}
        link={({ payload, sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth }) => (
          <g>
            <path
              d={`
                M${sourceX},${sourceY}
                C${sourceControlX},${sourceY}
                 ${targetControlX},${targetY}
                 ${targetX},${targetY}
              `}
              fill="none"
              stroke={(payload.source as any)?.itemStyle?.color || COLORS.neutral}
              strokeOpacity={0.25}
              strokeWidth={Math.max(1, linkWidth)}
            />
          </g>
        )}
      >
        <Tooltip
          contentStyle={{
            backgroundColor: "#131a24",
            border: "1px solid #1e2a36",
            borderRadius: 8,
            fontSize: 12,
            color: "#e8edf5",
          }}
          formatter={(value: any) => [(value / 1e8).toFixed(2) + " 亿", "净额"]}
        />
      </Sankey>
    </ResponsiveContainer>
  );
};

export default SectorFlowSankey;
