# 压铸工具箱 (Die-Casting Toolkit)

基于 `React + TypeScript + Vite` 的压铸业务工具平台，包含设备管理、AI 知识问答、知识库文件管理与文档检索能力。

## 核心能力
- 压铸设备数据管理与可视化展示
- AI 知识问答（支持百炼与 OpenAI 兼容接口）
- 知识库文件管理（上传、预览、下载、元数据维护）
- RBAC 权限控制与 JWT 认证

## 知识库全文检索（当前实现）
- 检索范围：**单文档预览内全文检索**（不是全库跨文档检索）
- 支持类型：
  - `PDF`（文本层 + OCR）
  - 图片（OCR）
  - `txt / md / markdown`
  - `docx`（`.doc` 暂不支持）
- 索引策略：
  - 上传后异步建立索引
  - 支持索引状态查询与手动重建
- 预览与定位：
  - PDF 使用浏览器原生预览器（稳定优先）
  - 搜索命中可按页跳转（通过 `#page=`）

## 技术栈
- 前端：React 19、TypeScript、Vite、Ant Design
- 后端：Node.js、Express、JSON 文件存储
- 鉴权：JWT、bcryptjs
- 文档处理：
  - Node: `mammoth`（docx 文本抽取）
  - Python: `pymupdf`、`rapidocr-onnxruntime`、`Pillow`（OCR/抽取）

## 项目结构
```text
src/
  components/          # 通用组件
  core/                # 核心能力（认证、路由、工具注册等）
  pages/               # 页面
    AIKnowledgeBase/   # AI 问答
    KnowledgeBase/     # 知识库
  tools/               # 工具模块注册
server/
  config/              # 服务端配置
  controllers/         # 接口控制器
  routes/              # 路由
  services/            # 业务服务（含索引服务）
  python/              # OCR/文本抽取脚本与依赖清单
  indexes/             # 文档索引文件
  uploads/             # 上传文件
```

## 本地开发
```powershell
# 安装依赖
npm install

# 开发模式（前端 + 后端）
npm run mode:dev
npm run start:mode

# 代码检查
npm run check

# 构建
npm run build
```

## OCR 依赖安装（知识库全文检索必需）
```powershell
python -m pip install -r server/python/requirements.txt
```

若未安装上述依赖，PDF/图片 OCR 索引会失败。

## 生产运行
```powershell
# 本地生产启动（需先 build）
npm start
```

服务器部署参考：[DEPLOYMENT.md](./DEPLOYMENT.md)

## 已实现的检索接口
- `GET /api/library/files/:id/search-status`
- `GET /api/library/files/:id/search?q=关键词&limit=200`
- `POST /api/library/files/:id/reindex`（管理员）
