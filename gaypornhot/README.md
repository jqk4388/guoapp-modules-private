# GayPornHot

小果影视（guoapp）站源模块，接口第 1 版。

- 内容：欧美男同影片与片商合集（BelAmi、CockyBoys、NextDoor 等）
- 功能：分类浏览、分页、搜索、详情、播放
- 限制级：是

## 安装

在应用「模块」页从 zip 安装，或把本目录放到数据目录的 `modules/gaypornhot/`。

## 说明

- 目录和搜索走站点的 WordPress 列表页（`/` 首页、`/category/<分类>/`、`/?s=<关键词>`），分页形如 `/category/gay-porn-movies/page/2/`。
- 详情页只有一个正片，播放器是第三方嵌入页 `gayporntube.net/embed/<id>`，模块在这个页面里取带签名的 mp4 直链。
- 该嵌入页对 `Referer` 有白名单：只能是 javboys、gaypornhot、netfuck 这几个站域，所以请求时固定带本站 `Referer`；播放直链再用嵌入站自己的 `Referer` 请求。
- 站点对 TLS 指纹敏感（普通 HTTP 客户端握手阶段就被重置），模块清单开了 `browserFingerprint` 并声明了站点和嵌入域名，请求走应用的 Chrome 指纹通道。
- 部分影片详情页除了嵌入站还有 DoodStream 等其它播放器，本模块只认 `gayporntube.net/embed/` 这一路。
- 直链带 `v-acctoken` 时效签名，每次播放都重新解析，不缓存播放地址。
