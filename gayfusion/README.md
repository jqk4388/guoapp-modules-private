# GayFusion

聚合 Pornhub、IceGay、XVideos、BoyfriendTV、GayMaleTube、MegaPornFreeHD 六个男同影片站点，但不再一次性合并六个站点的首页。

## 分站加载

- 每个站点一个标签，点哪个标签就只请求哪个站点，其他站点不会跟着刷新。
- 标签由站点配置生成，不写死分类名。
- 某个站点请求失败会被记为不可用，后续刷新分类时自动跳过；只有成功返回内容的站点会出现在标签里。
- 应用固定提供的「全部」标签只取一个当前可用站点作为默认内容，不并发抓取全部站点，避免首屏等待。

## 搜索

搜索会依次尝试当前可用的站点，失败站点自动跳过并继续下一个；整体超过约 45 秒会提前结束。

## 本地打包

```powershell
python .github/scripts/modules_release.py plan --only gayfusion
```

生成 `dist/gayfusion-0.2.0.zip`，从应用「模块」页选择该 ZIP 安装。
