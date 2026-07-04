# web-alpha

###  ngrok部署
```sh
brew install ngrok   # 安装 ngrok
# 登录后 https://dashboard.ngrok.com/get-started/your-authtoken 复制 token
ngrok config add-authtoken YOUR_TOKEN       # 3. 配置 token
ngrok http 5000     # 本地要pnpm run dev
```

### cloudflare部署
```sh

前端 → Cloudflare Pages（静态托管）

# web-alpha 构建
cd ~/Documents/web/web-alpha
npm run build

# 输出目录: dist/
# 在 Cloudflare Dashboard → Pages → 连接 Git 仓库 或 直接上传 dist/

后端 → Cloudflare Tunnel（cloudflared）

# 安装 cloudflared
brew install cloudflare/cloudflared/cloudflared

# 登录并创建隧道
cloudflared tunnel login
cloudflared tunnel create alpha-api

# 配置隧道指向本地 Docker 后端
# ~/.cloudflared/config.yml:
# tunnel: alpha-api
# ingress:
#   - hostname: api.yourdomain.com
#     service: http://localhost:8000
#   - service: http_status:404

# 启动隧道
cloudflared tunnel run alpha-api

前端后端连通：前端 VITE_API_BASE_URL 设为 https://api.yourdomain.com/api/v1
```

### Cloudflare Pages + Cloudflare Tunnel
```sh
## 方案一：Cloudflare Pages + Cloudflare Tunnel 部署指南

———

### 第一步：Cloudflare Pages 部署前端

  # 1. 构建前端
cd ~/Documents/web/web-alpha

# 2. 修改生产环境 API 地址
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://api.你的域名.com/api/v1
EOF

# 3. 构建
npm run build

# 4. 输出目录 dist/
#    登录 Cloudflare Dashboard → Workers & Pages → Pages → 连接 Git
#    选择 web-alpha 仓库，框架选 Vite，构建命令 npm run build，输出目录 dist

或者直接上传 dist/ 文件夹（不连 Git）：

Cloudflare Dashboard → Pages → 创建项目 → 直接上传 → 上传 dist/

———

### 第二步：安装并配置 Cloudflare Tunnel

# 1. 安装 cloudflared
brew install cloudflare/cloudflared/cloudflared

# 2. 登录 Cloudflare 账号
cloudflared tunnel login
# 浏览器会打开，选择你的域名授权

# 3. 创建隧道
cloudflared tunnel create alpha-backend
# 输出: 创建了 Tunnel ID 和凭证文件 ~/.cloudflared/<tunnel-id>.json

# 4. 创建配置文件
cat > ~/.cloudflared/config.yml << 'CONF'
tunnel: alpha-backend
credentials-file: /Users/coulsonzero/.cloudflared/<tunnel-id>.json

ingress:
# API 路由 -> 本地 Docker 后端
- hostname: api.你的域名.com
    service: http://localhost:8000
# 兜底规则
- service: http_status:404
CONF

# 5. DNS 解析（指向 tunnel）
cloudflared tunnel route dns alpha-backend api.你的域名.com

———

### 第三步：后端 Docker 启动

cd ~/Documents/go/go-alpha
docker compose up -d
# 后端跑在 localhost:8000，Tunnel 自动暴露出去

Tunnel 会保持连接，本机关机后 Tunnel 断开。需要常驻运行：

# 作为服务运行（后台守护）
cloudflared tunnel install
cloudflared tunnel run alpha-backend

或简单后台运行：

nohup cloudflared tunnel run alpha-backend > ~/cloudflared.log 2>&1 &

———

用户浏览器 → Cloudflare CDN
            ├── pages.你的域名.com → Cloudflare Pages（前端 dist/）
            └── api.你的域名.com → Cloudflare Tunnel → localhost:8000（Docker 后端）
                                                                ├── Go API

  ———

### 注意事项

事项                   说明
━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tunnel 依赖本机运行    本机关机后端即下线，需要 24h 运行建议用云服务器
─────────────────────  ──────────────────────────────────────────────────────
WebSocket              Tunnel 天然支持 WebSocket，ws: true 无需额外配置
─────────────────────  ──────────────────────────────────────────────────────
HTTPS                  Cloudflare 自动提供 SSL 证书
─────────────────────  ──────────────────────────────────────────────────────
域名                   需要一个域名，api.你的域名.com 做 A记录 CNAME 到隧道
─────────────────────  ──────────────────────────────────────────────────────


If this is intentional, please move or delete that file then run this command again


• 已有证书，说明之前登录过，直接使用即可。检查一下：

# 查看已有隧道
cloudflared tunnel list

如果有隧道，直接启动：

# 查看隧道名称
cloudflared tunnel list
# 启动已有隧道
cloudflared tunnel run <隧道名称>

如果没隧道或想重新创建，把旧证书移走再登录：

mv ~/.cloudflared/cert.pem ~/.cloudflared/cert.pem.bak
cloudflared tunnel login
```

### 端口占用

```sh
kill -9 $(lsof -i:5000)
```

