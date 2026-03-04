# 部署说明（无 Docker）

## 1. 服务器准备
- 系统：Ubuntu 22.04+
- 域名 A 记录已指向服务器公网 IP
- 防火墙开放：`22`、`80`、`443`

首次安装依赖：

```bash
sudo bash scripts/install-server.sh
```

## 2. 项目与环境变量

进入项目目录后，编辑 `.env.prod`：

```env
APP_MODE=prod
NODE_ENV=production
PORT=3001
JWT_SECRET=replace-with-strong-secret
CORS_ORIGIN=https://your-domain.com
LIBRARY_MAX_FILE_MB=150
LIBRARY_TOTAL_MAX_MB=2048
LIBRARY_INDEX_TIMEOUT_SEC=1800
VITE_API_BASE_URL=/api
APP_DOMAIN=your-domain.com
APP_DIR=/opt/diecasting-app
```

注意：
- `JWT_SECRET` 必须替换为强随机密钥。
- `CORS_ORIGIN` 必须为你的正式域名（可逗号分隔多个域名）。
- `LIBRARY_MAX_FILE_MB` 为知识库单文件上传上限（MB），需与 Nginx `client_max_body_size` 对齐。
- `LIBRARY_TOTAL_MAX_MB` 为知识库总容量上限（MB），超过后新上传会被拒绝。
- `LIBRARY_INDEX_TIMEOUT_SEC` 为单个文件索引超时（秒），大文件/OCR场景建议设置为 `1800` 或更高。

## 3. Nginx 反向代理

将 `deploy/nginx.conf` 复制到 `/etc/nginx/sites-available/your-domain.com`，并启用：

```bash
sudo ln -sf /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/your-domain.com
sudo nginx -t
sudo systemctl reload nginx
```

## 4. HTTPS 证书

```bash
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

## 5. 一键部署

后续每次发布只需：

```bash
npm run deploy:server
```

脚本会执行：
1. `git pull --ff-only`
2. `npm ci`
3. `npm run build`
4. `pm2 startOrRestart ecosystem.config.cjs --env production --update-env`
5. 健康检查：`/api/health` 与 `/`

## 6. 运维排查

- 查看 PM2 状态：
```bash
pm2 list
pm2 logs diecasting-app
```

- 查看 Nginx 日志：
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

- 健康检查：
```bash
curl http://127.0.0.1:3001/api/health
```
