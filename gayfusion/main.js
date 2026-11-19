const sources = [
  { id: "pornhub", name: "Pornhub", home: "https://cn.pornhub.com", path: "/gayporn", aliases: ["pornhub.com", "cn.pornhub.com", "www.pornhub.com"], suffixes: ["pornhub.com"] },
  { id: "icegay", name: "IceGay", home: "https://www.icegay.tv", path: "/", aliases: ["icegay.tv", "www.icegay.tv"], suffixes: ["icegay.tv"] },
  { id: "xvideos", name: "XVideos", home: "https://www.xvideos.com", path: "/gay", aliases: ["xvideos.com", "www.xvideos.com"], suffixes: ["xvideos.com"] },
  { id: "boyfriendtv", name: "BoyfriendTV", home: "https://www.boyfriendtv.com", path: "/", aliases: ["boyfriendtv.com", "www.boyfriendtv.com"], suffixes: ["boyfriendtv.com"] },
  { id: "gaymaletube", name: "GayMaleTube", home: "https://www.gaymaletube.com", path: "/zh/", aliases: ["gaymaletube.com", "www.gaymaletube.com"], suffixes: ["gaymaletube.com"] },
  { id: "megapornfreehd", name: "MegaPornFreeHD", home: "https://megapornfreehd.com", path: "/", aliases: ["megapornfreehd.com", "www.megapornfreehd.com"], suffixes: ["megapornfreehd.com"] },
];

const categoriesList = [
  { id: "", name: "全部" },
  { id: "new", name: "最新" },
  { id: "popular", name: "热门" },
  { id: "gay", name: "男同" },
  { id: "asian", name: "亚洲" },
  { id: "japanese", name: "日本" },
  { id: "korean", name: "韩国" },
  { id: "chinese", name: "中国" },
  { id: "western", name: "欧美" },
  { id: "muscle", name: "肌肉" },
  { id: "hunk", name: "壮汉" },
  { id: "twink", name: "鲜肉" },
  { id: "mature", name: "熟男" },
  { id: "bear", name: "熊系" },
  { id: "amateur", name: "业余" },
  { id: "professional", name: "专业制作" },
  { id: "solo", name: "单人" },
  { id: "couple", name: "情侣" },
  { id: "group", name: "多人" },
  { id: "oral", name: "口交" },
  { id: "anal", name: "肛交" },
  { id: "masturbation", name: "自慰" },
  { id: "outdoor", name: "户外" },
  { id: "roleplay", name: "角色扮演" },
  { id: "uniform", name: "制服" },
  { id: "underwear", name: "内衣" },
  { id: "romantic", name: "浪漫" },
  { id: "bdsm", name: "BDSM" },
  { id: "trans", name: "跨性别" },
  { id: "shemale", name: "人妖" },
  { id: "uncensored", name: "无码" },
  { id: "hd", name: "高清" },
  { id: "vr", name: "VR" },
  { id: "short", name: "短片" },
  { id: "long", name: "长片" },
  { id: "fetish", name: "特殊偏好" },
];

