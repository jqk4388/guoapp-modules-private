const site = "https://fullboys.com";
const siteName = "FullBoys";
const watchPrefix = "/video/watch/";
const playerPrefix = "/video/jwplayer/";
const gridSize = 36;
const pageLimit = 2000;
const searchPageLimit = 200;
const signaturePrefix = "page-signature:";
const declaredHosts = ["fullboys.com", "www.fullboys.com", "fullboys.b-cdn.net", "*.b-cdn.net", "*.r2.dev"];
const categoriesList = [
  { id: "", name: "最新" },
  { id: "asian", name: "Asian" },
  { id: "ass-licking", name: "Ass Licking" },
  { id: "asshole", name: "Asshole" },
  { id: "big-cock", name: "Big Cock" },
  { id: "bisexual", name: "Bisexual" },
  { id: "blowjob", name: "Blowjob" },
  { id: "bottom", name: "Bottom" },
  { id: "boy", name: "Boy" },
  { id: "ck-download", name: "CK Download" },
  { id: "coat-jp", name: "Coat JP" },
  { id: "cumcontrol", name: "Cumcontrol" },
  { id: "cumshot", name: "Cumshot" },
  { id: "china", name: "China" },
  { id: "dildo", name: "Dildo" },
  { id: "fucking", name: "Fucking" },
  { id: "futures-entertainment", name: "Futures" },
  { id: "games", name: "Games" },
  { id: "g-bot", name: "G-BOT" },
  { id: "group", name: "Group" },
  { id: "handjob", name: "Handjob" },
  { id: "handsome", name: "Handsome" },
  { id: "handsome-chat", name: "Handsome Chat" },
  { id: "handsome-sucking-pussy", name: "Handsome Sucking" },
  { id: "healingboymovie", name: "HealingBoy" },
  { id: "hunk-channel", name: "Hunk-ch" },
  { id: "huntmag", name: "Huntmag" },
  { id: "inside", name: "Inside" },
  { id: "japanese", name: "Japanese" },
  { id: "ko-tube", name: "KO Tube" },
  { id: "korean", name: "Korean" },
  { id: "ladyboy", name: "Ladyboy" },
  { id: "latin", name: "Latin" },
  { id: "manclub1069", name: "Manclub1069" },
  { id: "massage", name: "Massage" },
  { id: "masturbate", name: "Masturbate" },
  { id: "mdapp-tv", name: "mdapp.tv" },
  { id: "men", name: "Men" },
  { id: "mens-rush", name: "Mens Rush" },
  { id: "milking", name: "Milking" },
  { id: "muscle", name: "Muscle" },
  { id: "nude-model", name: "Nude Model" },
  { id: "office", name: "Office" },
  { id: "onlyfans", name: "Onlyfans" },
  { id: "onlyfans-koraskiinmode", name: "Onlyfans Koraskiinmode" },
  { id: "onsen", name: "Onsen" },
  { id: "outdoor", name: "Outdoor" },
  { id: "pinoy", name: "Pinoy" },
  { id: "philippines", name: "Philippines" },
  { id: "rimming", name: "Rimming" },
  { id: "self", name: "Self" },
  { id: "sex-toys", name: "Sex Toys" },
  { id: "singapore", name: "Singapore" },
  { id: "str8boys", name: "Str8boys" },
  { id: "straight-boy", name: "Straight Boy" },
  { id: "taiwanese", name: "Taiwanese" },
  { id: "thailand", name: "Thailand" },
  { id: "threesome", name: "Threesome" },
  { id: "trance-video", name: "Trance" },
  { id: "trans", name: "Trans" },
  { id: "underwear", name: "Underwear" },
  { id: "viet-nam", name: "Vietnamese" },
  { id: "viet-nam-boy-nude", name: "Viet Boy Nude" },
  { id: "vintage", name: "Vintage" },
];

function classTokens(node) {
  const value = node && node.attrs ? node.attrs.class : "";
  return typeof value === "string" && value !== "" ? value.split(/\s+/) : [];
}

