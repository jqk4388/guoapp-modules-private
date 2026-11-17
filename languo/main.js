const seedBases = ["https://languo.ai", "https://www.languo.ai", "https://languo.me", "https://www.languo.me"];
const publishPages = [
  "https://languoai.pages.dev/",
  "https://languotv.com/",
  "https://languo5.com/",
  "https://languo.ai/go-home/",
  "https://www.languo.ai/go-home/",
];
const baseCacheAge = 6 * 3600 * 1000;
const ignoredHostPattern = /(google|gstatic|cloudflare|schema\.org|x\.com|twitter|facebook|telegram|^t\.me$|qq\.com|baidu|doubleclick|sentry|github|jsdelivr|youtube|instagram|tiktok|pages\.dev$|languotv\.com$|languo5\.com$|api1\.)/i;
const channelName = "蓝果短剧";
const userAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const numericIdPattern = /^[0-9]{1,18}$/;

const cardPattern = /<article\b[^>]*\bclass=["'][^"']*\bll-card\b[^"']*["'][^>]*>[\s\S]*?<\/article>/gi;
const initialDataPattern = /<script\b[^>]*\bid=["']videoInitialData["'][^>]*>([\s\S]*?)<\/script>/i;
const mainTagPattern = /<main\b[^>]*\bdata-vid=["'][^"']*["'][^>]*>/i;
const ogTitlePattern = /<meta\b[^>]*\bproperty=["']og:title["'][^>]*\bcontent=["']([^"']*)["']/i;
const ogImagePattern = /<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']*)["']/i;
const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const imagePattern = /<img\b([^>]*)>/gi;
const tagBoxPattern = /<div\b[^>]*\bclass=["'][^"']*\bll-card__tags\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i;

function attribute(block, name) {
  const pattern = new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i");
  const match = block.match(pattern);
  return match ? match[1] : "";
}

function htmlUnescape(text) {
  return String(text)
    .replace(/&#x([0-9a-fA-F]+);/g, (entity, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (entity, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function plainText(html) {
  return htmlUnescape(String(html).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function truncate(text, limit) {
  const trimmed = String(text).trim();
  const characters = Array.from(trimmed);
  return characters.length <= limit ? trimmed : characters.slice(0, limit).join("") + "...";
}

function absoluteAddress(raw, base) {
  let text = htmlUnescape(String(raw || "")).trim();
  if (text === "") {
    return "";
  }
  if (text.indexOf("#") > 0) {
    text = text.slice(0, text.indexOf("#"));
  }
  try {
    const resolved = host.resolveUrl(base, text);
    return /^https?:\/\//i.test(resolved) ? resolved : "";
  } catch (error) {
    return "";
  }
}

function readState() {
  let raw = "";
  try {
    raw = host.loadState("site");
  } catch (error) {
    return {};
  }
  if (!raw) {
    return {};
  }
  try {
    const value = JSON.parse(raw);
    return value !== null && typeof value === "object" ? value : {};
  } catch (error) {
    return {};
  }
}

function writeState(state) {
  try {
    host.saveState("site", JSON.stringify(state));
  } catch (error) {
    host.log("蓝果短剧写入站点状态失败：" + error.message);
  }
}

function usableBase(base) {
  return typeof base === "string" && /^https:\/\/[a-z0-9][a-z0-9.-]{2,80}$/i.test(base);
}

function probeBase(base) {
  let body = "";
  try {
    body = host.fetchText({ url: base + "/duanju/", referer: base + "/", userAgent }).body;
  } catch (error) {
    return "";
  }
  return typeof body === "string" && body.indexOf("ll-card") >= 0 ? base : "";
}

const tldPattern = /^(?:cc|com|me|icu|ai|tv|net|dev|top|xyz|site|online|vip|club|app|co|io|info|pro|link|fun|live|shop|store|ren|wang|cn|hk|tw|us|uk|de|jp|ru|sbs|cyou|buzz|life|world|space|website|press|today|media)$/;

function addHost(bases, name) {
  const host = String(name || "").toLowerCase();
  if (host === "" || host.length > 80 || ignoredHostPattern.test(host)) {
    return;
  }
  const labels = host.split(".");
  if (labels.length < 2 || !tldPattern.test(labels[labels.length - 1])) {
    return;
  }
  for (const label of labels) {
    if (label === "") {
      return;
    }
  }
  const base = "https://" + host;
  if (bases.indexOf(base) < 0) {
    bases.push(base);
  }
}

function publishedBases() {
  const bases = [];
  for (const page of publishPages) {
    let body = "";
    try {
      body = host.fetchText({ url: page, referer: page, userAgent }).body;
    } catch (error) {
      continue;
    }
    if (typeof body !== "string" || body === "") {
      continue;
    }
    let match;
    const absolute = /https?:\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,12})(?=[\/"'\s:?#<),]|$)/gi;
    while ((match = absolute.exec(body)) !== null) {
      addHost(bases, match[1]);
      if (bases.length >= 24) {
        break;
      }
    }
    const bare = /\b((?:[a-z0-9][a-z0-9-]{0,62}\.)+[a-z]{2,12})\b/gi;
    while ((match = bare.exec(body)) !== null) {
      addHost(bases, match[1]);
      if (bases.length >= 24) {
        break;
      }
    }
  }
  return bases;
}

function currentBase(force) {
  const state = readState();
  const now = Date.now();
  const checkedAt = parseInt(state.checkedAt, 10) || 0;
  if (!force && usableBase(state.base) && now - checkedAt < baseCacheAge) {
    return state.base;
  }
  const candidates = [];
  const push = (base) => {
    if (usableBase(base) && candidates.indexOf(base) < 0) {
      candidates.push(base);
    }
  };
  push(state.base);
  for (const base of publishedBases()) {
    push(base);
  }
  for (const base of seedBases) {
    push(base);
  }
  for (const base of candidates) {
    if (probeBase(base) !== "") {
      const known = Array.isArray(state.bases) ? state.bases : [];
      const bases = [base];
      for (const entry of known.concat(candidates)) {
        if (entry !== base && usableBase(entry) && bases.indexOf(entry) < 0) {
          bases.push(entry);
        }
      }
      writeState({ base, checkedAt: now, bases: bases.slice(0, 24) });
      if (state.base && state.base !== base) {
        host.log("蓝果短剧切换线路：" + state.base + " -> " + base);
      }
      return base;
    }
  }
  return usableBase(state.base) ? state.base : seedBases[0];
}

function fetchPage(path) {
  let base = currentBase(false);
  try {
    const response = host.fetchText({ url: base + path, referer: base + "/", userAgent });
    return { body: response.body, pageUrl: response.url || base + path };
  } catch (error) {
    host.log("蓝果短剧请求失败，重新查找可用线路：" + error.message);
  }
  base = currentBase(true);
  const response = host.fetchText({ url: base + path, referer: base + "/", userAgent });
  return { body: response.body, pageUrl: response.url || base + path };
}

function pathOf(address) {
  const match = /^https?:\/\/[^/]+(\/[^?#]*)?/i.exec(address);
  return match && match[1] ? match[1] : "/";
}

function categoryPath(category) {
  if (category === "" || category === "duanju") {
    return "/duanju/";
  }
  if (category === "hot") {
    return "/duanju/hot/";
  }
  if (category === "original") {
    return "/original/";
  }
  if (category === "gv") {
    return "/gv/";
  }
  if (category === "gv-hot") {
    return "/gv/hot/";
  }
  const tag = /^tag:([a-z0-9-]{1,40})$/.exec(category);
  if (tag) {
    return "/duanju/tags/" + tag[1] + "/";
  }
  const gvTag = /^gv-tag:([a-z0-9-]{1,40})$/.exec(category);
  if (gvTag) {
    return "/gv/tags/" + gvTag[1] + "/";
  }
  return "";
}

function validCategory(category) {
  return categoryPath(category) !== "";
}

function pageable(category) {
  return category !== "" && category.indexOf("tag:") !== 0 && category.indexOf("gv-tag:") !== 0;
}

function cardTags(block) {
  const box = block.match(tagBoxPattern);
  if (!box) {
    return [];
  }
  const tags = [];
  let match;
  anchorPattern.lastIndex = 0;
  while ((match = anchorPattern.exec(box[1])) !== null) {
    const name = plainText(match[2]);
    if (name !== "" && tags.indexOf(name) < 0 && Array.from(name).length <= 24) {
      tags.push(name);
    }
    if (tags.length >= 6) {
      break;
    }
  }
  return tags;
}

function cardCover(block, pageUrl) {
  const images = block.match(new RegExp(imagePattern.source, "gi")) || [];
  for (const image of images) {
    for (const name of ["data-src", "data-original", "src"]) {
      const raw = attribute(image, name);
      if (raw === "" || raw.indexOf("cover-placeholder") >= 0 || raw.indexOf("/static/web/images/") >= 0) {
        continue;
      }
      const address = absoluteAddress(raw, pageUrl);
      if (address !== "") {
        return address;
      }
    }
  }
  return "";
}

function parseCards(body, pageUrl, categoryName) {
  const items = [];
  const seen = new Set();
  let match;
  cardPattern.lastIndex = 0;
  while ((match = cardPattern.exec(body)) !== null) {
    const block = match[0];
    if (block.indexOf("ll-card--skeleton") >= 0) {
      continue;
    }
    let sourceId = attribute(block, "data-track-id").trim();
    if (!numericIdPattern.test(sourceId)) {
      const href = block.match(/\/video\/([0-9]{1,18})\//);
      sourceId = href ? href[1] : "";
    }
    if (!numericIdPattern.test(sourceId) || seen.has(sourceId)) {
      continue;
    }
    let title = htmlUnescape(attribute(block, "data-track-title")).trim();
    if (title === "") {
      const heading = block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
      title = heading ? plainText(heading[1]) : "";
    }
    if (title === "") {
      const image = block.match(/<img\b[^>]*\balt=["']([^"']*)["']/i);
      title = image ? htmlUnescape(image[1]).trim() : "";
    }
    if (title === "") {
      continue;
    }
    seen.add(sourceId);
    const cover = cardCover(block, pageUrl);
    const scoreMatch = block.match(/ll-card__score[^>]*>([\s\S]*?)</i);
    const score = scoreMatch ? plainText(scoreMatch[1]).replace(/分$/, "") : "";
    const episodeMatch = block.match(/ll-card__ep[^>]*>([\s\S]*?)</i);
    const episodeText = episodeMatch ? plainText(episodeMatch[1]) : "";
    const badgeMatch = block.match(/ll-card__badge[^>]*>([\s\S]*?)</i);
    const badge = badgeMatch ? plainText(badgeMatch[1]) : "";
    const drama = {
      id: host.dramaId(sourceId),
      source: host.source,
      sourceId,
      title: truncate(title, 512),
      name: truncate(title, 512),
      cover,
      coverUrl: cover,
      channelName,
      categoryName: categoryName || "",
      remark: truncate(episodeText || badge, 64),
      badge: truncate(badge || episodeText, 64),
    };
    if (score !== "") {
      drama.score = score;
    }
    const tags = cardTags(block);
    if (tags.length > 0) {
      drama.tags = tags;
    }
    const count = episodeText.match(/([0-9]{1,5})\s*集/);
    if (count) {
      const total = parseInt(count[1], 10);
      if (total > 0) {
        drama.totalEpisode = total;
        drama.episodeCount = total;
      }
    }
    items.push(drama);
    if (items.length >= 500) {
      break;
    }
  }
  return items;
}

function hasNextPage(body) {
  return /aria-label=["']下一页["']/i.test(body);
}

function categoryNameOf(category, body) {
  const heading = body.match(/<div\b[^>]*\bclass=["'][^"']*\bllb-result-head\b[^"']*["'][^>]*>\s*<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  if (heading) {
    return plainText(heading[1]);
  }
  const names = { "": "男同短剧", hot: "短剧热播", original: "蓝果原创", gv: "男同GV", "gv-hot": "GV 热播" };
  return names[category] || "";
}

function collectTags(body, prefix, label) {
  const found = [];
  const seen = new Set();
  let match;
  anchorPattern.lastIndex = 0;
  while ((match = anchorPattern.exec(body)) !== null) {
    const attributes = match[1];
    if (!/\bll-chip\b/.test(attributes)) {
      continue;
    }
    const href = attribute(attributes, "href");
    const tag = new RegExp("^/" + prefix + "/tags/([a-z0-9-]{1,40})/?$").exec(href);
    if (!tag || seen.has(tag[1])) {
      continue;
    }
    const name = plainText(match[2]);
    if (name === "" || Array.from(name).length > 12) {
      continue;
    }
    seen.add(tag[1]);
    found.push({ id: (label ? "gv-tag:" : "tag:") + tag[1], name });
    if (found.length >= 40) {
      break;
    }
  }
  return found;
}

function initialData(body) {
  const match = body.match(initialDataPattern);
  if (!match) {
    return null;
  }
  let raw = match[1].trim();
  if (raw === "" || raw[0] !== "{") {
    raw = htmlUnescape(raw);
  }
  try {
    const value = JSON.parse(raw);
    return value !== null && typeof value === "object" ? value : null;
  } catch (error) {
    return null;
  }
}

function mainAttributes(body) {
  const match = body.match(mainTagPattern);
  if (!match) {
    return {};
  }
  const values = {};
  const pattern = /\b(data-[a-z-]+)\s*=\s*["']([^"']*)["']/gi;
  let found;
  while ((found = pattern.exec(match[0])) !== null) {
    values[found[1].toLowerCase()] = htmlUnescape(found[2]);
  }
  return values;
}

function cleanTitle(title) {
  let text = plainText(title);
  for (const suffix of [" - 蓝果短剧", "-蓝果短剧", "_蓝果短剧", " | 蓝果短剧"]) {
    if (text.slice(-suffix.length) === suffix) {
      text = text.slice(0, text.length - suffix.length);
    }
  }
  return text.trim();
}

function episodeAddress(pageUrl, sourceId, episode) {
  const origin = pageUrl.slice(0, pageUrl.indexOf("/video/"));
  return episode <= 1 ? origin + "/video/" + sourceId + "/" : origin + "/video/" + sourceId + "/ep-" + episode + "/";
}

function episodeTotal(body, data) {
  const attributes = mainAttributes(body);
  const declared = parseInt(attributes["data-total"] || "", 10);
  if (declared > 0 && declared <= 5000) {
    return declared;
  }
  let total = 0;
  if (data && data.epPlaySrcs && typeof data.epPlaySrcs === "object") {
    for (const key of Object.keys(data.epPlaySrcs)) {
      const number = parseInt(key, 10);
      if (number > total) {
        total = number;
      }
    }
  }
  return total > 0 ? total : 1;
}

function detailMetadata(body, pageUrl, sourceId, data) {
  const attributes = mainAttributes(body);
  let title = cleanTitle(data && typeof data.title === "string" ? data.title : "");
  if (title === "") {
    const og = body.match(ogTitlePattern);
    title = og ? cleanTitle(og[1]) : cleanTitle(attributes["data-title"] || "");
  }
  if (title === "") {
    title = "蓝果短剧 " + sourceId;
  }
  let description = data && typeof data.description === "string" ? htmlUnescape(data.description) : "";
  if (description === "") {
    const meta = body.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i);
    description = meta ? htmlUnescape(meta[1]) : "";
  }
  let cover = data ? absoluteAddress(data.coverSrc || data.posterSrc || "", pageUrl) : "";
  if (cover === "") {
    const og = body.match(ogImagePattern);
    cover = og ? absoluteAddress(og[1], pageUrl) : "";
  }
  const tags = [];
  if (data && Array.isArray(data.tags)) {
    for (const entry of data.tags) {
      const name = plainText(typeof entry === "string" ? entry : entry && entry.name);
      if (name !== "" && tags.indexOf(name) < 0) {
        tags.push(name);
      }
    }
  }
  const views = data && data.views !== undefined && data.views !== null ? plainText(String(data.views)) : "";
  const onlineDate = data && typeof data.time === "string" ? data.time.trim().slice(0, 10) : "";
  const drama = {
    id: host.dramaId(sourceId),
    source: host.source,
    sourceId,
    title: truncate(title, 512),
    name: truncate(title, 512),
    desc: truncate(description, 12000),
    intro: truncate(description, 12000),
    cover,
    coverUrl: cover,
    channelName,
    categoryName: attributes["data-gv"] !== "" && attributes["data-gv"] !== undefined ? "男同GV" : "男同短剧",
  };
  if (tags.length > 0) {
    drama.tags = tags;
  }
  if (views !== "") {
    drama.views = views;
  }
  if (onlineDate !== "") {
    drama.onlineDate = onlineDate;
  }
  if (data && data.score !== undefined && data.score !== null) {
    const score = plainText(String(data.score));
    if (score !== "") {
      drama.score = score;
    }
  }
  return drama;
}

function dramaSourceId(task) {
  const prefix = host.source + ":";
  if (!task.dramaId || task.dramaId.indexOf(prefix) !== 0) {
    return "";
  }
  const sourceId = task.dramaId.slice(prefix.length).trim();
  return numericIdPattern.test(sourceId) ? sourceId : "";
}

function chapterEpisode(task, sourceId) {
  const chapter = task.chapter || {};
  const prefix = host.chapterId(sourceId, "");
  if (typeof chapter.id === "string" && chapter.id.indexOf(prefix) === 0) {
    const value = chapter.id.slice(prefix.length).trim();
    if (/^[0-9]{1,5}$/.test(value)) {
      return parseInt(value, 10);
    }
  }
  const fromPage = /\/ep-([0-9]{1,5})\/?/.exec(String(chapter.pageUrl || chapter.videoUrl || ""));
  return fromPage ? parseInt(fromPage[1], 10) : 0;
}

module.exports = {
  validCategory,

  categories(force) {
    const cached = host.cacheGet("categories");
    if (cached !== null && cached !== undefined && !force) {
      return cached;
    }
    const categories = [
      { id: "", name: "全部短剧" },
      { id: "hot", name: "短剧热播" },
      { id: "original", name: "蓝果原创" },
    ];
    try {
      const dramaPage = fetchPage("/duanju/");
      for (const entry of collectTags(dramaPage.body, "duanju", false)) {
        categories.push(entry);
      }
    } catch (error) {
      host.log("蓝果短剧分类读取失败：" + error.message);
    }
    categories.push({ id: "gv", name: "男同GV" });
    try {
      const gvPage = fetchPage("/gv/");
      for (const entry of collectTags(gvPage.body, "gv", true)) {
        categories.push(entry);
      }
    } catch (error) {
      host.log("蓝果短剧 GV 分类读取失败：" + error.message);
    }
    host.cacheSet("categories", categories, 3600000);
    return categories;
  },

  catalogPage(page, category) {
    const path = categoryPath(category);
    if (path === "") {
      throw new Error("蓝果短剧没有分类 " + category);
    }
    if (page < 1 || page > 10000) {
      return { items: [], hasMore: false };
    }
    if (page > 1 && !pageable(category)) {
      return { items: [], hasMore: false };
    }
    const address = page <= 1 ? path : path.replace(/\/$/, "") + "/" + page + "/";
    const response = fetchPage(address);
    const items = parseCards(response.body, response.pageUrl, categoryNameOf(category, response.body));
    return { items, hasMore: hasNextPage(response.body) };
  },

  search(page, query) {
    const keyword = String(query || "").trim();
    if (page < 1 || keyword === "") {
      return { items: [], hasMore: false };
    }
    if (page > 1) {
      return { items: [], hasMore: false };
    }
    const escaped = encodeURIComponent(keyword).replace(/%20/g, "+");
    const channels = [
      { path: "/search/video/" + escaped + "/", name: "男同短剧" },
      { path: "/search/gv/" + escaped + "/", name: "男同GV" },
    ];
    const items = [];
    const seen = new Set();
    let failure = null;
    let succeeded = false;
    for (const entry of channels) {
      let response;
      try {
        response = fetchPage(entry.path);
      } catch (error) {
        failure = error;
        continue;
      }
      succeeded = true;
      for (const drama of parseCards(response.body, response.pageUrl, entry.name)) {
        if (seen.has(drama.sourceId)) {
          continue;
        }
        seen.add(drama.sourceId);
        items.push(drama);
      }
    }
    if (!succeeded) {
      throw failure || new Error("蓝果短剧搜索失败");
    }
    return { items, hasMore: false };
  },

  detail(sourceId) {
    if (!numericIdPattern.test(sourceId)) {
      throw new Error("蓝果短剧剧集 ID 无效");
    }
    const response = fetchPage("/video/" + sourceId + "/");
    const data = initialData(response.body);
    if (data && typeof data.id === "string" && data.id !== "" && data.id !== sourceId) {
      throw new Error("蓝果短剧详情与请求剧集不符");
    }
    const drama = detailMetadata(response.body, response.pageUrl, sourceId, data);
    const total = episodeTotal(response.body, data);
    const chapters = [];
    for (let episode = 1; episode <= total; episode++) {
      chapters.push({
        id: host.chapterId(sourceId, String(episode)),
        source: host.source,
        title: "第" + episode + "集",
        currentEpisode: episode,
        videoUrl: "languo-episode://" + sourceId + "/" + episode,
        pageUrl: episodeAddress(response.pageUrl, sourceId, episode),
        referer: originOf(response.pageUrl) + "/",
      });
    }
    drama.totalEpisode = total;
    drama.episodeCount = total;
    drama.remark = "共 " + total + " 集";
    return { drama, chapters };
  },

  resolveMedia(task) {
    const sourceId = dramaSourceId(task);
    if (sourceId === "") {
      throw new Error("蓝果短剧播放分集信息无效，请刷新详情");
    }
    const episode = chapterEpisode(task, sourceId);
    if (!(episode >= 1)) {
      throw new Error("蓝果短剧播放分集信息无效，请刷新详情");
    }
    const pageUrl = (task.chapter && task.chapter.pageUrl) || "/video/" + sourceId + "/ep-" + episode + "/";
    const response = fetchPage(pathOf(pageUrl));
    const data = initialData(response.body);
    if (!data) {
      throw new Error("蓝果短剧没有返回播放数据");
    }
    let raw = "";
    if (data.epPlaySrcs && typeof data.epPlaySrcs === "object") {
      raw = data.epPlaySrcs[String(episode)] || "";
      if (raw === "") {
        for (const key of Object.keys(data.epPlaySrcs)) {
          if (raw === "" && String(data.epPlaySrcs[key] || "").trim() !== "") {
            raw = data.epPlaySrcs[key];
          }
        }
      }
    }
    if (raw === "") {
      raw = data.videoSrc || data.videoUrl || data.playUrl || "";
    }
    if (raw === "") {
      const attributeMatch = response.body.match(/\bdata-play-src=["']([^"']+)["']/i);
      raw = attributeMatch ? attributeMatch[1] : "";
    }
    const address = absoluteAddress(raw, response.pageUrl);
    if (address === "") {
      throw new Error("蓝果短剧该集暂无可播放地址");
    }
    return host.prepareWebMedia({ url: address, referer: originOf(response.pageUrl) + "/" }, channelName);
  },
};

function originOf(pageUrl) {
  try {
    const address = host.parseUrl(pageUrl);
    return address.scheme + "://" + address.host;
  } catch (error) {
    return currentBase(false);
  }
}
