# TodoTime

TodoTime 是一个本地优先的个人番茄钟与任务管理工具。没有识别码时可纯本地使用；启用个人同步识别码后，任务、设置和统计数据会同步到独立的 GitHub 私有数据仓库。

## 核心能力

- 番茄工作、短休息、长休息循环，可自定义时长和长休息间隔。
- 主任务、子任务、板块分类、完成、放弃、恢复、软删除和历史归档。
- 专注记录按结束当时的任务归属；未选任务时可在轮次结束后分配。
- 今日、近七天、近一个月统计，以及周报、月报和板块占比。
- 每个个人同步识别码拥有完全隔离的本地缓存和云端 JSON 数据。
- 本地离线优先，恢复网络后自动合并；同一条任务按 `updatedAt` 较新版本获胜。

详细规则见 [功能说明](docs/FEATURES.md)，当前验证结果见 [测试报告](docs/TEST_REPORT.md)。

## 数据与安全

- `Fallme/todotime`：程序代码，不保存个人任务数据。
- `Fallme/todotime_data`：Private 数据仓库，保存用户配置和统计历史。
- 云端目录：`profiles/<识别码哈希>/config.json` 与 `profiles/<识别码哈希>/history.json`。
- 服务端以 SHA-256 哈希后的目录区分用户，不把原始识别码写入仓库。
- GitHub Token 只存在于 Vercel 服务端环境变量，前端无法读取。
- 识别码本身相当于个人数据访问凭证，无法找回，不应公开分享。

## 同步节奏

- 设置或任务编辑：停止编辑 2.5 秒后合并同步。
- 专注历史：记录变化 1.5 秒后合并同步。
- 页面保持可见：每 2 分钟检查配置，每 10 分钟刷新统计历史。
- 返回页面：配置检查最多每分钟一次，统计历史最多每 10 分钟一次。
- 内容没有变化时不提交 Git，避免产生无意义版本。

## 部署变量

在 Vercel 项目中配置：

```text
GITHUB_TOKEN=<仅有 todotime_data Contents 读写权限的 fine-grained token>
GITHUB_DATA_REPO=Fallme/todotime_data
```

前端和 API 分属不同域名时，可额外配置：

```text
SYNC_ALLOWED_ORIGIN=https://your-todotime-domain.example
```

## 本地开发与验证

```bash
npm install
npm run dev
npm test
```

`npm test` 会依次执行代码检查、前端生产构建和服务端 API 类型检查。

线上地址：[https://todotime-mauve.vercel.app/](https://todotime-mauve.vercel.app/)
