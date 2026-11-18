# FullBoys

小果影视（guoapp）站源模块，接口第 1 版。

- 内容：亚洲男同影片，含 63 个标签分类
- 功能：分类浏览、分页（自动加载更多）、搜索、详情、播放
- 限制级：是

## 安装

在应用「模块」页从 zip 安装，或把本目录放到数据目录的 `modules/fullboys/`。

## 说明

- 列表页是服务端渲染的 `article.movie-item` 卡片，分类形如 `/topic/video/<标签>?page=N`，搜索形如 `/?search=<关键词>&page=N`，首页 `/` 是最新。分页链接在 `nav.pagination` 里，HTML 里的 `&` 被转义成 `&amp;`，判断下一页时两种写法都认。
- 分类用内置的 63 个标签（取自站点标签列表），`categories()` 不发请求。
- 站点的 `/vip/<标题>` 条目没有播放器，只收 `/video/watch/<标识>` 的卡片，VIP 条目直接跳过。
- 详情页只有一个播放器 `<iframe src="/video/jwplayer/<标识>">`，那个页面里是一行 jwplayer 配置，直链在 `file:` 后面，形如 `https://pub-<哈希>.r2.dev/<编号>/video.mp4`。模块先按分集里存的播放器地址解析，失败再按标识重取播放器页，最后回退到重新读详情页。
- 直链是 Cloudflare R2 的公开桶，不需要签名，支持 Range。清单 `hosts` 里声明了 `*.r2.dev`，桶换域名也能用。
- 封面在 `fullboys.b-cdn.net`，海报在 `pub-<哈希>.r2.dev`，两者都不要 `Referer`。
- 应用默认的 iPhone UA 下站点返回同一套服务端 HTML，不需要 `browserFingerprint`。

## 链路验证

用 `native/cmd/moduletool` 跑过真实请求：`catalog`（首页、分类、末页）、`search`、`detail`、`resolve` 都正常，`resolve` 取到 R2 直链并包装成本机播放代理地址。
