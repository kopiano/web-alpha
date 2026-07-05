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

## 性能优化

### 接口请求优化
* 后端使用缓存从2000ms->30ms
* 不要页面10个接口同时请求，而是重要接口先请求其它接口后台加载
* 数据表分页：不要get1000条，而是GET?page=1&pageSize=10分页获取
### 音乐播放器优化
* 不要一次性获取所有mp3，而是获取列表，然后逐个获取
* 点击播放时，才获取当前播放mp3的url
* 下一首后台预加载
### 表格数据(后端实现)
* 表格数据不要一次性获取，而是后端分页查询
* 表格数据不要一次性渲染，而是分页渲染
* 表格数据筛选和排序应是默认全局的(全部数据),由后端完成
* 采用固定高度：height: calc(100vh - 160px) + 滚动显示
* 切换分页表格闪动：
    * 闪动是页码变化后又把整块表格切回了 loading 或者重新挂载了表体
    * 改成了只在空表初次加载时才进入 loading 状态。
### 懒加载减少首屏加载
* 路由使用懒加载(必须)：const Chat = lazy(() => import("./pages/Chat"))
* 首次只下载首页需要的 JS，其他页面按需加载
* 组件懒加载：如用户打开图表/md编辑器再加载：
    * 不要：import Map from "./Map"
    * 而是：const Map = lazy(() => import("./Map"))
* 图片懒加载：<img loading="lazy" decoding="async" src={url} />, 还有异步解码，图片很多时提升非常明显
* webp: 图片格式，比png/jpg小很多, png5MB, webp300KB(后端存储还是用png好吧？)
* svg图标代替png：png120kb, 改为svg3kb

### React组件优化
* 使用useMemo避免重复计算：例如聊天联系人有1000个，只有一个变化不要全部刷新React.memo(ContactItem)即可
* 使用useCallback避免重复渲染
* key用id而不是index
### js包优化
vite打包后index.js如果超过500KB就需要优化
* 组件库按需加载
* 删除没用的库
* 引用不要省略js名称