# GayFusion

聚合 Pornhub、IceGay、XVideos、BoyfriendTV、GayMaleTube、MegaPornFreeHD 六个男同影片目录。模块提供统一分类、关键词搜索和跨来源合并列表；分类名及常见中英文标签归一化到同一组标签。

## 分类

全部、最新、热门、男同、亚洲、日本、韩国、中国、欧美、肌肉、壮汉、鲜肉、熟男、熊系、业余、专业制作、单人、情侣、多人、口交、肛交、自慰、角色扮演、制服、户外、内衣、浪漫、BDSM、跨性别、人妖、无码、高清、VR、短片、长片、特殊偏好。

站点目录结构和可用分类会变化。统一分类会按来源映射到候选目录地址，个别来源未收录的目录将返回空结果；总列表仍合并其余来源。

## 本地打包

```powershell
python .github/scripts/modules_release.py plan --only gayfusion
```

生成 `dist/gayfusion-0.1.0.zip`，从应用「模块」页选择该 ZIP 安装。