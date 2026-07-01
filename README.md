# web-alpha

## ngrok部署
```sh
brew install ngrok   # 安装 ngrok
# 登录后 https://dashboard.ngrok.com/get-started/your-authtoken 复制 token
ngrok config add-authtoken YOUR_TOKEN       # 3. 配置 token
ngrok http 5000
```
