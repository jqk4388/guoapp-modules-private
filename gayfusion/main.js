const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
const HEALTH_KEY = "site-health";
const HEALTH_TTL = 30 * 60 * 1000;
const DEFAULT_KEY = "default-source";
const DEFAULT_TTL = 10 * 60 * 1000;
const COVER_CACHE_PREFIX = "cover:";
const COVER_TTL = 24 * 60 * 60 * 1000;
const LIST_TIMEOUT = 12000;
const DEFAULT_TIMEOUT = 6000;
const SEARCH_TIMEOUT = 8000;
const BROWSER_MARKER = "browser://";
const DOOD_HOSTS = [
  "playmogo.com",
  "dood.to",
  "dood.watch",
  "doodstream.com",
  "ds2play.com",
  "advtpe.com",
  "bysezejataos.com",
  "d0000d.com",
  "dsvplay.com",
];

function homeList(home, path, page, separator) {
  if (!(page > 1)) return home + path;
  if (path.indexOf("?") >= 0) return home + path + "&" + separator + page;
  return home + path + "?" + separator + page;
}

const sources = [
  {
    id: "pornhub",
    name: "Pornhub",
    home: "https://cn.pornhub.com",
    pageSuffixes: ["pornhub.com"],
    listUrl(page) { return homeList(this.home, "/gay/video", page, "page="); },
    searchUrl(query, page) { return this.home + "/gay/video/search?search=" + encodeURIComponent(query) + (page > 1 ? "&page=" + page : ""); },
    isCard(node) { return node.tag === "li" && (hasClass(node, "videoBox") || hasClass(node, "pcVideoListItem")); },
    linkPattern: /view_video\.php\?viewkey=/i,
  },
  {
    id: "icegay",
    name: "IceGay",
    home: "https://www.icegay.tv",
    pageSuffixes: ["icegay.tv"],
    listUrl(page) { return homeList(this.home, "/", page, "page="); },
    searchUrl(query) { return this.home + "/search/" + encodeURIComponent(query); },
    isCard(node) { return hasClass(node, "b-thumb-item"); },
    linkPattern: /\/movies\/\d+\//i,
  },
  {
    id: "xvideos",
    name: "XVideos",
    home: "https://www.xvideos.com",
    pageSuffixes: ["xvideos.com"],
    listUrl(page) { return this.home + "/gay" + (page > 1 ? "/" + page : ""); },
    searchUrl(query, page) { return this.home + "/?k=" + encodeURIComponent(query) + (page > 1 ? "&p=" + page : ""); },
    isCard(node) { return hasClass(node, "thumb-block"); },
    linkPattern: /\/video\.[a-z0-9]+\//i,
  },
  {
    id: "boyfriendtv",
    name: "BoyfriendTV",
    home: "https://www.boyfriendtv.com",
    pageSuffixes: ["boyfriendtv.com"],
    listUrl(page) { return homeList(this.home, "/", page, "page="); },
    searchUrl(query) { return this.home + "/search/" + encodeURIComponent(query) + "/"; },
    isCard(node) { return hasClass(node, "mtile-x7") || hasClass(node, "mtile"); },
    linkPattern: /\/videos\/\d+\//i,
  },
  {
    id: "gaymaletube",
    name: "GayMaleTube",
    home: "https://www.gaymaletube.com",
    pageSuffixes: ["gaymaletube.com"],
    listUrl(page) { return homeList(this.home, "/zh/new", page, "page="); },
    searchUrl(query) { return this.home + "/zh/search/" + encodeURIComponent(query) + "/"; },
    isCard(node) { return hasClass(node, "card") && attribute(node, "data-public-id") !== ""; },
    linkPattern: /\/out\/\?l=/i,
  },
  {
    id: "megapornfreehd",
    name: "MegaPornFreeHD",
    home: "https://megapornfreehd.com",
    pageSuffixes: ["megapornfreehd.com"],
    listUrl(page) { return this.home + "/" + (page > 1 ? "page/" + page + "/" : ""); },
    searchUrl(query, page) { return this.home + "/?s=" + encodeURIComponent(query) + (page > 1 ? "&paged=" + page : ""); },
    isCard(node) { return node.tag === "article" && hasClass(node, "article-loop"); },
    linkPattern: /\/20\d\d\/\d\d\/[^?#]+\.html/i,
  },
];

const sourcesById = Object.create(null);
for (const source of sources) sourcesById[source.id] = source;

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
    if (!current) continue;
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
    if (!current) continue;
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

function absoluteAny(base, raw) {
  const value = clean(raw);
  if (!value || /^(?:data|javascript|blob|about):/i.test(value)) return "";
  try {
    const resolved = host.resolveUrl(base, value);
    const scheme = String(host.parseUrl(resolved).scheme || "").toLowerCase();
    if (scheme !== "http" && scheme !== "https") return "";
    return resolved;
  } catch (error) {
    return "";
  }
}

function hostMatches(url, suffixes) {
  try {
    const hostname = String(host.parseUrl(url).hostname || "").toLowerCase();
    for (const suffix of suffixes) {
      if (hostname === suffix || hostname.endsWith("." + suffix)) return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

function sourceOfUrl(url) {
  for (const source of sources) if (hostMatches(url, source.pageSuffixes)) return source;
  return null;
}

function stripDuration(text) {
  return clean(text)
    .replace(/\s+\d{1,2}:\d{2}(?::\d{2})?\s*$/, "")
    .replace(/\s+\d+\s*(?:分钟|秒|hours?|minutes?|mins?)\s*$/i, "")
    .trim();
}

function itemTitle(source, card, link) {
  const candidates = [];
  const titled = collect(card, (node) => {
    if (node.tag !== "a") return false;
    if (!source.linkPattern.test(attribute(node, "href"))) return false;
    return attribute(node, "title") !== "" || attribute(node, "aria-label") !== "";
  }, 8);
  for (const node of titled) {
    candidates.push(attribute(node, "title"));
    candidates.push(attribute(node, "aria-label"));
  }
  const image = first(card, (node) => node.tag === "img");
  if (image) candidates.push(attribute(image, "alt"));
  const titleNode = first(card, (node) => classTokens(node).some((token) => token === "title" || token === "entry-title" || /__title$/i.test(token)));
  if (titleNode) candidates.push(nodeText(titleNode));
  candidates.push(attribute(link, "title"));
  candidates.push(attribute(link, "aria-label"));
  for (const candidate of candidates) {
    const text = stripDuration(candidate);
    if (text.length >= 2 && text.length <= 512 && !/^(?:star|没有可用视频|play all|watch all)$/i.test(text)) return text;
  }
  const text = stripDuration(nodeText(link));
  if (text.length >= 2 && text.length <= 512) return text;
  return "";
}

function coverOf(card, base) {
  const images = collect(card, (node) => node.tag === "img", 4);
  for (const image of images) {
    for (const name of ["data-src", "data-original", "data-thumb", "data-image", "src"]) {
      const value = attribute(image, name);
      if (!value) continue;
      if (/(?:blank|lightbox|placeholder|lazy|1x1)[^/]*\.(?:gif|png|jpg|webp)/i.test(value)) continue;
      const address = absoluteAny(base, value);
      if (address) return address;
    }
    const srcset = attribute(image, "srcset") || attribute(image, "data-srcset");
    if (srcset) {
      const candidate = srcset.split(",")[0].trim().split(/\s+/)[0];
      const address = absoluteAny(base, candidate);
      if (address) return address;
    }
  }
  const pictureSources = collect(card, (node) => node.tag === "source", 4);
  for (const node of pictureSources) {
    const srcset = attribute(node, "srcset") || attribute(node, "data-srcset");
    if (!srcset) continue;
    const candidate = srcset.split(",")[0].trim().split(/\s+/)[0];
    const address = absoluteAny(base, candidate);
    if (address) return address;
  }
  const styled = first(card, (node) => /background-image/i.test(attribute(node, "style")) && /url\(/i.test(attribute(node, "style")));
  if (styled) {
    const match = /url\(\s*['"]?([^'")]+)['"]?\s*\)/i.exec(attribute(styled, "style"));
    if (match) return absoluteAny(base, match[1]);
  }
  return "";
}

function cardLink(source, card) {
  const links = collect(card, (node) => node.tag === "a" && source.linkPattern.test(attribute(node, "href")), 20);
  if (!links.length) return null;
  for (const link of links) {
    if (attribute(link, "title") !== "" || first(link, (node) => node.tag === "img")) return link;
  }
  return links[0];
}

function coverCacheKey(sourceId) {
  return COVER_CACHE_PREFIX + sourceId;
}

function rememberCover(sourceId, cover) {
  if (!sourceId || !cover) return;
  try { host.cacheSet(coverCacheKey(sourceId), cover, COVER_TTL); } catch (error) { /* ignore */ }
}

function cachedCover(sourceId) {
  if (!sourceId) return "";
  try {
    const value = host.cacheGet(coverCacheKey(sourceId));
    return typeof value === "string" ? value : "";
  } catch (error) {
    return "";
  }
}

function itemFromCard(source, card, base) {
  const link = cardLink(source, card);
  if (!link) return null;
  const url = absoluteAny(base, attribute(link, "href"));
  if (!url || !hostMatches(url, source.pageSuffixes)) return null;
  const title = itemTitle(source, card, link);
  if (!title) return null;
  const cover = coverOf(card, base);
  rememberCover(url, cover);
  const durationMatch = clean(nodeText(card)).match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
  const drama = {
    id: host.dramaId(url),
    source: host.source,
    sourceId: url,
    title: title.slice(0, 512),
    name: title.slice(0, 512),
    cover: cover,
    coverUrl: cover,
    channelName: source.name,
    categoryName: source.name,
    tags: [source.name],
    sourceUrl: url,
  };
  if (durationMatch) {
    drama.duration = durationMatch[0];
    drama.remark = durationMatch[0];
  }
  return drama;
}

function parseList(source, body) {
  const document = host.parseHtml(body);
  const base = source.home + "/";
  const cards = collect(document, source.isCard, 500);
  const items = [];
  const seen = Object.create(null);
  for (const card of cards) {
    const drama = itemFromCard(source, card, base);
    if (!drama || seen[drama.sourceId]) continue;
    seen[drama.sourceId] = true;
    items.push(drama);
    if (items.length >= 200) break;
  }
  if (!items.length) {
    const anchors = collect(document, (node) => node.tag === "a" && source.linkPattern.test(attribute(node, "href")), 500);
    for (const anchor of anchors) {
      const url = absoluteAny(base, attribute(anchor, "href"));
      if (!url || seen[url] || !hostMatches(url, source.pageSuffixes)) continue;
      let holder = anchor;
      let steps = 0;
      while (holder.parent && steps < 4) { holder = holder.parent; steps++; }
      const drama = itemFromCard(source, holder, base);
      if (!drama || seen[drama.sourceId]) continue;
      seen[drama.sourceId] = true;
      items.push(drama);
      if (items.length >= 200) break;
    }
  }
  return items;
}

function fetchBody(url, referer, timeoutMs, extraHeaders) {
  const headers = {
    "user-agent": UA,
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  };
  if (referer) headers.referer = referer;
  if (extraHeaders) {
    for (const name in extraHeaders) headers[name] = extraHeaders[name];
  }
  const response = host.fetch({
    method: "GET",
    url: url,
    followRedirects: true,
    timeoutMs: timeoutMs || LIST_TIMEOUT,
    limit: 6 * 1024 * 1024,
    headers: headers,
  });
  return String(response.body || "");
}

function fetchPage(source, url, timeoutMs) {
  return fetchBody(url, "", timeoutMs);
}

function originOf(address) {
  try {
    const parsed = host.parseUrl(address);
    return String(parsed.scheme || "") + "://" + String(parsed.host || "");
  } catch (error) {
    return "";
  }
}

function isDoodHost(address) {
  return DOOD_HOSTS.some((suffix) => hostMatches(address, [suffix]));
}

function randomToken(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let text = "";
  for (let index = 0; index < length; index++) text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return text;
}

function doodMedia(address, body) {
  const pass = /\/pass_md5\/[^'"\s]+/.exec(body);
  if (!pass) return "";
  const origin = originOf(address);
  if (!origin) return "";
  let base = "";
  try {
    base = fetchBody(origin + pass[0], address, 15000).trim();
  } catch (error) {
    return "";
  }
  if (!/^https?:\/\//.test(base)) return "";
  const token = pass[0].slice(pass[0].lastIndexOf("/") + 1);
  return base + randomToken(10) + "?token=" + token + "&expiry=" + Date.now();
}

function gdpPlayers(gdpUrl, referer) {
  const players = [];
  let body = "";
  try {
    body = fetchBody(gdpUrl, referer, 12000);
  } catch (error) {
    return players;
  }
  const nonceMatch = /'nonce'\s*:\s*'([^']+)'/.exec(body) || /"nonce"\s*:\s*"([^"]+)"/.exec(body);
  if (!nonceMatch) return players;
  const actionUrl = absoluteAny(gdpUrl, "/wp-admin/admin-ajax.php");
  if (!actionUrl) return players;
  const gdpDocument = host.parseHtml(body);
  const hashes = collect(gdpDocument, (node) => hasClass(node, "kno76mmo") && attribute(node, "data-hash") !== "", 6)
    .map((node) => attribute(node, "data-hash"));
  for (const hash of hashes) {
    try {
      const response = host.fetch({
        method: "POST",
        url: actionUrl,
        headers: {
          "user-agent": UA,
          "content-type": "application/x-www-form-urlencoded",
          "accept": "application/json, text/javascript, */*; q=0.01",
          "referer": gdpUrl,
        },
        body: "hash=" + encodeURIComponent(hash) + "&nonce=" + encodeURIComponent(nonceMatch[1]) + "&action=gdp_hash",
        followRedirects: true,
        anyStatus: true,
        timeoutMs: 12000,
        limit: 1 << 20,
      });
      const parsed = JSON.parse(String(response.body || ""));
      const src = parsed && parsed.success !== false && parsed.data ? String(parsed.data.src || "") : "";
      if (/^https?:\/\//i.test(src)) players.push(src);
    } catch (error) {
      /* try next server */
    }
  }
  return players;
}

function megaPlayers(document, pageUrl) {
  const frames = collect(document, (node) => node.tag === "iframe" && attribute(node, "src") !== "", 8)
    .map((node) => absoluteAny(pageUrl, attribute(node, "src")))
    .filter(Boolean);
  let players = [];
  for (const frame of frames) {
    if (/\/gdp\/\d+\//.test(frame) || /action=gdp_iframe/.test(frame)) {
      players = players.concat(gdpPlayers(frame, pageUrl));
    } else {
      players.push(frame);
    }
  }
  const unique = [];
  const seen = Object.create(null);
  for (const player of players) {
    if (seen[player]) continue;
    seen[player] = true;
    unique.push(player);
  }
  const dood = unique.filter(isDoodHost);
  const voe = unique.filter((player) => /voe\.sx/i.test(player));
  const rest = unique.filter((player) => !isDoodHost(player) && !/voe\.sx/i.test(player));
  return dood.concat(voe, rest);
}

function readHealth() {
  try {
    const raw = host.loadState(HEALTH_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeHealth(state) {
  try { host.saveState(HEALTH_KEY, JSON.stringify(state)); } catch (error) { /* ignore */ }
}

function markSource(source, ok) {
  const state = readHealth();
  state[source.id] = { ok: ok, at: Date.now() };
  writeHealth(state);
}

function activeSources() {
  const state = readHealth();
  const now = Date.now();
  const list = sources.filter((source) => {
    const entry = state[source.id];
    if (!entry) return true;
    if (entry.ok) return true;
    return !(entry.at > 0) || now - entry.at >= HEALTH_TTL;
  });
  return list.length ? list : sources.slice();
}

function cachedDefault() {
  try {
    const id = host.cacheGet(DEFAULT_KEY);
    const source = sourceById(typeof id === "string" ? id : "");
    if (!source) return null;
    const entry = readHealth()[source.id];
    if (entry && entry.ok === false && entry.at > 0 && Date.now() - entry.at < HEALTH_TTL) return null;
    return source;
  } catch (error) {
    return null;
  }
}

function sourceById(id) {
  return sourcesById[id] || null;
}

function rememberDefault(source) {
  try { host.cacheSet(DEFAULT_KEY, source.id, DEFAULT_TTL); } catch (error) { /* ignore */ }
}

function forgetDefault() {
  try { host.cacheSet(DEFAULT_KEY, null, 0); } catch (error) { /* ignore */ }
}

function catalogFor(source, page, timeoutMs) {
  const body = fetchPage(source, source.listUrl(page), timeoutMs || LIST_TIMEOUT);
  const items = parseList(source, body);
  if (!items.length && page === 1) throw new Error(source.name + " 列表页没有返回可识别的视频");
  if (page === 1) markSource(source, true);
  return {
    items: items,
    hasMore: items.length >= 8 && page < 200,
  };
}

function errorText(error) {
  const message = error && error.message ? String(error.message) : String(error);
  return message.length > 120 ? message.slice(0, 120) : message;
}

function pageResult(page, category, query) {
  if (!(page >= 1) || page > 200) return { items: [], hasMore: false };
  const started = Date.now();
  const merged = [];
  const seen = Object.create(null);
  const warnings = [];
  let hasMore = false;

  function append(items) {
    for (const item of items) {
      if (!item || seen[item.sourceId]) continue;
      seen[item.sourceId] = true;
      merged.push(item);
    }
  }

  if (query) {
    const pool = activeSources();
    for (const source of pool) {
      if (Date.now() - started > 45000) break;
      try {
        const body = fetchPage(source, source.searchUrl(query, page), SEARCH_TIMEOUT);
        const items = parseList(source, body);
        if (page === 1 && items.length) markSource(source, true);
        append(items);
        if (items.length >= 8) hasMore = true;
      } catch (error) {
        warnings.push(source.name);
      }
    }
    return {
      items: merged.slice(0, 300),
      hasMore: hasMore && page < 20,
      warning: warnings.length === pool.length ? "所有来源搜索都失败了" : "",
    };
  }

  if (category) {
    const source = sourceById(category);
    if (!source) throw new Error("站点分类无效");
    try {
      const result = catalogFor(source, page);
      return result;
    } catch (error) {
      markSource(source, false);
      return { items: [], hasMore: false, warning: source.name + " 暂时无法加载：" + errorText(error) };
    }
  }

  // 应用固定把「全部」放在第一位；这里只取一个可用站点，避免一次刷新所有站点。
  let candidates;
  if (page > 1) {
    const chosen = cachedDefault();
    candidates = chosen ? [chosen] : [activeSources()[0] || sources[0]];
  } else {
    const preferred = cachedDefault();
    const pool = activeSources();
    const ordered = preferred ? [preferred].concat(pool.filter((item) => item.id !== preferred.id)) : pool;
    candidates = ordered.slice(0, 3);
  }
  for (const source of candidates) {
    try {
      const result = catalogFor(source, page, DEFAULT_TIMEOUT);
      rememberDefault(source);
      return {
        items: result.items,
        hasMore: result.hasMore,
        warning: warnings.length ? "已跳过：" + warnings.join("、") : "",
      };
    } catch (error) {
      markSource(source, false);
      warnings.push(source.name);
    }
  }
  if (page === 1) forgetDefault();
  return {
    items: [],
    hasMore: false,
    warning: warnings.length ? "所有来源暂时不可用：" + warnings.join("、") : "",
  };
}

function detailTitle(source, document) {
  const og = first(document, (node) => node.tag === "meta" && attribute(node, "property") === "og:title");
  let title = og ? attribute(og, "content") : "";
  if (!title) {
    const titleNode = first(document, (node) => String(node.tag || "").toLowerCase() === "title");
    title = nodeText(titleNode);
  }
  if (!title) title = nodeText(first(document, (node) => node.tag === "h1"));
  title = clean(title)
    .replace(/\s*[-|–—]\s*(?:Pornhub(?: Gay)?|BoyFriendTV|IceGay(?:\.Tv)?|XVIDEOS(?:\.COM)?|Gay Male Tube|MegaPornFreeHD.*)\s*$/i, "")
    .replace(/\s+at Ice Gay Tube\s*$/i, "")
    .trim();
  return title.slice(0, 512) || source.name;
}

function decodeEscapes(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/\\\//g, "/")
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003[dD]/g, "=")
    .replace(/\\u003[fF]/g, "?")
    .replace(/&amp;/g, "&");
}

function mediaFromDocument(document, body, base) {
  const candidates = [];
  const add = (raw) => {
    const value = decodeEscapes(raw);
    if (typeof value !== "string" || value === "") return;
    const address = absoluteAny(base, value);
    if (!address) return;
    if (!/\.(?:mp4|m3u8)(?:[?#]|$)/i.test(address)) return;
    if (candidates.indexOf(address) >= 0) return;
    candidates.push(address);
  };
  const metas = collect(document, (node) => node.tag === "meta" && /^(?:og:video|twitter:player:stream)/i.test(attribute(node, "property") || attribute(node, "name")), 6);
  for (const meta of metas) add(attribute(meta, "content"));
  const mediaTags = collect(document, (node) => node.tag === "source" || node.tag === "video", 10);
  for (const tag of mediaTags) {
    add(attribute(tag, "src"));
    add(attribute(tag, "data-src"));
  }
  const text = String(body || "");
  const patterns = [
    /setVideoUrlHigh\s*\(\s*["']([^"']+)["']/ig,
    /setVideoHLS\s*\(\s*["']([^"']+)["']/ig,
    /"hlsAuto"\s*:\s*"([^"]+)"/ig,
    /"(?:video_url|videoUrl|contentUrl|playlist|file|src)"\s*:\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"/ig,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) add(match[1]);
  }
  if (!candidates.length) {
    const found = text.match(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)[^\s"'<>]*/ig) || [];
    for (const value of found.slice(0, 6)) add(value);
  }
  return candidates;
}

function extractMedia(source, body, base) {
  const document = host.parseHtml(body);
  const candidates = mediaFromDocument(document, body, base);
  if (candidates.length) {
    const hls = candidates.filter((item) => /\.m3u8(?:\?|$)/i.test(item));
    return hls.length ? hls[0] : candidates[0];
  }
  const frames = collect(document, (node) => node.tag === "iframe" && attribute(node, "src") !== "", 4);
  for (const frame of frames) {
    const address = absoluteAny(base, attribute(frame, "src"));
    if (!address || !/voe\.sx/i.test(address)) continue;
    try {
      const response = host.fetchText({ url: address, referer: base });
      const text = String(response.body || "");
      const nested = mediaFromDocument(host.parseHtml(text), text, response.url || address);
      if (nested.length) {
        const hls = nested.filter((item) => /\.m3u8(?:\?|$)/i.test(item));
        return hls.length ? hls[0] : nested[0];
      }
    } catch (error) { /* try next frame */ }
  }
  return "";
}

module.exports = {
  validCategory(category) {
    const value = String(category === undefined || category === null ? "" : category).trim();
    return value === "" || sourceById(value) !== null;
  },

  categories() {
    const list = activeSources();
    return (list.length ? list : sources).map((source) => ({ id: source.id, name: source.name }));
  },

  catalogPage(page, category) {
    return pageResult(page, String(category === undefined || category === null ? "" : category).trim(), "");
  },

  search(page, query) {
    const keyword = clean(query);
    if (!keyword) return { items: [], hasMore: false };
    return pageResult(page, "", keyword);
  },

  detail(sourceId) {
    const text = String(sourceId === undefined || sourceId === null ? "" : sourceId).trim();
    const source = sourceOfUrl(text);
    if (!source) throw new Error("视频来源未知");
    const response = host.fetchText({ url: text, referer: source.home + "/" });
    const body = String(response.body || "");
    const document = host.parseHtml(body);
    const url = response.url || text;
    const title = detailTitle(source, document);
    const cover = cachedCover(text);
    const drama = {
      id: host.dramaId(text),
      source: host.source,
      sourceId: text,
      title: title,
      name: title,
      cover: cover,
      coverUrl: cover,
      channelName: source.name,
      categoryName: source.name,
      tags: [source.name],
      sourceUrl: text,
    };
    const chapters = [];
    if (source.id === "megapornfreehd") {
      const players = megaPlayers(document, text);
      for (let index = 0; index < players.length && index < 8; index++) {
        const player = players[index];
        let label = "";
        try { label = String(host.parseUrl(player).hostname || "").replace(/^www\./i, ""); } catch (error) { /* ignore */ }
        chapters.push({
          id: host.chapterId(player, String(index + 1)),
          source: host.source,
          title: "线路 " + (index + 1) + (label ? " · " + label : ""),
          currentEpisode: 1,
          videoUrl: BROWSER_MARKER + player,
          referer: source.home + "/",
        });
      }
    }
    if (!chapters.length) {
      chapters.push({
        id: host.chapterId(text, "1"),
        source: host.source,
        title: title.slice(0, 128),
        currentEpisode: 1,
        pageUrl: text,
        referer: source.home + "/",
        videoUrl: text,
      });
    }
    drama.totalEpisode = chapters.length;
    drama.episodeCount = chapters.length;
    drama.remark = chapters.length + " 条线路";
    return { drama: drama, chapters: chapters };
  },

  resolveMedia(task) {
    const taskObject = task && typeof task === "object" ? task : {};
    const chapter = taskObject.chapter || {};
    const pageUrl = String(chapter.pageUrl || "").trim();
    if (!pageUrl || pageUrl.indexOf(BROWSER_MARKER) === 0) {
      throw new Error("MegaPornFreeHD 需要先在应用内浏览器完成验证，请重新播放");
    }
    let source = sourceOfUrl(pageUrl) || sourceOfUrl(String(chapter.referer || ""));
    if (!source) {
      const embedded = /https?:\/\/[^\s]+/.exec(String(taskObject.dramaId || ""));
      source = embedded ? sourceOfUrl(embedded[0]) : null;
    }
    if (!source) throw new Error("播放信息无效，请刷新详情后重试");
    if (/\.(?:mp4|m3u8)(?:[/?#]|$)/i.test(pageUrl)) {
      return host.prepareWebMedia({ url: pageUrl, referer: originOf(pageUrl) + "/" }, source.name);
    }
    const referer = originOf(pageUrl) + "/";
    const response = host.fetchText({ url: pageUrl, referer: referer });
    const body = String(response.body || "");
    const base = response.url || pageUrl;
    let media = "";
    if (/\/pass_md5\//.test(body)) media = doodMedia(base, body);
    if (!media) media = extractMedia(source, body, base);
    if (!media) throw new Error(source.name + " 播放地址解析失败，请换一条线路");
    return host.prepareWebMedia({ url: media, referer: base }, source.name);
  },
};