function hasClass(node, name) {
  return classTokens(node).indexOf(name) >= 0;
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

function slugAllowed(value) {
  if (typeof value !== "string") {
    return false;
  }
  const slug = value.trim();
  if (slug === "" || slug.length > 300) {
    return false;
  }
  return !/[\/?#&<>"'\\\s]/.test(slug);
}

function slugFromHref(raw) {
  let value = String(raw === undefined || raw === null ? "" : raw).trim();
  if (value === "") {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    let parsed;
    try {
      parsed = host.parseUrl(value);
    } catch (error) {
      return "";
    }
    value = parsed.path || "";
  }
  const cut = value.indexOf("?");
  if (cut >= 0) {
    value = value.slice(0, cut);
  }
  if (value.indexOf(watchPrefix) !== 0) {
    return "";
  }
  let slug = value.slice(watchPrefix.length).replace(/\/+$/, "");
  if (slug === "") {
    return "";
  }
  try {
    slug = decodeURIComponent(slug);
  } catch (error) {
    return "";
  }
  slug = slug.trim();
  return slugAllowed(slug) ? slug : "";
}

function watchAddress(slug) {
  return site + watchPrefix + encodeURIComponent(slug);
}

function playerAddress(slug) {
  return site + playerPrefix + encodeURIComponent(slug);
}

function categoryName(category) {
  for (const entry of categoriesList) {
    if (entry.id === category) {
      return entry.name;
    }
  }
  return "";
}

function topicPath(category) {
  if (category === "") {
    return "/";
  }
  for (const entry of categoriesList) {
    if (entry.id === category) {
      return "/topic/video/" + entry.id;
    }
  }
  return "";
}

function pagedPath(path, page) {
  if (page <= 1) {
    return path;
  }
  return path + (path.indexOf("?") >= 0 ? "&" : "?") + "page=" + page;
}

function fetchPage(path) {
  const address = site + path;
  const response = host.fetchText({ url: address, referer: site + "/" });
  return { url: response.url || address, body: response.body };
}

function hasNextPage(body, page) {
  const text = String(body);
  if (new RegExp("[?&](?:amp;)?page=" + (page + 1) + "(?![0-9])").test(text)) {
    return true;
  }
  return /rel=["']next["']/i.test(text);
}

function isCard(node) {
  return node.tag === "article" && hasClass(node, "movie-item");
}

function cardTitle(card, anchor) {
  const heading = first(card, (node) => node.tag === "h3" && hasClass(node, "title"));
  const fromHeading = heading ? clean(nodeText(heading)) : "";
  if (fromHeading !== "") {
    return fromHeading;
  }
  const fromAnchor = clean(attribute(anchor, "title"));
  if (fromAnchor !== "") {
    return fromAnchor;
  }
  const image = first(card, (node) => node.tag === "img");
  return image ? clean(attribute(image, "alt")) : "";
}

function cardCover(card) {
  const images = collect(card, (node) => node.tag === "img", 4);
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

function durationValue(text) {
  const match = String(text).match(/\b[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\b/);
  return match ? match[0] : "";
}

function cardDuration(card) {
  const marked = first(card, (node) => hasClass(node, "duration"));
  if (marked) {
    const text = durationValue(clean(nodeText(marked)));
    if (text !== "") {
      return text;
    }
  }
  return "";
}

function cardViews(card) {
  const marked = first(card, (node) => hasClass(node, "view-fm"));
  if (!marked) {
    return "";
  }
  const raw = clean(attribute(marked, "data-views"));
  if (raw !== "") {
    return raw;
  }
  return clean(nodeText(marked));
}

function parseCards(body, category) {
  const items = [];
  const seen = new Set();
  const label = category === null ? "" : categoryName(category);
  for (const card of collect(documentOf(body), isCard)) {
    const anchor = first(card, (node) => node.tag === "a" && slugFromHref(attribute(node, "href")) !== "");
    if (!anchor) {
      continue;
    }
    const slug = slugFromHref(attribute(anchor, "href"));
    if (slug === "" || seen.has(slug)) {
      continue;
    }
    const title = cardTitle(card, anchor);
    if (title === "") {
      continue;
    }
    seen.add(slug);
    const cover = cardCover(card);
    const duration = cardDuration(card);
    const views = cardViews(card);
    const drama = {
      id: host.dramaId(slug),
      source: host.source,
      sourceId: slug,
      title: truncate(title, 512),
      name: truncate(title, 512),
      cover,
      coverUrl: cover,
      channelName: siteName,
      categoryName: label,
      sourceUrl: watchAddress(slug),
    };
    if (duration !== "") {
      drama.duration = duration;
      drama.remark = duration;
    }
    if (views !== "") {
      drama.views = views;
    }
    items.push(drama);
    if (items.length >= 300) {
      break;
    }
  }
  return items;
}

function pageSignature(items) {
  const parts = [];
  for (const item of items.slice(0, 5)) {
    parts.push(item.sourceId);
  }
  return parts.join("|");
}

function signatureKey(category) {
  return signaturePrefix + (category === "" ? "latest" : category);
}

function readPageSignature(category) {
  try {
    const raw = host.loadState(signatureKey(category));
    const parsed = raw === "" ? null : JSON.parse(raw);
    return parsed && typeof parsed.page === "number" && typeof parsed.signature === "string" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function writePageSignature(category, page, signature) {
  try {
    host.saveState(signatureKey(category), JSON.stringify({ page, signature }));
  } catch (error) {
    return;
  }
}

function metaContent(body, property) {
  const text = String(body);
  const pattern = new RegExp('<meta[^>]*property=["\']' + property + '["\'][^>]*content=["\']([^"\']*)["\']', "i");
  const match = pattern.exec(text);
  if (match) {
    return clean(match[1]);
  }
  const reversed = new RegExp('<meta[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']' + property + '["\']', "i");
  const other = reversed.exec(text);
  return other ? clean(other[1]) : "";
}

function metaItemValue(doc, label) {
  for (const item of collect(doc, (node) => hasClass(node, "meta-item"), 12)) {
    const name = first(item, (node) => hasClass(node, "meta-label"));
    if (!name || clean(nodeText(name)).toLowerCase() !== label.toLowerCase()) {
      continue;
    }
    const value = first(item, (node) => hasClass(node, "meta-value"));
    if (value) {
      const raw = clean(attribute(value, "data-views"));
      const text = clean(nodeText(value));
      return raw !== "" ? raw : text;
    }
  }
  return "";
}

function tagNames(doc) {
  const names = [];
  for (const anchor of collect(doc, (node) => node.tag === "a" && hasClass(node, "tag-topic"), 16)) {
    const name = clean(nodeText(anchor));
    if (name !== "" && names.indexOf(name) < 0 && Array.from(name).length <= 40) {
      names.push(name);
    }
  }
  return names;
}

function playerFrames(doc) {
  const found = [];
  for (const frame of collect(doc, (node) => node.tag === "iframe" || node.tag === "embed", 4)) {
    for (const name of ["src", "data-src", "data-url"]) {
      const raw = clean(attribute(frame, name));
      if (raw === "" || raw.indexOf("about:") === 0) {
        continue;
      }
      let address = "";
      try {
        address = host.resolveUrl(site + "/", raw);
      } catch (error) {
        continue;
      }
      if (found.indexOf(address) < 0) {
        found.push(address);
      }
    }
  }
  return found;
}

function detailPage(slug) {
  const address = watchAddress(slug);
  const response = host.fetchText({ url: address, referer: site + "/" });
  const body = response.body;
  const doc = documentOf(body);
  const heading = first(doc, (node) => node.tag === "h1");
  let title = heading ? clean(nodeText(heading)) : "";
  if (title === "") {
    title = metaContent(body, "og:title").replace(/\s*[-|]\s*FullBoys\.com\s*$/i, "").trim();
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
  const tags = tagNames(doc);
  let duration = metaItemValue(doc, "Duration");
  if (duration === "") {
    duration = durationValue(clean(nodeText(doc)));
  }
  const views = metaItemValue(doc, "Views");
  const description = metaContent(body, "og:description");
  const intro = description !== "" ? description : "分类：" + tags.join(" / ");
  const drama = {
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
    categoryName: tags.length > 0 ? tags[0] : "",
    sourceUrl: address,
  };
  if (tags.length > 0) {
    drama.tags = tags.slice(0, 12);
  }
  if (duration !== "") {
    drama.duration = duration;
    drama.remark = duration;
  }
  if (views !== "") {
    drama.views = views;
  }
  return { address, drama, players: playerFrames(doc) };
}

function isMediaAddress(address) {
  return /^https?:\/\/[^\s"'<>]+\.(mp4|m3u8|webm|mpd)(?=[?#]|$)/i.test(String(address));
}

function hostNameOf(address) {
  try {
    return String(host.parseUrl(address).hostname || "").toLowerCase();
  } catch (error) {
    return "";
  }
}

function declaredHost(address) {
  const name = hostNameOf(address);
  if (name === "") {
    return false;
  }
  for (const pattern of declaredHosts) {
    if (pattern.indexOf("*.") === 0) {
      if (name === pattern.slice(2) || name.slice(-(pattern.length - 1)) === pattern.slice(1)) {
        return true;
      }
      continue;
    }
    if (name === pattern) {
      return true;
    }
  }
  return false;
}

function absoluteMedia(raw) {
  let address = clean(raw).replace(/\\\//g, "/");
  if (address.indexOf("//") === 0) {
    address = "https:" + address;
  }
  return /^https?:\/\//i.test(address) ? address : "";
}

function mediaAddress(body) {
  const text = String(body).replace(/\\\//g, "/");
  const patterns = [
    /file\s*:\s*["']([^"']+)["']/i,
    /["']file["']\s*:\s*["']([^"']+)["']/i,
    /["']src["']\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i,
    /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i,
    /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) {
      continue;
    }
    const address = absoluteMedia(match[1] ? match[1] : match[0]);
    if (address !== "" && isMediaAddress(address) && declaredHost(address)) {
      return address;
    }
  }
  return "";
}

function errorText(error) {
  const message = error && error.message ? String(error.message) : String(error);
  return message.length > 160 ? message.slice(0, 160) : message;
}

function chapterAddress(chapter) {
  const videoUrl = chapter && typeof chapter.videoUrl === "string" ? chapter.videoUrl.trim() : "";
  if (/^https?:\/\//i.test(videoUrl)) {
    return videoUrl;
  }
  const pageUrl = chapter && typeof chapter.pageUrl === "string" ? chapter.pageUrl.trim() : "";
  return /^https?:\/\//i.test(pageUrl) ? pageUrl : "";
}

function taskSlug(task) {
  const prefix = host.source + ":";
  const value = task && typeof task.dramaId === "string" ? task.dramaId : "";
  if (value.indexOf(prefix) !== 0) {
    return "";
  }
  const slug = value.slice(prefix.length).trim();
  return slugAllowed(slug) ? slug : "";
}

function resolvePlayer(address, referer, reasons) {
  let body = "";
  try {
    body = host.fetchText({ url: address, referer }).body;
  } catch (error) {
    reasons.push(hostNameOf(address) + " 打不开（" + errorText(error) + "）");
    return "";
  }
  const media = mediaAddress(body);
  if (media !== "") {
    return media;
  }
  reasons.push(hostNameOf(address) + " 的页面里没有直链");
  return "";
}

module.exports = {
  validCategory(category) {
    return topicPath(category) !== "";
  },

  categories() {
    return categoriesList.slice();
  },

  catalogPage(page, category) {
    const path = topicPath(category);
    if (path === "") {
      throw new Error(siteName + "没有分类 " + category);
    }
    if (!(page >= 1) || page > pageLimit) {
      return { items: [], hasMore: false };
    }
    const previous = readPageSignature(category);
    let response = fetchPage(pagedPath(path, page));
    let items = parseCards(response.body, category);
    const stale =
      page > 1 &&
      (items.length === 0 || (previous !== null && previous.page === page - 1 && previous.signature === pageSignature(items)));
    if (stale) {
      const retry = fetchPage(pagedPath(path, page));
      const other = parseCards(retry.body, category);
      if (other.length > 0) {
        response = retry;
        items = other;
      }
    }
    const signature = pageSignature(items);
    const repeated = previous !== null && previous.page === page - 1 && previous.signature === signature;
    writePageSignature(category, page, signature);
    return {
      items,
      hasMore: items.length > 0 && !repeated && (hasNextPage(response.body, page) || items.length >= gridSize),
    };
  },

  search(page, query) {
    const keyword = clean(query);
    if (!(page >= 1) || keyword === "" || page > searchPageLimit) {
      return { items: [], hasMore: false };
    }
    const encoded = encodeURIComponent(keyword);
    const path = page > 1 ? "/?search=" + encoded + "&page=" + page : "/?search=" + encoded;
    const response = fetchPage(path);
    const items = parseCards(response.body, null);
    return {
      items,
      hasMore: items.length > 0 && hasNextPage(response.body, page),
    };
  },

  detail(sourceId) {
    const slug = String(sourceId === undefined || sourceId === null ? "" : sourceId).trim();
    if (!slugAllowed(slug)) {
      throw new Error(siteName + "影片地址无效");
    }
    const page = detailPage(slug);
    const address = page.address;
    const chapters = [];
    const players = page.players.length > 0 ? page.players : [playerAddress(slug)];
    for (const player of players) {
      chapters.push({
        id: host.chapterId(slug, String(chapters.length + 1)),
        source: host.source,
        title: players.length > 1 ? "线路 " + (chapters.length + 1) : truncate(page.drama.title, 128),
        currentEpisode: 1,
        pageUrl: address,
        referer: site + "/",
        videoUrl: player,
      });
    }
    page.drama.totalEpisode = chapters.length;
    page.drama.episodeCount = chapters.length;
    return { drama: page.drama, chapters };
  },

  resolveMedia(task) {
    const slug = taskSlug(task);
    if (slug === "") {
      throw new Error(siteName + "播放信息无效，请刷新详情后重试");
    }
    const detailAddress = watchAddress(slug);
    const reasons = [];
    const addresses = [];
    const stored = chapterAddress((task && task.chapter) || {});
    if (stored !== "") {
      addresses.push(stored);
    }
    const canonical = playerAddress(slug);
    if (addresses.indexOf(canonical) < 0) {
      addresses.push(canonical);
    }
    for (const address of addresses) {
      if (isMediaAddress(address) && declaredHost(address)) {
        return host.prepareWebMedia({ url: address, referer: detailAddress }, siteName);
      }
      const media = resolvePlayer(address, detailAddress, reasons);
      if (media !== "") {
        return host.prepareWebMedia({ url: media, referer: address }, siteName);
      }
    }
    let frames = [];
    try {
      frames = detailPage(slug).players;
    } catch (error) {
      reasons.push("详情页打不开（" + errorText(error) + "）");
    }
    for (const frame of frames) {
      const media = resolvePlayer(frame, detailAddress, reasons);
      if (media !== "") {
        return host.prepareWebMedia({ url: media, referer: frame }, siteName);
      }
    }
    const summary = reasons.filter((item, index, all) => all.indexOf(item) === index).slice(0, 4).join("；");
    host.log(siteName + " 线路全部失败：" + (summary || "详情页里没有播放器"));
    throw new Error(siteName + "没有找到播放地址：" + (summary || "详情页里没有播放器"));
  },
};
