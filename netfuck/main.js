const site = "https://www.netfuck.net";
const siteName = "Netfuck";
const embedReferer = "https://www.gayporntube.net/";
const embedPagePrefix = "https://www.gayporntube.net/embed/";
const embedScheme = "netfuck-embed://";
const slugPattern = /^[A-Za-z0-9._~%-]{1,300}$/;
const declaredHosts = [
  "netfuck.net",
  "www.netfuck.net",
  "gayporntube.net",
  "www.gayporntube.net",
  "*.gayporntube.net",
  "gayporntube.com",
  "www.gayporntube.com",
  "*.gayporntube.com",
  "playmogo.com",
  "www.playmogo.com",
  "dood.to",
  "dood.watch",
  "doodstream.com",
  "ds2play.com",
  "*.doodcdn.io",
  "*.cloudatacdn.com",
  "1069.website",
  "www.1069.website",
  "hypeboy.link",
  "www.hypeboy.link",
  "voe.sx",
  "*.voe.sx",
];
const categoriesList = [
  { id: "", name: "最新" },
  { id: "movies", name: "影片" },
  { id: "featured", name: "精选" },
  { id: "onlyfans", name: "OnlyFans" },
  { id: "myfans", name: "MyFans" },
  { id: "hunk-channel", name: "Hunk Channel" },
  { id: "coat/ck%e3%82%aa%e3%83%aa%e3%82%b8%e3%83%8a%e3%83%ab", name: "CK 原创" },
  { id: "western-gay-porn-hd", name: "欧美" },
  { id: "mens-rush-tv", name: "Men's Rush.TV" },
  { id: "ko", name: "韩国" },
  { id: "future-boy", name: "Future Boy" },
  { id: "exfeed", name: "EXFEED" },
];
const ignoredCardClasses = ["video-categories", "video-tags", "videopost-inner"];
const signaturePrefix = "page-signature:";
const gridPageSize = 6;
const pageLimit = 2000;

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

