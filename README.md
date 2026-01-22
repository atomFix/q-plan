<div align="center">
  <h1>Q-Plan</h1>
  <p>现代化的工作计划与任务可视化仪表板</p>
  <p>基于 React 的交互式日历网格视图，支持组织层级导航、任务过滤和数据分析</p>
</div>

## ✨ 特性

- **交互式日历网格** - 在直观的网格布局中可视化员工在多个日期的任务
- **组织层级导航** - 通过递归树结构浏览部门和团队
- **高级过滤功能** - 按优先级（P0-P3）、状态、文本搜索和团队成员过滤任务
- **多日任务合并** - 连续多天的任务自动合并为单个区块，避免重叠
- **智能缓存策略** - 基于LocalStorage的缓存，带智能失效规则
- **深色/浅色主题** - 精美的背景图片，支持主题切换
- **响应式设计** - 移动端优化的界面，可折叠侧边栏
- **任务数据分析** - 统计面板，提供图表和指标
- **右键菜单** - 快速访问PMO链接和任务详情

## 🛠️ 技术栈

- **React 19** - 最新版本，自动JSX运行时
- **TypeScript** - 类型安全开发
- **Vite** - 快速构建工具和开发服务器
- **Tailwind CSS** - 实用优先的CSS框架（通过CDN）
- **Recharts** - 数据可视化图表库
- **Lucide React** - 现代化图标库

## 📋 前置要求

- Node.js 18+
- npm 或 yarn 包管理器

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/atomFix/q-plan.git
cd q-plan

# 安装依赖
npm install
```

### 环境配置

在根目录创建 `.env` 文件：

```env
GEMINI_API_KEY=your_api_key_here
```

> **注意**：应用当前使用 `services/mockData.ts` 中的模拟数据，API集成是可选的。

### 开发

```bash
# 启动开发服务器（运行在 http://localhost:3000）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目结构

```
q-plan/
├── App.tsx                 # 主应用，包含所有状态管理
├── Components/
│   ├── OrgTree.tsx         # 递归组织树导航
│   ├── TaskCard.tsx        # 单个任务展示卡片
│   ├── StatsPanel.tsx      # 统计面板与图表
│   ├── DailyTaskPopup.tsx  # 今日任务欢迎弹窗
│   └── ParticleBackground.tsx  # 动画背景效果
├── Services/
│   ├── apiService.ts       # 数据获取与缓存逻辑
│   └── mockData.ts         # 模拟数据源
├── Utils/
│   └── dateUtils.ts        # 日期工具和列生成
├── Types.ts                # TypeScript 接口和类型
├── index.html              # HTML 入口
└── vite.config.ts          # Vite 配置
```

## 🎯 核心功能说明

### 任务合并算法

跨越连续多天的任务会自动合并为单个区块，使用基于车道的布局算法防止同一行中的任务重叠。

### 缓存策略

应用在 `apiService.ts` 中实现了智能缓存系统：
- **7天过期** 缓存数据
- **周四规则**：如果不是今天创建的缓存，在周四会被视为过期
- **基于路径的缓存**：每个组织路径独立缓存

### 日期导航

日历使用居中日期范围系统，`centerDate` 决定可见范围，支持可配置偏移和可选的周末跳过。

## 💾 本地存储键

- `qodin_my_rtx` - 当前用户的 RTX ID
- `qodin_my_path` - 找到用户的组织路径
- `qodin_last_path` - 最后选择的组织路径
- `qodin_theme_dark` - 深色模式偏好
- `qodin_plan_cache_{path}` - 每个路径的缓存计划数据
- `qodin_rel_cache_{path}` - 每个路径的缓存组织关系数据

## 🌐 浏览器支持

- Chrome（推荐）
- Firefox
- Safari
- Edge

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 🔗 相关链接

- **GitHub 仓库**：https://github.com/atomFix/q-plan
- **问题反馈**：https://github.com/atomFix/q-plan/issues

---

使用 React 和 Vite 构建