const categoryAliases = {
  "最新": "new", "最近更新": "new", "recent": "new", "latest": "new", "newest": "new",
  "热门": "popular", "最受欢迎": "popular", "most popular": "popular", "popular videos": "popular", "trending": "popular", "排行": "popular",
  "gay": "gay", "同性": "gay", "男同志": "gay", "男同": "gay", "同性恋": "gay",
  "亚洲": "asian", "亚洲男同": "asian", "asian gay": "asian", "asian men": "asian",
  "日本": "japanese", "日系": "japanese", "japanese": "japanese", "japan": "japanese",
  "韩国": "korean", "韩系": "korean", "korean": "korean", "korea": "korean",
  "中国": "chinese", "中国男同": "chinese", "chinese": "chinese", "china": "chinese",
  "欧美": "western", "美国": "western", "欧美男同": "western", "western": "western", "american": "western",
  "muscular": "muscle", "肌肉男": "muscle", "肌肉": "muscle", "muscle": "muscle",
  "hunks": "hunk", "壮男": "hunk", "壮汉": "hunk", "hunk": "hunk",
  "twinks": "twink", "鲜肉": "twink", "少年感": "twink", "twink": "twink",
  "mature men": "mature", "成熟": "mature", "熟男": "mature", "daddy": "mature", "mature": "mature",
  "bear gay": "bear", "熊男": "bear", "熊系": "bear", "bear": "bear",
  "amateur gay": "amateur", "素人": "amateur", "业余": "amateur", "amateur": "amateur",
  "studio": "professional", "片商": "professional", "专业制作": "professional", "professional": "professional",
  "solo male": "solo", "solo": "solo", "单人": "solo",
  "couples": "couple", "情侣": "couple", "双人": "couple", "couple": "couple",
  "orgy": "group", "多人": "group", "群交": "group", "group": "group",
  "blowjob": "oral", "oral sex": "oral", "口交": "oral", "口": "oral",
  "anal sex": "anal", "肛交": "anal", "anal": "anal",
  "masturbation": "masturbation", "自慰": "masturbation", "手淫": "masturbation",
  "role play": "roleplay", "角色扮演": "roleplay", "roleplay": "roleplay",
  "uniforms": "uniform", "制服": "uniform", "户外": "outdoor", "outdoor": "outdoor",
  "underwear": "underwear", "内衣": "underwear", "内裤": "underwear",
  "romance": "romantic", "romantic": "romantic", "浪漫": "romantic",
  "bdsm": "bdsm", "fetish bdsm": "bdsm", "支配": "bdsm",
  "transgender": "trans", "跨性别": "trans", "trans": "trans",
  "shemale": "shemale", "人妖": "shemale", "跨性别女性": "shemale",
  "uncensored": "uncensored", "无码": "uncensored", "无马赛克": "uncensored",
  "hd": "hd", "高清": "hd", "1080p": "hd", "4k": "hd", "uhd": "hd",
  "vr": "vr", "虚拟现实": "vr", "short videos": "short", "短片": "short", "short": "short",
  "长片": "long", "feature length": "long", "long": "long",
  "fetish": "fetish", "特殊偏好": "fetish", "癖好": "fetish",
};

const categoriesById = Object.create(null);
for (const entry of categoriesList) categoriesById[entry.id] = entry;

function clean(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&#x([0-9a-fA-F]+);/g, (all, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (all, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function attribute(node, name) {
  const value = node && node.attrs ? node.attrs[name] : "";
  return typeof value === "string" ? value : "";
}

function classTokens(node) {
  return attribute(node, "class").split(/\s+/).filter(Boolean);
}

function hasClass(node, name) {
  return classTokens(node).indexOf(name) >= 0;
}

function nodeText(node) {
  if (!node) return "";
  let text = "";
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    if (["script", "style", "noscript"].indexOf(String(current.tag || "").toLowerCase()) >= 0) continue;
    if (typeof current.text === "string") text += current.text;
    const children = current.children || [];
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
  return clean(text);
}

function collect(node, predicate, limit) {
  const out = [];
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    if (current !== node && predicate(current)) {
      out.push(current);
      if (limit > 0 && out.length >= limit) return out;
    }
    const children = current.children || [];
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
  return out;
}

function first(node, predicate) {
  const found = collect(node, predicate, 1);
  return found.length ? found[0] : null;
}

function tokens(value) {
  const raw = String(value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9\u3400-\u9fff]+/g, " ").trim();
  if (!raw) return [];
  return raw.split(/\s+/);
}

