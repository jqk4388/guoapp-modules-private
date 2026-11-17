const site = "https://www.gaypornhot.com";
const siteName = "GayPornHot";
const embedReferer = "https://www.gayporntube.net/";
const embedPagePrefix = "https://www.gayporntube.net/embed/";
const embedScheme = "gaypornhot-embed://";
const slugPattern = /^[A-Za-z0-9._~%-]{1,300}$/;
const categoriesList = [
  { id: "", name: "最新" },
  { id: "gay-porn-movies", name: "影片" },
  { id: "onlyfans", name: "OnlyFans" },
  { id: "beefcakehunter", name: "BeefcakeHunter" },
  { id: "belamionline", name: "BelAmi" },
  { id: "staxus", name: "Staxus" },
  { id: "bilatinmen", name: "BilatinMen" },
  { id: "nextdoorstudios", name: "NextDoor" },
  { id: "hotguysfuck", name: "HotGuysFuck" },
  { id: "gayhoopla", name: "GayHoopla" },
  { id: "carnalplus", name: "CarnalPlus" },
  { id: "scoutboys", name: "ScoutBoys" },
  { id: "cockyboys", name: "CockyBoys" },
];
const ignoredCardClasses = ["video-categories", "video-tags", "videopost-inner"];

function classTokens(node) {
  const value = node && node.attrs ? node.attrs.class : "";
  return typeof value === "string" && value !== "" ? value.split(/\s+/) : [];
}

function hasClass(node, name) {
  return classTokens(node).indexOf(name) >= 0;
}

function hasAnyClass(node, names) {
  const tokens = classTokens(node);
  for (let index = 0; index < names.length; index++) {
    if (tokens.indexOf(names[index]) >= 0) {
      return true;
    }
  }
  return false;
}

function attribute(node, name) {
  const value = node && node.attrs ? node.attrs[name] : "";
  return typeof value === "string" ? value : "";
}

function htmlUnescape(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/&#x([0-9a-fA-F]+);/g, (entity, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (entity, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function clean(text) {
  return htmlUnescape(text).replace(/\s+/g, " ").trim();
}

function truncate(text, limit) {
  const trimmed = String(text).trim();
  const characters = Array.from(trimmed);
  return characters.length <= limit ? trimmed : characters.slice(0, limit).join("") + "...";
}

function nodeText(node) {
  let text = "";
  const stack = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    const tag = String(current.tag || "").toLowerCase();
    if (tag === "rt" || tag === "rp" || tag === "script" || tag === "style") {
      continue;
    }
    if (typeof current.text === "string" && current.text !== "") {
      text += current.text;
    }
    const children = current.children || [];
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index]);
    }
  }
  return text;
}

function collect(node, predicate, limit) {
  const found = [];
  const stack = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current !== node && predicate(current)) {
      found.push(current);
      if (limit > 0 && found.length >= limit) {
        return found;
      }
    }
    const children = current.children || [];
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index]);
    }
  }
  return found;
}

function first(node, predicate) {
  const found = collect(node, predicate, 1);
  return found.length > 0 ? found[0] : null;
}

function documentOf(body) {
  return host.parseHtml(body);
}

function categoryPath(category) {
  if (category === "") {
    return "/";
  }
  if (!slugPattern.test(category)) {
    return "";
  }
  return "/category/" + category + "/";
}

function pagePath(path, page) {
  if (page <= 1) {
    return path;
  }
  return path + "page/" + page + "/";
}

function fetchPage(path) {
  const url = site + path;
  const response = host.fetchText({ url, referer: site + "/" });
  return { url: response.url || url, body: response.body };
}

function searchPath(keyword, page) {
  const encoded = encodeURIComponent(keyword).replace(/\+/g, "%20");
  if (page <= 1) {
    return "/?s=" + encoded;
  }
  return "/page/" + page + "/?s=" + encoded;
}

function hasNextPage(body, page) {
  const next = page + 1;
  return (
    String(body).indexOf("/page/" + next + "/") >= 0 ||
    String(body).indexOf("paged=" + next) >= 0 ||
    String(body).indexOf("paged%3D" + next) >= 0
  );
}

