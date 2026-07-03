# stock.quicktiny.cn/sector-analysis — 文本树形层级结构图

## 数据来源分析
- API: GET /api/sector-analysis/quadrant?source=industry&period=60&strengthPeriod=5
- API: GET /api/sector-analysis/stock-quadrant?source=industry&sector=XXX&period=60&strengthPeriod=5
- JS Bundle: https://static.quicktiny.cn/assets/js/index.12272e22.js
- 页面认证后渲染，以下结构来自 API 数据模型 + JS Bundle 代码模式逆向分析

## 完整 DOM 嵌套层级（100%布局覆盖）

```
└── <div.page-container>                           # 一级：页面容器（深色背景 #0f172a）
    │
    ├── <header.page-header>                       # 二级：页面顶部标题栏
    │   ├── <h1>                                   # 三级：页面标题 "板块轮动"
    │   └── <span.date-label>                      # 三级：数据日期标签 "数据更新: YYYYMMDD"
    │
    ├── <section.filter-toolbar>                   # 二级：筛选工具栏
    │   ├── <div.filter-group>                     # 三级：数据源选择组
    │   │   ├── <span.label>                       # 四级：标签 "数据源"
    │   │   └── <div.btn-group>                    # 四级：按钮组
    │   │       ├── <button>[行业]</button>         # 五级：行业按钮（选中高亮）
    │   │       ├── <button>[概念]</button>         # 五级：概念按钮
    │   │       └── <button>[地区]</button>         # 五级：地区按钮
    │   ├── <div.divider />                        # 三级：垂直分隔线
    │   ├── <div.filter-group>                     # 三级：长周期选择组
    │   │   ├── <span.label>                       # 四级：标签 "周期"
    │   │   └── <div.btn-group>                    # 四级：按钮组
    │   │       ├── <button>[60日]</button>         # 五级
    │   │       ├── <button>[30日]</button>         # 五级
    │   │       ├── <button>[20日]</button>         # 五级
    │   │       ├── <button>[10日]</button>         # 五级
    │   │       └── <button>[5日]</button>          # 五级
    │   ├── <div.divider />                        # 三级：垂直分隔线
    │   ├── <div.filter-group>                     # 三级：短周期强度选择组
    │   │   ├── <span.label>                       # 四级：标签 "强度"
    │   │   └── <div.btn-group>                    # 四级：按钮组
    │   │       ├── <button>[5日强度]</button>      # 五级
    │   │       └── <button>[10日强度]</button>     # 五级
    │   └── <button.refresh>                       # 三级：刷新按钮 "🔄 刷新"
    │
    └── <main.content-area>                        # 二级：主内容区（左右双栏布局）
        │
        ├── <div.left-panel>                       # 三级：左侧面板（flex:1）
        │   │
        │   ├── <section.quadrant-card>            # 四级：象限散点图卡片
        │   │   ├── <div.card-header>              # 五级：卡片头部
        │   │   │   └── <h2>                       # 六级：标题 "板块象限分布 · 近N日涨幅 vs M日涨幅"
        │   │   ├── <div.card-body>                # 五级：卡片主体
        │   │   │   └── <div#quadrant-chart>       # 六级：ECharts 象限散点图容器
        │   │   │       ├── scatter[highStrong]    # 七级：领涨散点（红色#ef4444）
        │   │   │       ├── scatter[highWeak]      # 七级：补涨散点（橙色#f59e0b）
        │   │   │       ├── scatter[lowStrong]     # 七级：滞涨散点（蓝色#3b82f6）
        │   │   │       ├── scatter[lowWeak]       # 七级：领跌散点（绿色#22c55e）
        │   │   │       ├── markLine[xAxis=0]      # 七级：垂直零轴虚线
        │   │   │       └── markLine[yAxis=0]      # 七级：水平零轴虚线
        │   │   └── <div.card-footer>              # 五级：图例说明
        │   │       ├── <div.legend-item>           # 六级：领涨 · 近期强+累计强
        │   │       ├── <div.legend-item>           # 六级：补涨 · 近期弱+累计强
        │   │       ├── <div.legend-item>           # 六级：滞涨 · 近期强+累计弱
        │   │       └── <div.legend-item>           # 六级：领跌 · 近期弱+累计弱
        │   │
        │   └── <section.sector-table-card>        # 四级：板块列表卡片
        │       ├── <div.card-header>              # 五级：卡片头部
        │       │   ├── <h2>                       # 六级：标题 "板块列表 (N个板块)"
        │       │   └── <input.search>             # 六级：搜索框 "搜索板块..."
        │       └── <div.card-body>                # 五级：卡片主体
        │           └── <table.sector-table>       # 六级：板块数据表格
        │               ├── <thead>                # 七级：表头
        │               │   └── <tr>               # 八级：表头行
        │               │       ├── <th>板块</th>   # 九级
        │               │       ├── <th>近N日涨幅</th>
        │               │       ├── <th>今日涨跌</th>
        │               │       ├── <th>累计涨幅</th>
        │               │       ├── <th>量比</th>
        │               │       └── <th>象限</th>
        │               └── <tbody>                # 七级：表体
        │                   └── <tr.sector-row>*    # 八级：板块行（可点击下钻）
        │                       ├── <td>            # 九级：板块名 + 股票数
        │                       ├── <td>            # 九级：近N日涨幅（涨红跌绿）
        │                       ├── <td>            # 九级：今日涨跌
        │                       ├── <td>            # 九级：累计涨幅
        │                       ├── <td>            # 九级：量比数值
        │                       └── <td>            # 九级：象限标签（彩色圆角pill）
        │
        └── <div.right-panel>                      # 三级：右侧面板（固定宽380px）
            │
            ├── <section.fund-flow-card>           # 四级：资金流向卡片
            │   ├── <div.card-header>              # 五级：卡片头部
            │   │   └── <h2>                       # 六级：标题 "板块资金流向"
            │   └── <div.card-body>                # 五级：卡片主体
            │       └── <div.placeholder>           # 六级：桑基图占位 "开发中"
            │
            └── <section.stock-quadrant-card>      # 四级：个股象限卡片
                ├── <div.card-header>              # 五级：卡片头部
                │   ├── <h2>                       # 六级：标题 "板块名 — 个股分布 (N只)"
                │   └── <span.placeholder>          # 六级：未选中时提示 "点击左侧板块查看"
                └── <div.card-body>                # 五级：卡片主体
                    └── <table.stock-table>        # 六级：个股数据表格
                        ├── <thead>                # 七级：表头
                        │   └── <tr>               # 八级
                        │       ├── <th>股票</th>   # 九级
                        │       ├── <th>近N日涨幅</th>
                        │       ├── <th>今日涨跌</th>
                        │       └── <th>象限</th>
                        └── <tbody>                # 七级：表体
                            └── <tr.stock-row>*     # 八级：个股行（最多30行）
                                ├── <td>            # 九级：股票名 + 代码
                                ├── <td>            # 九级：近N日涨幅
                                ├── <td>            # 九级：今日涨跌
                                └── <td>            # 九级：象限标签
```

## 图例说明
- `*` 标记表示循环渲染的动态行
- `[内容]` 表示文本内容
- 层级数字说明：
  - 一级：整个页面容器
  - 二级：三大功能板块（标题栏/工具栏/内容区）
  - 三级：左右分区 / 筛选组
  - 四级：独立卡片容器
  - 五级：卡片头部/主体/底部
  - 六级：具体UI元素（标题/搜索框/表格）
  - 七级：表格结构（thead/tbody）
  - 八级：表格行
  - 九级：表格单元格

## 数据映射
- 象限图 X轴: API.quadrants[].recentChange (近N日涨幅)
- 象限图 Y轴: API.quadrants[].periodChange (累计M日涨幅)
- 象限图 Tooltip: name, todayChange, volumeRatio, positionInRange, quadrant
- 板块表: API flatten → name, recentChange, todayChange, periodChange, volumeRatio, stockCount, quadrant
- 个股表: API /stock-quadrant → name, code, recentChange, todayChange, periodChange, 按坐标自动分象限