function alternatePagePath(path, page) {
  return path + (path.indexOf("?") >= 0 ? "&" : "?") + "paged=" + page;
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

function paginationHint(body, page) {
  const text = String(body);
  const next = page + 1;
  const hints = ["/page/" + next + "/", "/page/" + next + '"', "/page/" + next + "'", "paged=" + next, "page=" + next];
  for (const hint of hints) {
    if (text.indexOf(hint) >= 0) {
      return true;
    }
  }
  return /rel=["']next["']/i.test(text);
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
      sourceUrl: post.url,
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

function normalizeText(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/g, "&");
}

function absoluteUrl(raw, base) {
  const value = clean(raw);
  if (value === "" || /^data:/i.test(value) || /^javascript:/i.test(value) || value.indexOf("about:") === 0) {
    return "";
  }
  try {
    return host.resolveUrl(base, value);
  } catch (error) {
    return "";
  }
}

function isMediaAddress(address) {
  const lower = String(address).toLowerCase();
  if (!/^https?:\/\//.test(lower)) {
    return false;
  }
  return /\.(mp4|m3u8|webm|mpd)(?=[/?#]|$)/.test(lower) || /\/get_file\//.test(lower);
}

function declaredHost(address) {
  let parsed;
  try {
    parsed = host.parseUrl(address);
  } catch (error) {
    return false;
  }
  const name = String(parsed.hostname || "").toLowerCase();
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

function hostNameOf(address) {
  try {
    return String(host.parseUrl(address).hostname || "").toLowerCase();
  } catch (error) {
    return "";
  }
}

function mediaCandidates(body) {
  const candidates = [];
  const push = (address) => {
    if (address !== "" && candidates.indexOf(address) < 0) {
      candidates.push(address);
    }
  };
  const doc = documentOf(body);
  const nodes = collect(doc, (child) => ["video", "source", "iframe", "embed", "a"].indexOf(String(child.tag || "").toLowerCase()) >= 0);
  for (const node of nodes) {
    for (const name of ["src", "data-src", "data-video", "data-url", "data-file", "href"]) {
      push(absoluteUrl(attribute(node, name), site + "/"));
    }
  }
  const pattern = /https?:\/\/[^\s"'\\<>()]+/gi;
  const text = normalizeText(body);
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const address = match[0].replace(/[\\.,;]+$/, "");
    if (isMediaAddress(address)) {
      push(address);
    }
  }
  return candidates;
}

function mediaIn(body) {
  for (const address of mediaCandidates(body)) {
    if (isMediaAddress(address) && declaredHost(address)) {
      return address;
    }
  }
  return "";
}

function keyedMedia(body) {
  const text = normalizeText(body);
  const patterns = [
    /video_url\s*:\s*['"]([^'"]+)['"]/i,
    /["']file["']\s*:\s*["']([^"']+)["']/i,
    /sources\s*:\s*\[\s*\{[^}]*["'](?:file|src)["']\s*:\s*["']([^"']+)["']/i,
    /https?:\/\/[^\s"'\\<>()]*\.m3u8[^\s"'\\<>()]*/i,
    /https?:\/\/[^\s"'\\<>()]*\.mp4[^\s"'\\<>()]*/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) {
      continue;
    }
    const raw = match.length > 1 && match[1] ? match[1] : match[0];
    const address = absoluteMedia(raw);
    if (address !== "" && isMediaAddress(address) && declaredHost(address)) {
      return address;
    }
  }
  return "";
}

function absoluteMedia(raw) {
  let address = normalizeText(raw).trim();
  if (address.indexOf("//") === 0) {
    address = "https:" + address;
  }
  return /^https?:\/\//i.test(address) ? address : "";
}

function originOf(address) {
  try {
    const parsed = host.parseUrl(address);
    return parsed.scheme + "://" + parsed.host;
  } catch (error) {
    return "";
  }
}

function errorText(error) {
  const message = error && error.message ? String(error.message) : String(error);
  return message.length > 160 ? message.slice(0, 160) : message;
}

function playerIn(body) {
  const doc = documentOf(body);
  const frames = collect(doc, (child) => ["iframe", "embed"].indexOf(String(child.tag || "").toLowerCase()) >= 0, 8);
  for (const frame of frames) {
    for (const name of ["src", "data-src", "data-iframe", "data-player", "data-url"]) {
      const address = absoluteUrl(attribute(frame, name), site + "/");
      if (address !== "" && !isMediaAddress(address)) {
        return address;
      }
    }
  }
  const match = /https?:\/\/(?:www\.)?gayporntube\.(?:net|com)\/embed\/[0-9]{1,15}[^\s"'\\<>()]*/i.exec(normalizeText(body));
  return match ? match[0].replace(/[\\.,;]+$/, "") : "";
}

const doodHosts = ["playmogo.com", "dood.to", "dood.watch", "doodstream.com", "dood.so", "ds2play.com"];

function isPlayerContainer(node) {
  const tokens = classTokens(node);
  return tokens.indexOf("video-player") >= 0 || tokens.indexOf("player") >= 0;
}

function playerLabel(address) {
  const name = hostNameOf(address);
  if (/gayporntube\./i.test(name)) {
    return "嵌入";
  }
  if (/playmogo|dood|ds2play|1069jp|hgcloud|luluvdo/i.test(name)) {
    return "DOOD";
  }
  if (/1069\.website|byse/i.test(name)) {
    return "BYSE";
  }
  if (/hypeboy|voe\./i.test(name)) {
    return "VOE";
  }
  return name;
}

function playerRank(address) {
  const label = playerLabel(address);
  if (label === "DOOD") {
    return 0;
  }
  if (label === "嵌入") {
    return 1;
  }
  return 2;
}

function playerEntries(body) {
  const found = [];
  const add = (raw) => {
    const address = absoluteUrl(raw, site + "/");
    if (address === "" || isMediaAddress(address) || found.indexOf(address) >= 0) {
      return;
    }
    found.push(address);
  };
  const doc = documentOf(body);
  for (const node of collect(doc, (child) => ["iframe", "embed"].indexOf(String(child.tag || "").toLowerCase()) >= 0)) {
    for (const name of ["src", "data-src"]) {
      add(attribute(node, name));
    }
  }
  for (const node of collect(doc, (child) => isPlayerContainer(child) && attribute(child, "data-src") !== "")) {
    for (const name of ["data-src", "data-iframe", "data-player", "data-url"]) {
      add(attribute(node, name));
    }
  }
  found.sort((left, right) => playerRank(left) - playerRank(right));
  return found;
}

function isDoodHost(address) {
  const name = hostNameOf(address);
  for (const pattern of doodHosts) {
    if (name === pattern || name.slice(-(pattern.length + 1)) === "." + pattern) {
      return true;
    }
  }
  return false;
}

const browserHeaders = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

function fetchPlayerPage(address, referer) {
  const headers = Object.assign({}, browserHeaders);
  if (referer !== "") {
    headers.referer = referer;
  }
  const response = host.fetch({
    url: address,
    method: "GET",
    headers,
    followRedirects: true,
    anyStatus: true,
    timeoutMs: 20000,
    limit: 4 << 20,
  });
  const finalUrl = address;
  return {
    status: parseInt(response && response.status, 10) || 0,
    location: String((response && response.headers && (response.headers.location || response.headers.Location)) || ""),
    body: String((response && response.body) || ""),
    url: finalUrl,
  };
}

function randomToken(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let text = "";
  for (let index = 0; index < length; index++) {
    text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return text;
}

function doodMedia(address, body) {
  const pass = /\/pass_md5\/[^'"\s]+/.exec(normalizeText(body));
  if (!pass) {
    return "";
  }
  const origin = originOf(address);
  if (origin === "") {
    return "";
  }
  let base = "";
  try {
    base = String(fetchPlayerPage(origin + pass[0], address).body).trim();
  } catch (error) {
    return "";
  }
  if (!/^https?:\/\//.test(base)) {
    return "";
  }
  const token = pass[0].slice(pass[0].lastIndexOf("/") + 1);
  return base + randomToken(10) + "?token=" + token + "&expiry=" + Date.now();
}

function redirectTarget(body, base) {
  const text = normalizeText(body);
  const meta = /http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>\s]+)/i.exec(text);
  if (meta) {
    return absoluteUrl(meta[1], base);
  }
  const assigned = /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i.exec(text);
  if (assigned) {
    return absoluteUrl(assigned[1], base);
  }
  const replaced = /location\.replace\(\s*["']([^"']+)["']/i.exec(text);
  return replaced ? absoluteUrl(replaced[1], base) : "";
}

function packedMedia(body) {
  const packed = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',([0-9]+),([0-9]+),'([\s\S]*?)'\.split\('\|'\)/;
  const match = packed.exec(String(body));
  if (!match) {
    return "";
  }
  const base = parseInt(match[2], 10) || 62;
  const count = parseInt(match[3], 10) || 0;
  const words = match[4].split("|");
  const token = (value) => {
    let text = "";
    let number = value;
    while (true) {
      const digit = number % base;
      text = (digit > 35 ? String.fromCharCode(digit + 29) : digit.toString(36)) + text;
      number = Math.floor(number / base);
      if (number <= 0) {
        break;
      }
    }
    return text;
  };
  let source = match[1];
  for (let index = count - 1; index >= 0; index--) {
    if (words[index]) {
      const replacement = words[index];
      source = source.replace(new RegExp("\\b" + token(index) + "\\b", "g"), () => replacement);
    }
  }
  return keyedMedia(source);
}

function resolvePlayer(address, referer, depth) {
  if (address === "" || depth > 3) {
    return { media: "", referer: "", reason: "没有可用的播放器地址" };
  }
  if (isMediaAddress(address)) {
    return { media: address, referer, reason: "" };
  }
  const name = hostNameOf(address);
  let page = null;
  try {
    page = fetchPlayerPage(address, referer);
  } catch (error) {
    return { media: "", referer: "", reason: name + " 打不开（" + errorText(error) + "）" };
  }
  const body = page.body;
  if (body === "") {
    return { media: "", referer: "", reason: name + " 返回了空页面（状态 " + page.status + "）" };
  }
  const pass = /\/pass_md5\//.test(normalizeText(body));
  if (pass || isDoodHost(address)) {
    const media = doodMedia(address, body);
    if (media !== "") {
      return { media, referer: address, reason: "" };
    }
    if (pass) {
      return { media: "", referer: "", reason: name + " 的 pass_md5 没有取到直链" };
    }
  }
  const media = keyedMedia(body) || packedMedia(body) || mediaIn(body);
  if (media !== "") {
    return { media, referer: address, reason: "" };
  }
  if (/not allowed to watch/i.test(body)) {
    return { media: "", referer: "", reason: name + " 拒绝了这个请求（嵌入白名单），换一条线路" };
  }
  const next = page.location !== "" ? absoluteUrl(page.location, address) : "";
  if (next !== "" && next !== address) {
    return resolvePlayer(next, address, depth + 1);
  }
  const redirected = redirectTarget(body, address);
  if (redirected !== "" && redirected !== address) {
    return resolvePlayer(redirected, address, depth + 1);
  }
  const frame = playerIn(body);
  if (frame !== "" && frame !== address) {
    return resolvePlayer(frame, address, depth + 1);
  }
  return { media: "", referer: "", reason: name + " 的页面里没有播放地址" };
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
      sourceUrl: address,
    },
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

function playerAddressOf(chapter) {
  const videoUrl = chapter && typeof chapter.videoUrl === "string" ? chapter.videoUrl : "";
  if (videoUrl.indexOf(embedScheme) === 0) {
    const value = videoUrl.slice(embedScheme.length).trim();
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    if (/^[0-9]{1,15}$/.test(value)) {
      return embedPagePrefix + value;
    }
    return "";
  }
  const pageUrl = chapter && typeof chapter.pageUrl === "string" ? chapter.pageUrl : "";
  return /^https?:\/\//i.test(pageUrl) ? pageUrl : "";
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
    if (!(page >= 1) || page > pageLimit) {
      return { items: [], hasMore: false };
    }
    const previous = readPageSignature(category);
    let response = fetchPage(pagePath(path, page));
    let items = parseCards(response.body);
    if (page > 1) {
      const current = pageSignature(items);
      const stale =
        items.length === 0 || (previous !== null && previous.page === page - 1 && previous.signature === current);
      if (stale) {
        const fallback = fetchPage(alternatePagePath(path, page));
        const other = parseCards(fallback.body);
        if (other.length > 0 && pageSignature(other) !== current) {
          response = fallback;
          items = other;
        }
      }
    }
    const signature = pageSignature(items);
    const repeated = previous !== null && previous.page === page - 1 && previous.signature === signature;
    writePageSignature(category, page, signature);
    return {
      items,
      hasMore: items.length > 0 && !repeated && (paginationHint(response.body, page) || items.length >= gridPageSize),
    };
  },

  search(page, query) {
    const keyword = clean(query);
    if (!(page >= 1) || keyword === "" || page > 200) {
      return { items: [], hasMore: false };
    }
    const response = fetchPage(searchPath(keyword, page));
    const items = parseCards(response.body);
    return {
      items,
      hasMore: items.length > 0 && (paginationHint(response.body, page) || items.length >= gridPageSize),
    };
  },

  detail(sourceId) {
    const slug = String(sourceId || "").trim();
    if (!slugPattern.test(slug)) {
      throw new Error(siteName + "影片地址无效");
    }
    const page = detailPage(slug);
    const entries = playerEntries(page.body);
    const chapters = [];
    for (const address of entries) {
      chapters.push({
        id: host.chapterId(slug, String(chapters.length + 1)),
        source: host.source,
        title: "线路 " + (chapters.length + 1) + " · " + playerLabel(address),
        currentEpisode: chapters.length + 1,
        pageUrl: site + "/" + slug + "/",
        referer: site + "/",
        videoUrl: embedScheme + address,
      });
    }
    if (chapters.length === 0) {
      chapters.push({
        id: host.chapterId(slug, "1"),
        source: host.source,
        title: truncate(page.drama.title, 128),
        currentEpisode: 1,
        pageUrl: site + "/" + slug + "/",
        referer: site + "/",
        videoUrl: "",
      });
    }
    page.drama.totalEpisode = chapters.length;
    page.drama.episodeCount = chapters.length;
    return { drama: page.drama, chapters };
  },

  resolveMedia(task) {
    const slug = dramaSourceId(task);
    if (slug === "") {
      throw new Error(siteName + "播放信息无效，请刷新详情后重试");
    }
    const reasons = [];
    const stored = playerAddressOf((task && task.chapter) || {});
    if (stored !== "") {
      const result = resolvePlayer(stored, site + "/", 0);
      if (result.media !== "") {
        return host.prepareWebMedia({ url: result.media, referer: result.referer || site + "/" }, siteName);
      }
      if (result.reason !== "") {
        reasons.push(result.reason);
      }
    }
    let body = "";
    try {
      body = detailPage(slug).body;
    } catch (error) {
      reasons.push("详情页打不开（" + errorText(error) + "）");
    }
    for (const address of playerEntries(body)) {
      const result = resolvePlayer(address, site + "/", 0);
      if (result.media !== "") {
        return host.prepareWebMedia({ url: result.media, referer: result.referer || site + "/" }, siteName);
      }
      if (result.reason !== "") {
        reasons.push(result.reason);
      }
    }
    const summary = reasons.filter((item, index, all) => all.indexOf(item) === index).slice(0, 4).join("；");
    host.log(siteName + " 线路全部失败：" + (summary || "详情页里没有播放器"));
    throw new Error(siteName + "没有找到播放地址：" + (summary || "详情页里没有播放器"));
  },
};
