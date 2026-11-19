const site = "https://thegay.com";
const siteName = "TheGay";
const apiRoot = site + "/api";
const listCount = 60;
const listLifetime = 86400;
const listRetryLifetime = 43200;
const detailLifetime = 86400;
const fileLifetime = 864000;
const categoriesLifetime = 14400;
const pageLimit = 2000;
const searchPageLimit = 500;
const categoriesCacheKey = "categories";
const categoriesCacheTTL = 12 * 60 * 60 * 1000;
const pageStatePrefix = "page-";

const sortCategories = [
  { id: "sort-top-rated", name: "最高评分", sort: "top-rated", date: "" },
  { id: "sort-most-popular", name: "最热", sort: "most-popular", date: "day" },
  { id: "sort-longest", name: "最长", sort: "longest", date: "" },
];

const homoglyphs = {
  "\u0410": "A",
  "\u0412": "B",
  "\u0415": "E",
  "\u041a": "K",
  "\u041c": "M",
  "\u041d": "H",
  "\u041e": "O",
  "\u0420": "P",
  "\u0421": "C",
  "\u0422": "T",
  "\u0423": "Y",
  "\u0425": "X",
  "\u0405": "S",
  "\u0406": "I",
  "\u0408": "J",
  "\u0391": "A",
  "\u0392": "B",
  "\u0395": "E",
  "\u0396": "Z",
  "\u0397": "H",
  "\u0399": "I",
  "\u039a": "K",
  "\u039c": "M",
  "\u039d": "N",
  "\u039f": "O",
  "\u03a1": "P",
  "\u03a4": "T",
  "\u03a5": "Y",
  "\u03a7": "X",
};

function clean(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, limit) {
  const characters = Array.from(clean(text));
  return characters.length <= limit ? characters.join("") : characters.slice(0, limit).join("") + "…";
}

function digitsOf(value) {
  const text = clean(value);
  return /^[0-9]{1,18}$/.test(text) ? text : "";
}

function errorText(error) {
  const message = error && error.message ? String(error.message) : String(error);
  return message.length > 160 ? message.slice(0, 160) : message;
}

function normalizeDuration(value) {
  const text = clean(value);
  const match = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?$/.exec(text);
  if (!match) {
    return "";
  }
  const head = match[1].length === 1 ? "0" + match[1] : match[1];
  return match[3] === undefined ? head + ":" + match[2] : head + ":" + match[2] + ":" + match[3];
}

function cascadeOf(id) {
  const value = Number(id);
  return String(Math.floor(value / 1000000) * 1000000) + "/" + String(Math.floor(value / 1000) * 1000);
}

function shotDirectory(id) {
  const value = Number(id);
  return String(Math.floor(value / 1000) * 1000) + "/" + id;
}

function watchUrl(id, dir) {
  return site + "/videos/" + id + "/" + (clean(dir) === "" ? "video" : clean(dir)) + "/";
}

function fetchText(url, referer) {
  const response = host.fetchText({ url, referer: referer || site + "/" });
  return response && typeof response.body === "string" ? response.body : "";
}

function apiJson(url, referer) {
  const body = fetchText(url, referer);
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(siteName + " 返回的内容无法解析");
  }
}

function sortEntry(category) {
  for (const entry of sortCategories) {
    if (entry.id === category) {
      return entry;
    }
  }
  return null;
}

function validCategory(category) {
  const value = typeof category === "string" ? category.trim() : "";
  if (value === "" || sortEntry(value) !== null) {
    return true;
  }
  return /^[a-z0-9][a-z0-9._-]{0,80}$/.test(value);
}

function baseCategories() {
  const items = [];
  for (const entry of sortCategories) {
    items.push({ id: entry.id, name: entry.name });
  }
  return items;
}

function categoriesUrl() {
  return apiRoot + "/json/categories/" + categoriesLifetime + "/str.all.en.json";
}

