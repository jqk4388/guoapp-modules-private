# 4horLover

小果影视（guoapp）站源模块，接口第 1 版。

- 内容：日本男同影片合集（片源号与中文字幕标签）
- 功能：最新列表、博文翻页、搜索、详情、线路播放
- 限制级：是

## 安装

在应用「模块」页从 zip 安装，或把本目录放到数据目录的 `modules/horlover/`。

## 播放需要浏览器验证

站点的「Play Video」都是广告短链（`ouo.io` / `ouo.press`），短链页面带 Cloudflare 托管挑战，只有浏览器内核能过。所以本模块：

1. `detail` 把每条线路写成 `videoUrl: "browser://<短链地址>"`，分集不带 `pageUrl`。
2. 应用播放前检测到 `browser://` 前缀，用根部的隐藏浏览器打开短链，提交页面上的验证表单（`#form-captcha`、`#form-go`、`/go/`、`/xreallcygo/`），拿到落地地址；验证页停在自己的域名上也能继续，短链换了域名不用改应用。
3. 落地地址塞回分集的 `pageUrl`，再调用 `resolveMedia`，由模块从落地站点（MixDrop 等）解出 mp4 直链。

没有浏览器内核时（例如直接调模块、离线下载），`resolveMedia` 会提示需要先完成验证，不会静默失败。

## 说明

- 首页和搜索都支持博文翻页：`/page/<N>/`，站点只用查询串分页时退回 `?paged=<N>`；页面没有翻页链接时按满页推定还有下一页。
- 文章 id 作为剧集 `sourceId`，长期稳定。详情先走 `/?p=<id>`，找不到文章时从首页文章列表里取该 id 的永久链接再请求一次；标题依次取 `h1`/`h2`/`h3` 的 `entry-title`、`og:title`、`<title>`。
- 线路只认站点外链：先找已知短链（`ouo` 等），没有再找文字里带 Play / 在线 / 播放的链接，最后退到其它外链（排除网盘和社交站）。站内跳转链接（例如 `/go/123`）会先请求一次，把 302 后的真实短链取出来。
- 站点有年龄门（age-gate 插件），模块请求统一带 `Cookie: age_gate=1`，不用先提交生日表单。
- 落地页解析 MixDrop（`mxdrop.click` / `mixdrop.top` / `mixdrop.co` / `mxdrop.to`）：把 `/f/<id>` 换成 `/e/<id>`，解包页面里的 JS 得到 `MDCore.wurl` 直链，也认 `file`、`sources` 和裸 `.mp4` / `.m3u8` 地址。落地页不在清单 `hosts` 里时，报错会直接写出那个域名。
- MixDrop 的 mp4 在 `*.mxcontent.net` 上，对 TLS 指纹敏感（普通 HTTP 客户端 403），清单里用 `hostSuffixes` 声明了该域名，播放走应用的 Chrome 指纹通道。
- 直链签名有时效（`e=` 参数），每次播放都重新解析，不缓存播放地址。
- 站点还提供 Google Drive 下载，但 Drive 在很多网络下不可达，本模块不用它。