function siteHost() {
  return host.parseUrl(site).host;
}

function cardNode(node) {
  if (node.tag !== "div") {
    return false;
  }
  if (ignoredCardClasses.some((name) => hasClass(node, name))) {
    return false;
  }
  if (hasClass(node, "videopost")) {
    return true;
  }
  if (!hasClass(node, "video")) {
    return false;
  }
  return collect(node, (child) => hasClass(child, "thumb-video"), 1).length > 0;
}

function postAddress(node) {
  const anchors = collect(node, (child) => child.tag === "a" && hasClass(child, "thumb-video"), 1);
  const anchor = anchors.length > 0 ? anchors[0] : null;
  let address = anchor ? attribute(anchor, "href") : "";
  if (address === "") {
    const anyAnchor = first(node, (child) => child.tag === "a" && attribute(child, "href") !== "");
    address = anyAnchor ? attribute(anyAnchor, "href") : "";
  }
  if (address === "") {
    return null;
  }
  let resolved;
  try {
    resolved = host.resolveUrl(site + "/", address);
  } catch (error) {
    return null;
  }
  let parsed;
  try {
    parsed = host.parseUrl(resolved);
  } catch (error) {
    return null;
  }
  if (parsed.hostname !== siteHost()) {
    return null;
  }
  const path = parsed.path || "/";
  if (/\/(category|tag|page)\//.test(path) || path === "/") {
    return null;
  }
  const slug = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!slugPattern.test(slug)) {
    return null;
  }
  return { slug, url: "https://" + parsed.host + "/" + slug + "/" };
}

function cardTitle(node) {
  const anchor = first(node, (child) => child.tag === "a" && hasClass(child, "thumb-video"));
  const fromAttribute = anchor ? clean(attribute(anchor, "title")) : "";
  if (fromAttribute !== "") {
    return fromAttribute;
  }
  const titleNode = first(node, (child) => hasAnyClass(child, ["title", "video-title"]));
  if (titleNode) {
    const text = clean(nodeText(titleNode));
    if (text !== "") {
      return text;
    }
  }
  const anchorWithTitle = first(node, (child) => child.tag === "a" && attribute(child, "title") !== "");
  return anchorWithTitle ? clean(attribute(anchorWithTitle, "title")) : "";
}

function cardCover(node) {
  const images = collect(node, (child) => child.tag === "img", 6);
  for (const image of images) {
    for (const name of ["src", "data-src", "data-original", "data-lazy-src"]) {
      const raw = clean(attribute(image, name));
      if (raw === "" || raw.indexOf("data:image") === 0) {
        continue;
      }
      try {
        return host.resolveUrl(site + "/", raw);
      } catch (error) {
        continue;
      }
    }
  }
  return "";
}