function readCachedCategories() {
  const cached = host.cacheGet(categoriesCacheKey);
  if (typeof cached !== "string" || cached === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (error) {
    return null;
  }
}

function remoteCategories() {
  const data = apiJson(categoriesUrl(), site + "/categories/");
  const raw = data && Array.isArray(data.categories) ? data.categories : [];
  const items = [];
  const seen = new Set();
  for (const entry of raw) {
    const id = clean(entry && entry.dir);
    const name = clean(entry && entry.title);
    if (id === "" || name === "" || seen.has(id) || !validCategory(id)) {
      continue;
    }
    seen.add(id);
    items.push({ id: id, name: truncate(name, 40) });
  }
  return items;
}

function categoryNameOf(category) {
  if (category === "") {
    return "最新";
  }
  const entry = sortEntry(category);
  if (entry) {
    return entry.name;
  }
  const cached = readCachedCategories();
  if (cached) {
    for (const item of cached) {
      if (item.id === category) {
        return item.name;
      }
    }
  }
  return "";
}

function catalogUrl(page, category, lifetime) {
  const entry = sortEntry(category);
  let section = "";
  let objectId = "";
  let sort = "latest-updates";
  let date = "";
  if (entry) {
    sort = entry.sort;
    date = entry.date;
  } else if (category !== "") {
    section = "categories";
    objectId = category;
  }
  const params = [section, objectId, String(page), "all", "", date, "json"].join(".");
  return apiRoot + "/json/videos2/" + lifetime + "/str/" + sort + "/" + listCount + "/" + params;
}

function parseVideoPage(body) {
  let data = null;
  try {
    data = JSON.parse(body);
  } catch (error) {
    throw new Error(siteName + " 列表读取失败：站点没有返回 JSON");
  }
  if (data && data.error) {
    const code = clean(data.code) || clean(data.msg) || "unknown";
    if (code === "videos_not_found") {
      return { videos: [], pages: 0 };
    }
    throw new Error(siteName + " 列表读取失败：" + code);
  }
  return {
    videos: data && Array.isArray(data.videos) ? data.videos : [],
    pages: data && Number(data.pages) > 0 ? Number(data.pages) : 0,
  };
}

function coverOf(video, id) {
  const direct = clean(video && video.scr) || clean(video && video.thumb);
  if (/^https?:\/\//i.test(direct)) {
    return direct;
  }
  return "https://tn.thegay.com/contents/videos_screenshots/" + shotDirectory(id) + "/240x180/1.jpg";
}

function tagList(raw) {
  const names = [];
  const text = clean(raw);
  if (text === "") {
    return names;
  }
  for (const part of text.split(",")) {
    const name = clean(part);
    if (name !== "" && names.indexOf(name) < 0 && Array.from(name).length <= 40) {
      names.push(name);
    }
  }
  return names;
}

function categoryDataNames(raw) {
  const names = [];
  const text = clean(raw);
  if (text === "") {
    return names;
  }
  for (const part of text.split(",")) {
    const fields = String(part).split("|");
    const name = clean(fields.length > 2 ? fields[2] : part);
    if (name !== "" && names.indexOf(name) < 0) {
      names.push(name);
    }
  }
  return names;
}

function mapTitles(value) {
  const names = [];
  if (!value || typeof value !== "object") {
    return names;
  }
  for (const key of Object.keys(value)) {
    const entry = value[key];
    const name = clean(entry && entry.title);
    if (name !== "" && names.indexOf(name) < 0 && Array.from(name).length <= 40) {
      names.push(name);
    }
  }
  return names;
}

function videoDrama(video, category) {
  const id = digitsOf(video && video.video_id);
  if (id === "") {
    return null;
  }
  const title = truncate(video.title, 512) || id;
  const cover = coverOf(video, id);
  const categories = categoryDataNames(video.categories_data);
  const drama = {
    id: host.dramaId(id),
    source: host.source,
    sourceId: id,
    title: title,
    name: title,
    cover: cover,
    coverUrl: cover,
    channelName: siteName,
    categoryName: categories.length > 0 ? categories[0] : categoryNameOf(category),
    sourceUrl: watchUrl(id, video.dir),
  };
  const duration = normalizeDuration(video.duration);
  if (duration !== "") {
    drama.duration = duration;
    drama.remark = duration;
  }
  const tags = tagList(video.tags);
  if (tags.length > 0) {
    drama.tags = tags.slice(0, 12);
  }
  const date = clean(video.post_date);
  if (date.length >= 10) {
    drama.onlineDate = date.slice(0, 10);
  }
  return drama;
}

function videoList(videos, category) {
  const items = [];
  const seen = new Set();
  for (const video of videos) {
    const drama = videoDrama(video, category);
    if (drama === null || seen.has(drama.sourceId)) {
      continue;
    }
    seen.add(drama.sourceId);
    items.push(drama);
  }
  return items;
}

function signatureOf(items) {
  const parts = [];
  for (const item of items.slice(0, 6)) {
    parts.push(item.sourceId);
  }
  return parts.join("|");
}

function readPageState(key) {
  try {
    const raw = host.loadState(pageStatePrefix + key);
    const parsed = raw === "" ? null : JSON.parse(raw);
    return parsed && typeof parsed.page === "number" && typeof parsed.signature === "string" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function writePageState(key, page, signature) {
  try {
    host.saveState(pageStatePrefix + key, JSON.stringify({ page: page, signature: signature }));
  } catch (error) {
    return;
  }
}

function pageKey(category) {
  return category === "" ? "latest" : category;
}

function hasMorePages(parsed, page, count) {
  if (parsed.pages > 0) {
    return page < parsed.pages;
  }
  return count >= listCount;
}

function detailUrl(id) {
  return apiRoot + "/json/video/" + detailLifetime + "/" + cascadeOf(id) + "/" + id + ".json";
}

function detailDrama(video, id) {
  const title = truncate(video.title, 512) || id;
  const cover = coverOf(video, id);
  const categories = mapTitles(video.categories);
  const tags = mapTitles(video.tags);
  const duration = normalizeDuration(video.duration);
  const viewed = clean(video.statistics && video.statistics.viewed);
  const uploader = clean(video.user && video.user.username);
  const description = clean(video.description);
  let intro = description;
  if (intro === "") {
    intro = tags.length > 0 ? "标签：" + tags.join(" / ") : "男同影片";
  }
  if (uploader !== "") {
    intro = intro + " · 上传者 " + uploader;
  }
  const drama = {
    id: host.dramaId(id),
    source: host.source,
    sourceId: id,
    title: title,
    name: title,
    desc: truncate(intro, 1500),
    intro: truncate(intro, 1500),
    cover: cover,
    coverUrl: cover,
    channelName: siteName,
    categoryName: categories.length > 0 ? categories[0] : "",
    sourceUrl: watchUrl(id, video.dir),
  };
  if (duration !== "") {
    drama.duration = duration;
    drama.remark = duration;
  }
  if (tags.length > 0) {
    drama.tags = tags.slice(0, 16);
  }
  if (viewed !== "" && viewed !== "0") {
    drama.views = viewed;
  }
  const date = clean(video.post_date);
  if (date.length >= 10) {
    drama.onlineDate = date.slice(0, 10);
  }
  return drama;
}

function videoIdOf(task) {
  const prefix = host.source + ":";
  let value = task && typeof task.dramaId === "string" ? task.dramaId.trim() : "";
  if (value.indexOf(prefix) === 0) {
    value = value.slice(prefix.length).trim();
  }
  if (digitsOf(value) !== "") {
    return value;
  }
  const chapter = (task && task.chapter) || {};
  for (const candidate of [chapter.pageUrl, chapter.videoUrl]) {
    const match = /\/videos\/([0-9]{1,18})\//.exec(String(candidate === undefined || candidate === null ? "" : candidate));
    if (match) {
      return match[1];
    }
  }
  return "";
}

function watchPageOf(task) {
  const chapter = (task && task.chapter) || {};
  for (const candidate of [chapter.pageUrl, chapter.videoUrl]) {
    const text = String(candidate === undefined || candidate === null ? "" : candidate).trim();
    if (/^https?:\/\/[^/]*thegay\.com\/videos\//i.test(text)) {
      return text;
    }
  }
  return site + "/";
}

function base64Text(text) {
  const padding = (4 - (text.length % 4)) % 4;
  const padded = text + "==========".slice(0, padding);
  const candidates = [padded, padded.replace(/\+/g, "-").replace(/\//g, "_")];
  for (const candidate of candidates) {
    try {
      const bytes = host.base64Decode(candidate);
      const decoded = host.utf8Decode(bytes);
      if (decoded !== "") {
        return decoded;
      }
    } catch (error) {
      continue;
    }
  }
  return "";
}

function decodeFilePath(value) {
  let text = String(value === undefined || value === null ? "" : value).trim();
  if (text === "") {
    return "";
  }
  if (/^https?:\/\//i.test(text)) {
    return text;
  }
  text = text.replace(/~+$/, "");
  let mapped = "";
  for (const character of text) {
    if (homoglyphs[character] !== undefined) {
      mapped += homoglyphs[character];
    } else if (character === ",") {
      mapped += "+";
    } else if (character !== "\u00a0" && character !== " ") {
      mapped += character;
    }
  }
  const plain = base64Text(mapped).trim();
  if (plain === "") {
    return "";
  }
  let path = plain.replace(/>/g, "?");
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.indexOf("/") !== 0) {
    path = "/" + path;
  }
  if (path.indexOf("/get_file/") !== 0) {
    return "";
  }
  return site + path;
}

function failureText(list) {
  const code = clean(list && list.code);
  const message = clean(list && list.msg);
  const value = code || message;
  if (value === "not_found") {
    return "影片文件不存在";
  }
  if (value === "") {
    return "错误";
  }
  return value;
}

function fileAddress(id, referer, reasons) {
  let body = "";
  try {
    body = fetchText(apiRoot + "/videofile.php?video_id=" + id + "&lifetime=" + fileLifetime, referer);
  } catch (error) {
    reasons.push("取文件接口失败（" + errorText(error) + "）");
    return "";
  }
  let list = null;
  try {
    list = JSON.parse(body);
  } catch (error) {
    reasons.push("文件接口没有返回 JSON");
    return "";
  }
  if (list && list.error) {
    reasons.push("站点返回 " + failureText(list));
    return "";
  }
  if (!Array.isArray(list) || list.length === 0) {
    reasons.push("站点没有返回文件列表");
    return "";
  }
  let chosen = null;
  for (const entry of list) {
    if (chosen === null && String(entry && entry.format).indexOf("mp4") >= 0) {
      chosen = entry;
    }
  }
  if (chosen === null) {
    chosen = list[0];
  }
  const address = decodeFilePath(chosen && chosen.video_url);
  if (address === "") {
    reasons.push("文件地址无法解码");
    return "";
  }
  return address;
}

module.exports = {
  validCategory: validCategory,

  categories() {
    const cached = readCachedCategories();
    if (cached !== null) {
      return cached;
    }
    let remote = [];
    try {
      remote = remoteCategories();
    } catch (error) {
      host.log(siteName + " 分类列表取失败：" + errorText(error));
    }
    if (remote.length === 0) {
      return baseCategories();
    }
    const items = baseCategories().concat(remote);
    try {
      host.cacheSet(categoriesCacheKey, JSON.stringify(items), categoriesCacheTTL);
    } catch (error) {
      host.log(siteName + " 分类缓存写入失败：" + errorText(error));
    }
    return items;
  },

  catalogPage(page, category) {
    const value = typeof category === "string" ? category.trim() : "";
    if (!validCategory(value)) {
      throw new Error(siteName + "没有分类 " + value);
    }
    if (!(page >= 1) || page > pageLimit) {
      return { items: [], hasMore: false };
    }
    const key = pageKey(value);
    const previous = readPageState(key);
    let parsed = parseVideoPage(fetchText(catalogUrl(page, value, listLifetime), site + "/"));
    let items = videoList(parsed.videos, value);
    let signature = signatureOf(items);
    if (page > 1 && previous !== null && previous.page === page - 1 && previous.signature === signature) {
      const retry = parseVideoPage(fetchText(catalogUrl(page, value, listRetryLifetime), site + "/"));
      const other = videoList(retry.videos, value);
      const otherSignature = signatureOf(other);
      if (other.length > 0 && otherSignature !== previous.signature) {
        parsed = retry;
        items = other;
        signature = otherSignature;
      }
    }
    const repeated = previous !== null && previous.page === page - 1 && previous.signature === signature;
    writePageState(key, page, signature);
    return {
      items: items,
      hasMore: items.length > 0 && !repeated && hasMorePages(parsed, page, items.length),
    };
  },

  search(page, query) {
    const keyword = clean(query);
    if (!(page >= 1) || keyword === "" || page > searchPageLimit) {
      return { items: [], hasMore: false };
    }
    const url =
      apiRoot +
      "/videos.php?params=" +
      listLifetime +
      "/str/relevance/" +
      listCount +
      "/search.." +
      page +
      ".all...&s=" +
      encodeURIComponent(keyword);
    const parsed = parseVideoPage(fetchText(url, site + "/search/"));
    const items = videoList(parsed.videos, "");
    return {
      items: items,
      hasMore: items.length > 0 && hasMorePages(parsed, page, items.length),
    };
  },

  detail(sourceId) {
    const id = digitsOf(sourceId);
    if (id === "") {
      throw new Error(siteName + "影片地址无效");
    }
    const data = apiJson(detailUrl(id), site + "/videos/" + id + "/");
    const video = data && data.video ? data.video : null;
    if (!video) {
      throw new Error(siteName + " 找不到这部影片，可能已下架");
    }
    const drama = detailDrama(video, id);
    drama.totalEpisode = 1;
    drama.episodeCount = 1;
    const chapters = [
      {
        id: host.chapterId(id, "1"),
        source: host.source,
        title: truncate(drama.title, 128),
        currentEpisode: 1,
        pageUrl: drama.sourceUrl,
        referer: site + "/",
        videoUrl: drama.sourceUrl,
      },
    ];
    return { drama: drama, chapters: chapters };
  },

  resolveMedia(task) {
    const id = videoIdOf(task);
    if (id === "") {
      throw new Error(siteName + "播放信息无效，请刷新详情后重试");
    }
    const referer = watchPageOf(task);
    const reasons = [];
    const address = fileAddress(id, referer, reasons);
    if (address !== "") {
      return host.prepareWebMedia({ url: address, referer: referer }, siteName);
    }
    const summary = reasons.join("；");
    host.log(siteName + " 取播放地址失败：" + summary);
    throw new Error(siteName + "没有取到播放地址：" + (summary || "站点没有返回影片文件"));
  },
};
