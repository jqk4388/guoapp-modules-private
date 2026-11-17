# JavBoys

小果影视（guoapp）站源模块，接口第 1 版。

- 内容：日本、韩国、欧美男同影片，按片商分类
- 功能：分类浏览、分页、搜索、详情、播放
- 限制级：是

## 安装

在应用「模块」页从 zip 安装，或把本目录放到数据目录的 `modules/javboys/`。

## 说明

- 目录和搜索走站点的 WordPress 列表页（`/` 首页、`/category/<分类>/`、`/?s=<关键词>`），分页形如 `/category/movies/page/2/`。
- 详情页只有一个正片，播放器是第三方嵌入页 `gayporntube.net/embed/<id>`，模块在这个页面里取带签名的 mp4 直链。
- 该嵌入页对 `Referer` 有白名单：只能是 javboys、gaypornhot、netfuck 这几个站域，所以请求时固定带本站 `Referer`；播放直链再用嵌入站自己的 `Referer` 请求。
- 列表页和嵌入页都要过站点的 TLS 指纹检查（普通 HTTP 客户端握手阶段就被重置），模块清单开了 `browserFingerprint` 并在 `aliases`、`hostSuffixes` 里声明了站点和嵌入域名，请求会走应用的 Chrome 指纹通道。
- 直链带 `v-acctoken` 时效签名，每次播放都重新解析，不缓存播放地址；封面和标题可以缓存。
- 分类名、演员名用站点原文（日文、韩文），片名里的注音（`<ruby>` 的 `rt`）会被去掉。
