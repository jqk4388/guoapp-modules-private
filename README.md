# 小果影视站源合集（私有）

小果影视（guoapp）站源模块的私有合集，接口第 1 版。每个子目录是一个模块，包含 `manifest.json`、`main.js` 和 `README.md`。

| 模块 | 名称 | 内容 | 播放方式 |
| --- | --- | --- | --- |
| `jise` | 基色短剧 | 真人剧、AI 剧、账号登录、自动签到、金币解锁 | 直接取流 |
| `languo` | 蓝果短剧 | 男同短剧、AI 剧、男同 GV、自动找最新域名 | 直接取流 |
| `javboys` | JavBoys | 日本 / 韩国 / 欧美男同影片 | gayporntube 嵌入页取 mp4 |
| `gaypornhot` | GayPornHot | 欧美男同影片与片商合集 | gayporntube 嵌入页取 mp4 |
| `netfuck` | Netfuck | 日本 JAV 男同影片，十余万条目 | gayporntube 嵌入页取 mp4 |
| `horlover` | 4horLover | 日本男同影片合集 | 浏览器验证广告短链后取 MixDrop 直链 |
| `fullboys` | FullBoys | 亚洲男同影片，63 个标签分类 | 取 jwplayer 页里的 R2 直链 |

## 安装

应用内「模块」页支持从 zip 安装：把模块目录打成一个 zip（`manifest.json` 与 `main.js` 放在根目录），从文件或地址安装。也可以直接把目录放到数据目录的 `modules/<标识>/` 下。

`dist/` 里是打包好的 zip，只作本地产物，不入库。

## 发布

`.github/workflows/release.yml` 负责自动发布：`main` 上有模块改动就打包并建 Release，每个模块一条，标签为 `<标识>-v<版本>`，附件为 `<标识>-<版本>.zip`（`manifest.json`、`main.js`、`README.md` 在根目录）。

- 改完模块递增该模块 `manifest.json` 的 `version` 再推，就有新 Release；版本没变则跳过，不会覆盖已发布的包。
- 重发同一版本：手动运行该工作流，勾选 `force`；只想发某几个模块，填 `only`（空格分隔）。
- 本地打包走同一套校验和打包逻辑：`python .github/scripts/modules_release.py plan`，产物在 `dist/`。
- 安装包地址：`https://github.com/jqk4388/guoapp-modules-private/releases/download/<标识>-v<版本>/<标识>-<版本>.zip`，私有仓库下载需要登录。

## 约定

- 模块标识（`manifest.json` 的 `id`）必须与目录同名，发布后不能改：剧集和分集的 ID 会写进用户的追剧、记录和下载。
- 需要 TLS 指纹的站点在清单里开 `browserFingerprint`，并用 `aliases`（精确域名）、`hostSuffixes`（子域名）声明要走的域名；媒体也在这些域名上时，请求同样走 Chrome 指纹通道。
- 播放地址藏在广告短链（Cloudflare 挑战）后面的站源，把分集 `videoUrl` 写成 `browser://<短链地址>`，应用会用隐藏浏览器走完验证，再把落地地址塞回 `pageUrl`。
- 各模块的 `resolveMedia` 每次播放重新解析，不缓存带时效签名的直链。