function canonicalTag(value) {
  const normalized = clean(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (categoryAliases[normalized]) return categoryAliases[normalized];
  const words = tokens(normalized);
  for (const word of words) {
    const id = categoryAliases[word];
    if (id && categoriesById[id]) return id;
  }
  return "";
}

function mergeTags(input) {
  const ids = [];
  const seen = Object.create(null);
  for (const value of input) {
    const id = canonicalTag(value);
    if (id && !seen[id]) {
      seen[id] = true;
      ids.push(id);
    }
  }
  return ids;
}

function sourceFor(value) {
  for (const source of sources) if (source.id === value) return source;
  return null;
}

function sourceCategoryPath(source, category) {
  if (!category) return source.path;
  const aliases = {
    new: ["new", "latest", "videos", ""], popular: ["popular", "trending", "top", ""], gay: ["gay", "gayporn"],
    asian: ["asian"], japanese: ["japanese", "japan"], korean: ["korean", "korea"], chinese: ["chinese", "china"],
    western: ["american", "western"], muscle: ["muscle", "muscular"], hunk: ["hunk", "hunks"], twink: ["twink", "twinks"],
    mature: ["mature", "daddy"], bear: ["bear"], amateur: ["amateur"], professional: ["studio"], solo: ["solo"],
    couple: ["couple", "couples"], group: ["group", "orgy"], oral: ["blowjob", "oral"], anal: ["anal"],
    masturbation: ["masturbation", "solo"], roleplay: ["roleplay"], uniform: ["uniform"], outdoor: ["outdoor"],
    underwear: ["underwear"], romantic: ["romantic"], bdsm: ["bdsm"], trans: ["transgender"], shemale: ["shemale"],
    uncensored: ["uncensored"], hd: ["hd", "4k"], vr: ["vr"], short: ["short"], long: ["long"], fetish: ["fetish"],
  };
  const candidates = aliases[category] || [category];
  for (const candidate of candidates) {
    if (source.id === "pornhub") return "/gayporn/" + encodeURIComponent(candidate);
    if (source.id === "xvideos") return "/" + encodeURIComponent(candidate) + "/";
    if (source.id === "icegay") return "/tag/" + encodeURIComponent(candidate) + "/";
    if (source.id === "boyfriendtv") return "/gay/" + encodeURIComponent(candidate) + "/";
    if (source.id === "gaymaletube") return "/zh/" + encodeURIComponent(candidate) + "/";
    if (source.id === "megapornfreehd") return "/gay/" + encodeURIComponent(candidate) + "/";
  }
  return source.path;
}

function catalogUrl(source, page, category, query) {
  let path = sourceCategoryPath(source, category);
  if (query) {
    const encoded = encodeURIComponent(query);
    if (source.id === "pornhub") path = "/video/search?search=" + encoded;
    else if (source.id === "xvideos") path = "/?k=" + encoded;
    else if (source.id === "icegay") path = "/?s=" + encoded;
    else if (source.id === "boyfriendtv") path = "/search/" + encoded + "/";
    else if (source.id === "gaymaletube") path = "/zh/search/" + encoded + "/";
    else path = "/?s=" + encoded;
  }
  if (page > 1) {
    if (source.id === "pornhub") path += (path.indexOf("?") >= 0 ? "&" : "?") + "page=" + page;
    else path = path.replace(/\/$/, "") + "/" + page + "/";
  }
  return host.resolveUrl(source.home + "/", path);
}

function absoluteUrl(source, raw, base) {
  const value = clean(raw);
  if (!value || /^data:/i.test(value) || /^javascript:/i.test(value)) return "";
  try {
    const resolved = host.resolveUrl(base || source.home + "/", value);
    const parsed = host.parseUrl(resolved);
    const hostname = String(parsed.hostname || "").toLowerCase();
    for (const suffix of source.suffixes) if (hostname === suffix || hostname.endsWith("." + suffix)) return resolved;
  } catch (error) {
    return "";
  }
  return "";
}

function sourceItemId(source, url) {
  return source.id + "|" + url;
}

function parseCards(source, body, category, categoryName) {
  const document = host.parseHtml(body);
  const candidates = collect(document, (node) => {
    if (node.tag !== "a") return false;
    const href = attribute(node, "href");
    return href && /(?:view_video\.php|\/(?:video|videos|watch|embed|movie|clip|v)\/)/i.test(href);
  }, 600);
  const items = [];
  const seen = Object.create(null);
  for (const anchor of candidates) {
    const href = attribute(anchor, "href");
    const url = absoluteUrl(source, href);
    if (!url || seen[url]) continue;
    let card = anchor;
    let steps = 0;
    while (card && steps < 5 && !(hasClass(card, "video-box") || hasClass(card, "thumb-block") || hasClass(card, "thumb") || hasClass(card, "video-item") || hasClass(card, "videobox") || hasClass(card, "thumb-container") || card.tag === "article")) {
      card = card.parent || null;
      steps++;
    }
    const title = clean(attribute(anchor, "title")) || clean(attribute(anchor, "aria-label")) || clean(nodeText(anchor)) || clean(attribute(first(card || anchor, (node) => node.tag === "img") || {}, "alt"));
    if (!title || title.length < 2) continue;
    const image = first(card || anchor, (node) => node.tag === "img");
    const lazyImage = image && (attribute(image, "data-src") || attribute(image, "data-thumb") || attribute(image, "data-original") || attribute(image, "src"));
    const cover = lazyImage ? absoluteUrl(source, lazyImage) : "";
    let duration = "";
    let views = "";
    if (card) {
      const text = clean(nodeText(card));
      const durationMatch = text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
      duration = durationMatch ? durationMatch[0] : "";
      const viewsMatch = text.match(/([\d,.]+\s*(?:万|千|K|M|million|views?))/i);
      views = viewsMatch ? viewsMatch[1] : "";
    }
    const pageUrl = host.resolveUrl(source.home + "/", url);
    const tags = mergeTags([categoryName, title, href, card ? nodeText(card) : ""]);
    const drama = {
      id: host.dramaId(sourceItemId(source, pageUrl)),
      source: host.source,
      sourceId: sourceItemId(source, pageUrl),
      title: title.slice(0, 512),
      name: title.slice(0, 512),
      cover,
      coverUrl: cover,
      channelName: source.name,
      categoryName: categoryName || "",
      tags: tags.slice(0, 12),
      sourceUrl: pageUrl,
    };
    if (duration) {
      drama.duration = duration;
      drama.remark = duration;
    }
    if (views) {
      drama.views = views;
    }
    seen[url] = true;
    items.push(drama);
    if (items.length >= 150) break;
  }
  return items;
}

function pageResult(page, category, query) {
  if (!(page >= 1) || page > 500) return { items: [], hasMore: false };
  const categoryEntry = categoriesById[category || ""];
  const label = categoryEntry ? categoryEntry.name : "";
  const merged = [];
  const seen = Object.create(null);
  const warnings = [];
  for (const source of sources) {
    try {
      const address = catalogUrl(source, page, category || "", query || "");
      const response = host.fetchText({ url: address, referer: source.home + "/" });
      const items = parseCards(source, response.body, category || "", label);
      for (const item of items) {
        const key = item.title.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g, "");
        const globalKey = source.id + ":" + key;
        if (seen[globalKey]) continue;
        seen[globalKey] = true;
        merged.push(item);
      }
    } catch (error) {
      warnings.push(source.name + "：" + String(error && error.message ? error.message : error));
    }
  }
  return {
    items: merged.slice(0, 300),
    hasMore: merged.length >= 30,
    warning: warnings.length === sources.length ? "所有来源暂时不可用：" + warnings.join("；") : "",
  };
}