function durationText(text) {
  const match = String(text).match(/\b[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\b/);
  return match ? match[0] : "";
}

function cardDuration(node) {
  const marked = collect(node, (child) => hasAnyClass(child, ["time-desc", "ratings", "duration"]), 4);
  for (const entry of marked) {
    const text = durationText(clean(nodeText(entry)));
    if (text !== "" && text.indexOf(":") > 0) {
      return text;
    }
  }
  return "";
}

function categoryNames(node, blockClass) {
  const names = [];
  const block = first(node, (child) => hasClass(child, blockClass));
  if (!block) {
    return names;
  }
  for (const anchor of collect(block, (child) => child.tag === "a", 12)) {
    const name = clean(nodeText(anchor));
    if (name !== "" && names.indexOf(name) < 0 && Array.from(name).length <= 40) {
      names.push(name);
    }
  }
  return names;
}

function parseCards(body) {
  const items = [];
  const seen = new Set();
  const cards = collect(documentOf(body), cardNode);
  for (const card of cards) {
    const post = postAddress(card);
    if (!post || seen.has(post.slug)) {
      continue;
    }
    const title = cardTitle(card);
    if (title === "") {
      continue;
    }
    seen.add(post.slug);
    const cover = cardCover(card);
    const duration = cardDuration(card);
    const names = categoryNames(card, "video-categories");
    const tags = categoryNames(card, "video-tags");
    const drama = {
      id: host.dramaId(post.slug),
      source: host.source,
      sourceId: post.slug,
      title: truncate(title, 512),
      name: truncate(title, 512),
      cover,
      coverUrl: cover,
      channelName: siteName,
      categoryName: names.length > 0 ? names[0] : "",
    };
    if (names.length > 0) {
      drama.tags = names.concat(tags).filter((entry, index, all) => all.indexOf(entry) === index).slice(0, 8);
    } else if (tags.length > 0) {
      drama.tags = tags.slice(0, 8);
    }
    if (duration !== "") {
      drama.duration = duration;
      drama.remark = duration;
    }
    items.push(drama);
    if (items.length >= 300) {
      break;
    }
  }
  return items;
}

function embedIdOf(body) {
  const match = String(body).match(/gayporntube\.net\/embed\/([0-9]{1,12})/i);
  return match ? match[1] : "";
}

function embedAddress(embedId) {
  return embedPagePrefix + embedId;
}

function mediaAddress(body) {
  const pattern = /https?:\/\/[^\s"'\\<>]*gayporntube\.net\/get_file\/[^\s"'\\<>]+/gi;
  let match;
  let fallback = "";
  while ((match = pattern.exec(String(body))) !== null) {
    const candidate = match[0].replace(/&amp;/g, "&").replace(/\\+$/, "");
    if (candidate.indexOf(".mp4") < 0) {
      continue;
    }
    if (fallback === "") {
      fallback = candidate;
    }
    if (candidate.indexOf(".mp4/") >= 0 || /\.mp4(\?|$)/.test(candidate)) {
      return candidate;
    }
  }
  return fallback;
}

function metaContent(body, property) {
  const pattern = new RegExp(
    '<meta[^>]*property=["\']' + property + '["\'][^>]*content=["\']([^"\']*)["\']',
    "i"
  );
  const match = String(body).match(pattern);
  if (match) {
    return clean(match[1]);
  }
  const reversed = new RegExp(
    '<meta[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']' + property + '["\']',
    "i"
  );
  const other = String(body).match(reversed);
  return other ? clean(other[1]) : "";
}

function detailPage(slug) {
  const address = site + "/" + slug + "/";
  const response = host.fetchText({ url: address, referer: site + "/" });
  const body = response.body;
  const doc = documentOf(body);
  const headings = collect(doc, (node) => node.tag === "h1", 2);
  let title = headings.length > 0 ? clean(nodeText(headings[0])) : "";
  if (title === "") {
    title = metaContent(body, "og:title").replace(/\s*[|｜]\s*[^|｜]*$/, "").trim();
  }
  if (title === "") {
    title = slug;
  }
  let cover = metaContent(body, "og:image");
  if (cover !== "") {
    try {
      cover = host.resolveUrl(site + "/", cover);
    } catch (error) {
      cover = "";
    }
  }
  const categories = [];
  const categoryBlock = first(doc, (node) => hasClass(node, "video-categories"));
  if (categoryBlock) {
    for (const anchor of collect(categoryBlock, (node) => node.tag === "a", 10)) {
      const name = clean(nodeText(anchor));
      if (name !== "" && categories.indexOf(name) < 0) {
        categories.push(name);
      }
    }
  }
  const tags = [];
  const tagBlock = first(doc, (node) => hasClass(node, "video-tags"));
  if (tagBlock) {
    for (const anchor of collect(tagBlock, (node) => node.tag === "a", 16)) {
      const name = clean(nodeText(anchor));
      if (name !== "" && tags.indexOf(name) < 0) {
        tags.push(name);
      }
    }
  }
  let duration = "";
  const durationNodes = collect(doc, (node) => hasAnyClass(node, ["time-desc", "video-info-meta", "info-meta", "duration"]), 8);
  for (const node of durationNodes) {
    const text = durationText(clean(nodeText(node)));
    if (text !== "") {
      duration = text;
      break;
    }
  }
  const intro = categories.length > 0 || tags.length > 0
    ? "分类：" + categories.join(" / ") + (tags.length > 0 ? "。演员：" + tags.join("、") : "")
    : "";
  return {
    body,
    drama: {
      id: host.dramaId(slug),
      source: host.source,
      sourceId: slug,
      title: truncate(title, 512),
      name: truncate(title, 512),
      desc: intro,
      intro,
      cover,
      coverUrl: cover,
      channelName: siteName,
      categoryName: categories.length > 0 ? categories[0] : "",
      tags: categories.concat(tags).filter((entry, index, all) => all.indexOf(entry) === index).slice(0, 12),
      remark: duration,
      duration,
    },
    embedId: embedIdOf(body),
  };
}

function dramaSourceId(task) {
  const prefix = host.source + ":";
  const value = task && typeof task.dramaId === "string" ? task.dramaId : "";
  if (value.indexOf(prefix) !== 0) {
    return "";
  }
  const slug = value.slice(prefix.length).trim();
  return slugPattern.test(slug) ? slug : "";
}

function chapterEmbedId(task) {
  const chapter = (task && task.chapter) || {};
  const videoUrl = typeof chapter.videoUrl === "string" ? chapter.videoUrl : "";
  if (videoUrl.indexOf(embedScheme) === 0) {
    const value = videoUrl.slice(embedScheme.length).replace(/[^0-9]/g, "");
    if (value !== "") {
      return value;
    }
  }
  const pageUrl = typeof chapter.pageUrl === "string" ? chapter.pageUrl : "";
  const fromPage = /gayporntube\.net\/embed\/([0-9]{1,12})/i.exec(pageUrl);
  return fromPage ? fromPage[1] : "";
}

module.exports = {
  validCategory(category) {
    return category === "" || categoryPath(category) !== "";
  },

  categories() {
    return categoriesList.slice();
  },

  catalogPage(page, category) {
    const path = categoryPath(category);
    if (path === "") {
      throw new Error(siteName + "没有分类 " + category);
    }
    if (!(page >= 1) || page > 5000) {
      return { items: [], hasMore: false };
    }
    const response = fetchPage(pagePath(path, page));
    const items = parseCards(response.body);
    return { items, hasMore: items.length > 0 && hasNextPage(response.body, page) };
  },

  search(page, query) {
    const keyword = clean(query);
    if (!(page >= 1) || keyword === "" || page > 200) {
      return { items: [], hasMore: false };
    }
    const response = fetchPage(searchPath(keyword, page));
    const items = parseCards(response.body);
    return { items, hasMore: items.length > 0 && hasNextPage(response.body, page) };
  },

  detail(sourceId) {
    const slug = String(sourceId || "").trim();
    if (!slugPattern.test(slug)) {
      throw new Error(siteName + "影片地址无效");
    }
    const page = detailPage(slug);
    const title = page.drama.title;
    const chapter = {
      id: host.chapterId(slug, "1"),
      source: host.source,
      title: truncate(title, 128),
      currentEpisode: 1,
      pageUrl: site + "/" + slug + "/",
      referer: site + "/",
      videoUrl: page.embedId !== "" ? embedScheme + page.embedId : "",
    };
    page.drama.totalEpisode = 1;
    page.drama.episodeCount = 1;
    return { drama: page.drama, chapters: [chapter] };
  },

  resolveMedia(task) {
    const slug = dramaSourceId(task);
    if (slug === "") {
      throw new Error(siteName + "播放信息无效，请刷新详情后重试");
    }
    let embedId = chapterEmbedId(task);
    if (embedId === "") {
      embedId = embedIdOf(detailPage(slug).body);
    }
    if (embedId === "") {
      throw new Error(siteName + "没有找到播放地址");
    }
    const response = host.fetchText({ url: embedAddress(embedId), referer: site + "/" });
    const body = response.body;
    const address = mediaAddress(body);
    if (address === "") {
      if (/not allowed to watch/i.test(body)) {
        throw new Error(siteName + "该影片的来源站拒绝了请求");
      }
      throw new Error(siteName + "播放地址解析失败，请稍后重试");
    }
    return host.prepareWebMedia({ url: address, referer: embedReferer }, siteName);
  },
};
