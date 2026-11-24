# TodoTime server data API

TodoTime 的用户数据已经从 GitHub 私有数据仓库迁到自建服务器。服务器实现与 Vercel 的 `/api/file`、`/api/developer` 接口兼容，前端只需把 `VITE_API_BASE` 指向本服务即可。

## 数据落盘

- 默认目录：`/home/ubuntu/apps/todotime/data`
- 每个同步码对应一个 `profiles/<sha256(code).slice(0,24)>/` 目录
- 文件：`config.json`、`history.json`、`feedback.json`
- 写入保持 GitHub 风格的 SHA（git blob sha1），用于 409 冲突检测

## 环境变量

- `PORT`：默认 `3010`
- `HOST`：默认 `127.0.0.1`（由 Caddy 反代）
- `DATA_DIR`：默认 `/home/ubuntu/apps/todotime/data`
- `ALLOWED_ORIGIN`：默认 `https://todotime-mauve.vercel.app`
- `DEVELOPER_SYNC_CODE_HASH`：可选，覆盖开发者同步码哈希

## Caddy 反代

```caddyfile
aimemo.online, www.aimemo.online {
	handle_path /todotime-api/* {
		reverse_proxy 127.0.0.1:3010
	}
	# ...其他路由
}
```

对外 API 基址：

```text
https://aimemo.online/todotime-api
```

## systemd

```ini
[Unit]
Description=TodoTime Data API (server storage)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/apps/todotime
Environment=NODE_ENV=production
Environment=PORT=3010
Environment=HOST=127.0.0.1
Environment=DATA_DIR=/home/ubuntu/apps/todotime/data
Environment=ALLOWED_ORIGIN=https://todotime-mauve.vercel.app
ExecStart=/usr/bin/node /home/ubuntu/apps/todotime/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

## 迁移说明

前端 `src/services/github.ts` 在首次读/写时会做一次兼容迁移：

1. 从旧 Vercel/GitHub API 读取 `config.json`、`history.json`、`feedback.json`
2. 服务器已有数据时跳过，不覆盖
3. 服务器缺失时写入服务器
4. 旧 API 不可达时最多等待约 3 秒，之后正常走服务器数据，60 秒后重试

## 备份

服务器数据目录可直接打包备份：

```bash
tar czf ~/todotime-data-$(date +%F).tar.gz -C /home/ubuntu/apps/todotime data
```