module.exports = {
  validCategory(category) { return !!categoriesById[String(category || "")]; },
  categories() { return categoriesList.map((item) => ({ id: item.id, name: item.name })); },
  catalogPage(page, category) { return pageResult(page, category, ""); },
  search(page, query) {
    const keyword = clean(query);
    return keyword ? pageResult(page, "", keyword) : { items: [], hasMore: false };
  },
  detail(sourceId) {
    const text = String(sourceId || "");
    const separator = text.indexOf("|");
    if (separator < 0) throw new Error("视频标识格式无效");
    const source = sourceFor(text.slice(0, separator));
    if (!source) throw new Error("视频来源未知");
    const url = text.slice(separator + 1);
    const parsed = host.parseUrl(url);
    if (!source.suffixes.some((suffix) => parsed.hostname === suffix || String(parsed.hostname || "").endsWith("." + suffix))) throw new Error("视频地址无效");
    const response = host.fetchText({ url, referer: source.home + "/" });
    const document = host.parseHtml(response.body);
    const titleNode = first(document, (node) => node.tag === "title");
    const title = nodeText(titleNode) || source.name;
    const image = first(document, (node) => node.tag === "meta" && (attribute(node, "property") === "og:image" || attribute(node, "name") === "twitter:image"));
    const cover = image ? absoluteUrl(source, attribute(image, "content"), url) : "";
    const drama = {
      id: host.dramaId(text), source: host.source, sourceId: text,
      title: title.slice(0, 512), name: title.slice(0, 512), cover, coverUrl: cover,
      channelName: source.name, categoryName: "", sourceUrl: url,
    };
    const chapter = {
      id: host.chapterId(text, "1"), source: host.source, title: title.slice(0, 128), currentEpisode: 1,
      pageUrl: url, referer: source.home + "/", videoUrl: url,
    };
    return { drama, chapters: [chapter] };
  },
  resolveMedia(task) {
    const taskObject = task && typeof task === "object" ? task : {};
    const sourceId = String(taskObject.dramaId || taskObject.sourceId || taskObject.id || "");
    const separator = sourceId.indexOf("|");
    if (separator < 0) throw new Error("播放信息无效，请刷新详情后重试");
    const source = sourceFor(sourceId.slice(0, separator));
    const url = sourceId.slice(separator + 1);
    if (!source || !absoluteUrl(source, url)) throw new Error("视频页面无效");
    const response = host.fetchText({ url, referer: source.home + "/" });
    const text = String(response.body || "");
    const patterns = [
      /<source\b[^>]*\bsrc=["']([^"']+)["']/ig,
      /<video\b[^>]*\bsrc=["']([^"']+)["']/ig,
      /(?:file|src|video_url|videoUrl|contentUrl)\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)(?:\?[^"']*)?)["']/ig,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const media = absoluteUrl(source, match[1], url);
        if (media && /\.(?:mp4|m3u8)(?:\?|$)/i.test(media)) return host.prepareWebMedia({ url: media, referer: url }, source.name);
      }
    }
    throw new Error(source.name + "详情页未提取到直接媒体地址；请在应用浏览器中打开来源页播放");
  },
};
