/** 表现层 — 应用路由配置 */

import { createHashRouter, Navigate } from "react-router-dom";
import AppLayout from "@ui/layout/AppLayout";
import LadderPage from "@ui/pages/market/LadderPage/LadderPage";
import SectorAnalysisPage from "@ui/pages/market/SectorAnalysis/SectorAnalysisPage";
import HotList from "@ui/pages/HotList/HotList";
import Selector from "@ui/pages/Selector/Selector";
import ThemeLibrary from "@ui/pages/ThemeLibrary/ThemeLibrary";
import Charts from "@ui/pages/Charts/Charts";
import AIAnalysis from "@ui/pages/AIAnalysis/AIAnalysis";
import DragonTigerBoard from "@ui/pages/DragonTiger/DragonTigerBoard";

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/ladder" replace /> },
      { path: "ladder", element: <LadderPage /> },
      { path: "hot", element: <HotList /> },
      { path: "selector", element: <Selector /> },
      { path: "themes", element: <ThemeLibrary /> },
      { path: "ai", element: <AIAnalysis /> },
      { path: "charts", element: <Charts /> },
      { path: "sector-analysis", element: <SectorAnalysisPage /> },
      { path: "dragon-tiger", element: <DragonTigerBoard /> },
    ],
  },
]);

export default router;
