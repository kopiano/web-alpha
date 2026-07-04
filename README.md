# web-alpha

## deploy
流程：
前端本地开发 -> push部署
后端用docker + cloudflare tunnel部署（只占用一个终端）

###  ngrok部署（测试）
```sh
brew install ngrok   # 安装 ngrok
# 登录后 https://dashboard.ngrok.com/get-started/your-authtoken 复制 token
ngrok config add-authtoken YOUR_TOKEN       # 3. 配置 token
ngrok http 5000     # 本地要pnpm run dev
```

### 端口占用

```sh
kill -9 $(lsof -i:5000)
```

### cloudflare pages（正式上线）
1. 进入https://dash.cloudflare.com
2. 搜索Pages(可能在下方中央)
3. Connect your github
4. Set:
- Framework: React(vite)
- Build command: pnpm run build
- Build output directory: dist
6. Click the 'Save and Deploy' button
7. 等待部署完成，访问https://web-alpha-xxxx.pages.dev
8. 自定义域名Domains -> DNS -> Add record：
Type: CNAME
Name: alpha
Target: web-alpha-xxxx.pages.dev
或者在阿里云配置(两者都配置不影响)

`注意`：coulsonzero.shop域名可能显示命名空间问题，需要在域名服务商-域名列表-`修改DNS`：
    * neil.ns.cloudflare.com
    * cass.ns.cloudflare.com
每次push即可自动部署到cloudflare pages

### github actions（尚未测试）
1. 进入https://github.com/xxx/web-alpha
2. Settings -> Actions -> General -> Workflow permissions -> set to 'Read and write permissions'
3. Actions -> New workflow -> Set up a workflow yourself -> .github/workflows/pages.yml
4. 点击`Run workflow`按钮

