# 黄豆短剧

小果影视（guoapp）站源模块，接口第 1 版。

- 内容：竖屏短剧（黄豆原创、魔改短剧、擦边短剧、真人短剧、单体作品、里番动漫）
- 功能：分类浏览、分页、搜索、详情、播放
- 限制级：是

## 安装

在应用「模块」页从 zip 安装，或把本目录放到数据目录的 `modules/huangdou/`。

## 接口协议（实现说明）

站点的 H5 客户端是 Flutter，接口全部走自带加密，模块里按同样规则实现：

- 请求与响应都是 `AES-256-CBC`（PKCS7）：密文前 16 字节是 IV，其后是密文；明文是 gzip 压缩过的 JSON。
- 每集密钥 = `HMAC-SHA256(key = "7961beb44246e3012ce228d6b5ced05a", msg = hex(去掉连字符的 requestId))`。
- 请求头签名 = `md5("Dart|sessionId|requestId|time|去掉协议的完整地址") + "-" + time`。
- 首次使用会调 `POST /api/login/device` 自动注册一个游客身份，令牌存在模块状态 `huangdou-site` 里。
- 需要发送二进制请求体，用的是宿主 `host.fetch` 的 `bodyBase64` 字段（这一项要 2.0.4 之后的宿主支持）；响应体用 `host.hexEncode` / `host.hexDecode` 中继，避免字符串编码破坏字节。

## 播放

- 站点按集卖：`/api/drama/play` 对免费集返回完整 HLS（m3u8 里的分片带 `auth_key`，`#EXT-X-KEY` 是 CDN 上的 AES-128 密钥），对金币 / 会员集只返回试看片段。
- 模块对免费集直接返回 m3u8；需要解锁的集提示「该集需要解锁（站点会员/金币）后才能播放」，不在模块里替站点做付费或绕过。
- 播放地址带 `exp` 与 `sig`，每次播放都重新取。

## 域名

站点域名会换（多为随机 `.cc`）。模块不再写死站点域名：

1. 先看应用里给这个站源手填的地址；
2. 再看本地记住的域名（3 小时内有效）；
3. 否则抓地址发布页 `https://z9d4qb8eu.cc/`（含 `www.`），从页面里的链接和文本提取候选域名；
4. 依次用 `POST {域名}/api/ping` 探测，第一个正常响应的作为当前域名，并连同其他候选一起记到模块状态 `huangdou-site` 里；
5. 接口请求失败时换下一个域名重试一次，全都不行才用清单里的 `baseUrl`。

清单开了 `allowAnyHost`，候选域名不需要写进 `hosts`；写进 `hosts` 的域名会走 Chrome 指纹通道。

`dev/publish.js` 用来人工核对发布页：抓一次发布页，列出候选域名和每个域名 `/api/ping` 的状态码与字节数（不打印页面内容）。

## 分类 ID

`/api/drama/list` 的 `cat_id` 由站点下发，模块里固定了实测可用的几个：

| 分类 | cat_id |
| --- | --- |
| 黄豆原创 | 246506 |
| 魔改短剧 | 246502 |
| 擦边短剧 | 246505 |
| 真人短剧 | 817202 |
| 单体作品 | 246503 |
| 里番动漫 | 817201 |

站点新增分区时按同样方式（抓 `POST /api/drama/list` 的 `cat_id`）补进来即可。

## 开发自测

`dev/verify.js` 用 Node 加载 `main.js`，用 `crypto` 和 `curl` 模拟宿主 API，跑一遍分类、分页、搜索、详情、播放；`dev/domain.test.js` 用假的发布页和假响应校验域名发现与切换（不联网）；`dev/inflate.test.js` 对照 Node 的 `zlib` 校验模块里的 gzip 解压实现。运行：

```powershell
node dev/domain.test.js
$env:HTTPS_PROXY='http://127.0.0.1:5252'; $env:HTTP_PROXY=$env:HTTPS_PROXY
node dev/verify.js
node dev/inflate.test.js
```
