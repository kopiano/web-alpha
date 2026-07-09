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
* 多个请求promise.all()并行加载 + react分阶段渲染
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
* 路由使用懒加载(必须)：const Chat = lazy(() => import("./pages/Chat"))【不太行哦，这样会点击sidebar按钮后页面闪动，改为页面静默预加载】
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
* key用id而不是index，会报错，可以用user_id
### js包优化
vite打包后index.js如果超过500KB就需要优化
* 组件库按需加载
* 删除没用的库
* 引用不要省略js名称
* 清理无用调试日志，不碰业务错误处理和提示

### 通知栏白名单
* 网站版本功能更新和维护(手动)
* 用户登录、注册、新访客
* 用户setting信息修改
* 评论、点赞、回复
* 成功上传csv文件、清空交易表数据
* 没有权限、管理员已拒绝申请、已升级为pro、团队邀请(未加)
* 限时活动、周年庆、优惠券(商业)
* 空间消息、关注(未设计页面)

简化风格
```md
* New version v2.0
* CSV imported successfully
* Mike replied your comment
```
用户主动查看即已读,通知进入可视区域几百毫秒后标记已读
通知或提示要具体点


### css prompt：
* 按钮滑块式平移动画
* 页面平滑切换

### 功能
* localStorage：刷新、关闭浏览器后还保留

### 联系人聊天界面
切换联系人和显示聊天记录很慢
原因可能有：
* 每次切换联系人，都会重新渲染整个聊天界面，包括联系人列表和聊天记录(最常见)
* React 状态管理导致聊天区域或整个页面重复渲染
* 目前是消息驱动，而主流聊天网站是会话驱动，需要调整整个聊天架构(重新设计后端接口)
* 真正拖慢的是重复请求、重复渲染、以及首次进入时拉太多消息

获取联系人列表(所有用户和群聊)          GET /chat/conversations
    * 登录获取？还是进入chat页面获取？（前者）
      1. 登录后预加载 GET /chat/conversations
      2. 将返回的会话列表存入全局状态（如Vuex、Redux）或本地缓存。
    * 内容：联系人名称、头像、最后一条消息、未读消息数等
    * 进入Chat页面：刷新数据
       - 核心原则是“增量合并”而非“全量覆盖（UI状态管理）
         1. 强刷模式（Hard Refresh）：当Store/缓存中无数据时，显示加载骨架屏或Loading图标，完全等待接口返回后渲染。
         2. 静默模式（Silent Refresh）：当Store/缓存中有数据时，立即展示旧数据（保证秒开），然后在后台调用接口，用新数据无闪
  烁地更新列表
       - 要区分“首次加载（骨架屏）”和“静默刷新（无感知）”两种UI状态
       - 获取与合并数据需要按 conversationID 进行合并，而不是直接替换整个数组。
    * 如果数据量较大，接口应支持分页
    * Loading状态：在数据加载和刷新期间，需要妥善管理页面的加载状态
    * 触发刷新的多种场景：
      - 进入页面时，除了生命周期钩子
      - 页面生命周期（onShow / useEffect）：从其他页面返回时，必须刷新（因为可能有已读回执或新消息）
    * 未读数归零：在 refresh 接口返回前，不要将本地未读数强制置零，完全以接口返回为准
    * 性能优化：
      - 防抖与节流：对刷新

| 功能         | HTTP             | WebSocket |
| ----------       | ---------------- | --------- |
| 获取联系人列表      | ✅                | ❌         |
| 获取聊天记录       | ✅                | ❌         |
| 发送消息          | 可选（推荐 WebSocket） | ✅         |
| 接收新消息         | ❌                | ✅         |
| 对方正在输入       | ❌                | ✅         |
| 消息已读状态实时更新 | ❌                | ✅         |
| 在线/离线状态       | ❌                | ✅         |
| 撤回消息实时同步     | ❌                | ✅         |
| 删除消息实时同步     | ❌                | ✅         |


进入 ChatPage 后的逻辑是：
1. 先请求 GET /chat/conversations
2. 再请求 GET /chat/groups
3. 解析本地保存的 chat_active_contact
4. 如果本地保存的是某个联系人，就恢复那个联系人
5. 如果本地保存的是 team，才恢复群聊
6. 如果都没有保存，就保持未选中状态，等用户手动点

也就是说，首次进入页面通常是“未选中”，不是自动进 Team。
如果你想改成“首次进入默认选中 Team”，可以做，但现在代码还没这么设。

切换联系人的请求逻辑现在是：

1. 点击联系人
2. 前端只更新本地选中态、当前会话 id、已读状态
3. 调 PUT /chat/conversations/:id/read 标记已读
4. 消息列表不再额外手工请求，因为它已经交给 useChatMessages(activeConversationId) 去拉
5. WebSocket 继续实时推新消息和未读数

所以切换联系人时，当前已经没有“先创建会话再拉消息”的老流程了，主请求就是：

- 初次加载：/chat/conversations + /chat/groups
- 选中会话后：/chat/conversations/:id/messages
- 标记已读：PUT /chat/conversations/:id/read

### 发送消息
流程
POST /chat/messages(最容易) 或 WebSocket(推荐)
流程：
    1. 输入消息
    2. 发送 POST /api/v1/chat/messages
    3. MySQL（消息持久化）、更新Redis（在线状态、未读数、最近联系人等）、WebSocket推送给在线用户
    4. React收到消息，setMessages(...)，页面实时显示消息，请根据这个要求完善前端页面用户发送私聊消息和群聊消息的前端逻辑和
    5. 乐观更新ui

### 选中联系人显示历史消息记录
选中联系人获取消息记录
GET /chat/conversations/:id/messages
* 历史消息：首次只加载最近30条消息， 用户向上滚动时再加载更早的消息（无限滚动）
* WebSocket 推送新消息
第一次选中该用户：
    1. 立即切换 UI（显示Loading）
    2. GET /chat/conversations/:id/messages
    3. MySQL 查询
    4. 返回消息
    5. 缓存到 React（或 React Query）
第二次选中该用户：
    1. 点击 Alice
    2. 直接显示缓存
    3. 后台静默刷新最新消息（可选）
* 预加载
    * 当联系人列表显示出来时，可以预加载最可能会打开的会话
    * 最近聊天的前 3～5 个联系人
    * 当前默认选中的联系人
* 不要每次切换联系人都把消息列表清空
    1. 点击 Alice
    2. 保留上一帧内容或显示骨架屏
    3. 几十到几百毫秒后替换为新消息

## 局域网连接(同一wifi)
```bash
ipconfig getifaddr en0  # 获取本机ip
```
