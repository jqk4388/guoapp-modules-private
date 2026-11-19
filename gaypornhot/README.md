# GayPornHot

小果影视（guoapp）站源模块，接口第 1 版。

- 内容：欧美男同影片与片商合集
- 功能：最近添加、排行榜（今日 / 7 天 / 本月）、170+ 片商分类、分页（自动加载更多）、搜索、详情、播放
- 限制级：是

## 安装

在应用「模块」页从 zip 安装，或把本目录放到数据目录的 `modules/gaypornhot/`。

## 分类

列表顶部三项固定：

- `最近添加`：站点的 `/videos/` 列表（`/videos/page/N/` 翻页）
- `排行 · 今日 / 7 天 / 本月`：首页 `TOP 20 Rankings` 三张榜，各 20 条，榜单本身不翻页

其余分类从 WordPress 接口 `/wp-json/wp/v2/categories`（每页 100，最多 5 页）现取，只保留有内容的分类，按影片数从多到少排；子分类（例如 `SAY UNCLE` 下的 `LatinLeche`）取父级名做前缀，标识里用 `~` 代替路径分隔符（应用不接受分类标识带 `/`），翻页地址仍是 `/category/<父>/<子>/page/N/`。取不到接口时退回内置的十几个常用片商。

## 说明

- 目录和搜索走站点的 WordPress 列表页（`/videos/`、`/category/<分类>/`、`/?s=<关键词>`），分页形如 `/category/gay-porn-movies/page/2/`。页面没有翻页链接时按满页推定还有下一页，并用 `?paged=N` 兜底；同一页内容重复就停。
- 排行榜没有独立页面，是首页三块 `#jhvr-ranking-3-<day|week|month>` 面板（`article.jhvr-card`），模块取一次首页同时解析三张榜并缓存 10 分钟，卡片上带「第 N 名」徽标。
- 详情页的播放器是第三方嵌入页（`gayporntube.net/embed/<id>`），也可能是页面里的 `<video>` 直链。模块先取播放器地址，再在播放器页里解出 `get_file` 的 mp4（也认 `file`、`sources`、`.m3u8`）；播放器换到未声明的域名时，报错会直接写出那个域名。
- 嵌入页对 `Referer` 有白名单：只能是 javboys、gaypornhot、netfuck 这几个站域，所以请求时固定带本站 `Referer`；播放直链再用嵌入站自己的 `Referer` 请求。
- 列表页、REST 接口和嵌入页都要过站点的 TLS 指纹检查（普通 HTTP 客户端握手阶段就被重置或直接 403）。清单开 `browserFingerprint` 后，`hosts` 里声明的域名都走应用的 Chrome 指纹通道；共享的嵌入域名放 `hosts` 不放 `aliases`，标识不冲突，三个站源可以同时安装（需要 2.0.3+115 及以后的应用）。
- 直链带 `v-acctoken` 时效签名，每次播放都重新解析，不缓存播放地址。
- 片名里的注音（`<ruby>` 的 `rt`）会被去掉。
- `Movies`（`/movies/`）是独立影片类型，卡片结构与视频不同，暂未接入。
