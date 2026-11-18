const site = "https://4horlover.com";
const siteName = "4horLover";
const browserMarker = "browser://";
const postPattern = /^[0-9]{1,12}$/;
const cookie = "age_gate=1";
const declaredHosts = [
  "4horlover.com",
  "www.4horlover.com",
  "mxdrop.click",
  "mixdrop.top",
  "mixdrop.co",
  "mxdrop.to",
  "mixdrop.ag",
  "dood.to",
  "dood.watch",
  "doodstream.com",
  "playmogo.com",
  "ds2play.com",
  "advtpe.com",
  "www.advtpe.com",
  "*.advtpe.com",
  "*.doodcdn.io",
  "*.cloudatacdn.com",
  "*.mxcontent.net",
  "mxcontent.net",
];
const shortHosts = [
  "ouo.io",
  "ouo.press",
  "ouo.pw",
  "tii.ai",
  "za.gl",
  "za.uy",
  "boost.ink",
  "linkvertise.com",
  "adf.ly",
  "shrinkme.io",
  "shrinke.me",
  "gplinks.co",
  "exe.io",
  "clk.sh",
];
const playerHosts = [
  "mxdrop.click",
  "mixdrop.top",
  "mixdrop.co",
  "mxdrop.to",
  "mixdrop.ag",
  "dood.to",
  "dood.watch",
  "doodstream.com",
  "voe.sx",
  "streamtape.com",
  "streamtape.to",
];
const ignoredHosts = [
  "google.com",
  "www.google.com",
  "drive.google.com",
  "docs.google.com",
  "youtube.com",
  "www.youtube.com",
  "facebook.com",
  "www.facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "pinterest.com",
  "reddit.com",
  "t.me",
  "telegram.me",
  "discord.gg",
  "patreon.com",
  "onlyfans.com",
  "mega.nz",
  "1fichier.com",
];
const playerText = /play|watch|video|在线|播放|观看|线路/i;
const ignoredExtension = /\.(jpe?g|png|gif|webp|svg|ico|css|js|zip|rar|7z|torrent)([?#]|$)/i;
const gridPageSize = 6;
const pageLimit = 500;

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

function normalizeText(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/g, "&");
}

function fetchPage(address) {
  const response = host.fetchText({ url: address, referer: site + "/", cookie });
  return { url: response.url || address, body: response.body };
}

function fetchArticles(addresses) {
  let empty = null;
  for (const address of addresses) {
    let response;
    try {
      response = fetchPage(address);
    } catch (error) {
      continue;
    }
    if (articleBlocks(response.body).length > 0) {
      return response;
    }
    if (empty === null) {
      empty = response;
    }
  }
  return empty;
}

function articleBlocks(body) {
  return String(body).match(/<article\b[\s\S]*?<\/article>/gi) || [];
}

function attribute(block, name) {
  const pattern = new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i");
  const match = String(block).match(pattern);
  return match ? match[1] : "";
}

function postId(block) {
  const fromId = /\bid=["']post-([0-9]{1,12})["']/i.exec(block);
  if (fromId) {
    return fromId[1];
  }
  const fromLink = /\?p=([0-9]{1,12})/.exec(block);
  return fromLink ? fromLink[1] : "";
}

function entryTitle(block) {
  for (const tag of ["h1", "h2", "h3"]) {
    const pattern = new RegExp("<" + tag + "\\b[^>]*\\bentry-title\\b[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i");
    const match = pattern.exec(block);
    if (match) {
      const text = clean(match[1].replace(/<[^>]*>/g, " "));
      if (text !== "") {
        return text;
      }
    }
  }
  return "";
}

function entryCover(block, pageUrl) {
  const images = block.match(/<img\b[^>]*>/gi) || [];
  for (const image of images) {
    for (const name of ["src", "data-src", "data-original"]) {
      const raw = clean(attribute(image, name));
      if (raw === "" || raw.indexOf("data:image") === 0) {
        continue;
      }
      try {
        return host.resolveUrl(pageUrl, raw);
      } catch (error) {
        continue;
      }
    }
  }
  return "";
}

function entryTags(block) {
  const tags = [];
  const pattern = /<a\b[^>]*\brel=["']tag["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    const name = clean(match[1].replace(/<[^>]*>/g, " "));
    if (name !== "" && tags.indexOf(name) < 0 && Array.from(name).length <= 40) {
      tags.push(name);
    }
    if (tags.length >= 10) {
      break;
    }
  }
  return tags;
}

function entryDate(block) {
  const match = /<time\b[^>]*\bdatetime=["']([^"']+)["']/i.exec(block);
  return match ? match[1].slice(0, 10) : "";
}

function entrySize(block) {
  const match = /Total\s*Size\s*:?\s*([0-9.]+\s*(?:GB|MB|KB))/i.exec(block);
  return match ? clean(match[1]) : "";
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

function resolveAddress(raw) {
  let address = "";
  try {
    address = host.resolveUrl(site + "/", clean(raw));
  } catch (error) {
    return "";
  }
  return /^https?:\/\//i.test(address) ? address : "";
}

function isExternal(address) {
  const name = hostNameOf(address);
  return name !== "" && name !== "4horlover.com" && name !== "www.4horlover.com";
}

function isPlayableLink(address) {
  if (!isExternal(address)) {
    return false;
  }
  const name = hostNameOf(address);
  if (ignoredHosts.indexOf(name) >= 0) {
    return false;
  }
  if (ignoredExtension.test(address)) {
    return false;
  }
  return true;
}

function linkEntries(block) {
  const links = [];
  const pattern = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    links.push({ href: clean(match[1]), text: clean(match[2].replace(/<[^>]*>/g, " ")) });
  }
  return links;
}

function entryMirrors(block) {
  const found = [];
  const links = linkEntries(block);
  const add = (address) => {
    if (address !== "" && found.indexOf(address) < 0) {
      found.push(address);
    }
  };
  for (const link of links) {
    const name = hostNameOf(resolveAddress(link.href));
    if (shortHosts.indexOf(name) >= 0) {
      add(resolveAddress(link.href));
    }
  }
  if (found.length === 0) {
    for (const link of links) {
      if (!playerText.test(link.text)) {
        continue;
      }
      const address = resolveAddress(link.href);
      if (address !== "" && (isPlayableLink(address) || !isExternal(address))) {
        add(address);
      }
    }
  }
  if (found.length === 0) {
    for (const link of links) {
      const address = resolveAddress(link.href);
      if (isPlayableLink(address)) {
        add(address);
      }
    }
  }
  return found.slice(0, 8);
}

function pageTitle(body) {
  const match = /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i.exec(String(body));
  if (match) {
    return clean(match[1]).replace(/\s*[|｜]\s*[^|｜]*$/, "").trim();
  }
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(String(body));
  if (title) {
    return clean(title[1].replace(/<[^>]*>/g, " ")).replace(/\s*[|｜]\s*[^|｜]*$/, "").trim();
  }
  return "";
}

function dramaOf(block, pageUrl, titleFallback) {
  const id = postId(block);
  const heading = entryTitle(block);
  const title = heading !== "" ? heading : String(titleFallback || "");
  if (id === "" || title === "") {
    return null;
  }
  const cover = entryCover(block, pageUrl);
  const tags = entryTags(block);
  const size = entrySize(block);
  const mirrors = entryMirrors(block);
  const onlineDate = entryDate(block);
  const drama = {
    id: host.dramaId(id),
    source: host.source,
    sourceId: id,
    title: truncate(title, 512),
    name: truncate(title, 512),
    cover,
    coverUrl: cover,
    channelName: siteName,
    categoryName: tags.length > 0 ? tags[0] : "",
    remark: size,
    tags: tags.slice(0, 10),
    sourceUrl: site + "/?p=" + id,
  };
  if (size !== "") {
    drama.badge = size;
  }
  if (onlineDate !== "") {
    drama.onlineDate = onlineDate;
  }
  if (mirrors.length > 0) {
    drama.desc = "线路 " + mirrors.length + " 个" + (size !== "" ? "，大小 " + size : "");
    drama.intro = drama.desc;
  }
  return { drama, mirrors };
}

function pageItems(body, pageUrl) {
  const items = [];
  for (const block of articleBlocks(body)) {
    const entry = dramaOf(block, pageUrl, "");
    if (entry) {
      items.push(entry.drama);
    }
  }
  return items;
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

function readPageSignature(key) {
  try {
    const raw = host.loadState("page-signature:" + key);
    const parsed = raw === "" ? null : JSON.parse(raw);
    return parsed && typeof parsed.page === "number" && typeof parsed.signature === "string" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function writePageSignature(key, page, signature) {
  try {
    host.saveState("page-signature:" + key, JSON.stringify({ page, signature }));
  } catch (error) {
    return;
  }
}

function incrementalPaging(key, page, items) {
  const previous = readPageSignature(key);
  const signature = pageSignature(items);
  const repeated = previous !== null && previous.page === page - 1 && previous.signature === signature;
  writePageSignature(key, page, signature);
  return items.length > 0 && !repeated;
}

function unpackPacked(body) {
  const pattern = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',([0-9]+),([0-9]+),'([\s\S]*?)'\.split\('\|'\)/;
  const match = String(body).match(pattern);
  if (!match) {
    return "";
  }
  const base = parseInt(match[2], 10) || 62;
  const count = parseInt(match[3], 10) || 0;
  const words = match[4].split("|");
  const token = function (value) {
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
      source = source.replace(new RegExp("\\b" + token(index) + "\\b", "g"), function () {
        return replacement;
      });
    }
  }
  return source;
}

function mediaOf(playerBody) {
  const unpacked = unpackPacked(playerBody);
  const source = unpacked !== "" ? unpacked : normalizeText(playerBody);
  const keys = [/wurl\s*=\s*["']([^"']+)["']/, /"file"\s*:\s*["']([^"']+)["']/, /sources\s*:\s*\[\s*\{[^}]*["']src["']\s*:\s*["']([^"']+)["']/];
  for (const pattern of keys) {
    const match = pattern.exec(source);
    if (match) {
      const address = absoluteMedia(match[1]);
      if (address !== "") {
        return address;
      }
    }
  }
  const plain = /https?:\/\/[^\s"'\\<>()]+\.(?:mp4|m3u8)[^\s"'\\<>()]*/i.exec(source);
  return plain ? absoluteMedia(plain[0]) : "";
}

function absoluteMedia(raw) {
  let address = normalizeText(raw).trim();
  if (address.indexOf("//") === 0) {
    address = "https:" + address;
  }
  return /^https?:\/\//.test(address) ? address : "";
}

const doodHosts = ["playmogo.com", "dood.to", "dood.watch", "doodstream.com", "ds2play.com", "advtpe.com"];

function isDoodHost(address) {
  const name = hostNameOf(address);
  for (const pattern of doodHosts) {
    if (name === pattern || name.slice(-(pattern.length + 1)) === "." + pattern) {
      return true;
    }
  }
  return false;
}

function randomToken(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let text = "";
  for (let index = 0; index < length; index++) {
    text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return text;
}

const browserHeaders = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

function fetchPlayerBody(address, referer) {
  const headers = Object.assign({}, browserHeaders, { cookie });
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
  return String((response && response.body) || "");
}

function redirectTarget(body, base) {
  const text = normalizeText(body);
  const meta = /http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>\s]+)/i.exec(text);
  if (meta) {
    return resolveAddress(meta[1]) || absoluteMedia(meta[1]);
  }
  const assigned = /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i.exec(text);
  if (assigned) {
    return resolveAddress(assigned[1]);
  }
  return "";
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
    base = String(fetchPlayerBody(origin + pass[0], address)).trim();
  } catch (error) {
    return "";
  }
  if (!/^https?:\/\//.test(base)) {
    return "";
  }
  const token = pass[0].slice(pass[0].lastIndexOf("/") + 1);
  return base + randomToken(10) + "?token=" + token + "&expiry=" + Date.now();
}

function originOf(address) {
  try {
    const parsed = host.parseUrl(address);
    return parsed.scheme + "://" + parsed.host;
  } catch (error) {
    return "";
  }
}

function mirrorPage(origin, fileId) {
  return origin + "/e/" + fileId;
}

/// 广告中间页里通常带着指向真实播放器的链接（/e/<id> 这种），挨个试。
function outboundPlayers(body, base) {
  const found = [];
  const text = normalizeText(body);
  const pattern = /https?:\/\/[^\s"'<>()\\]+?\/(?:e|f|d)\/[A-Za-z0-9]{6,32}/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const address = match[0];
    const name = hostNameOf(address);
    if (name === "" || name === "4horlover.com" || name === "www.4horlover.com") continue;
    if (found.indexOf(address) < 0) {
      found.push(address);
    }
    if (found.length >= 3) {
      break;
    }
  }
  if (found.length === 0) {
    const relative = /["'](\/(?:e|f|d)\/[A-Za-z0-9]{6,32})["']/gi;
    while ((match = relative.exec(text)) !== null) {
      const address = resolveAddress(match[1]);
      if (address !== "" && found.indexOf(address) < 0) {
        found.push(address);
      }
      if (found.length >= 3) {
        break;
      }
    }
  }
  return found;
}

function parseMirror(address) {
  let parsed;
  try {
    parsed = host.parseUrl(address);
  } catch (error) {
    return null;
  }
  const hostname = String(parsed.hostname || "").toLowerCase();
  if (hostname === "" || hostname === "4horlover.com" || hostname === "www.4horlover.com") {
    return null;
  }
  const match = /\/(?:f|e|d)\/([A-Za-z0-9]{6,32})/.exec(parsed.path || "");
  if (!match) {
    return null;
  }
  return { origin: parsed.scheme + "://" + parsed.host, fileId: match[1] };
}

function postLink(body, id) {
  for (const block of articleBlocks(body)) {
    if (postId(block) !== id) {
      continue;
    }
    for (const link of linkEntries(block)) {
      const address = resolveAddress(link.href);
      if (address !== "" && !isExternal(address)) {
        return address;
      }
    }
  }
  return "";
}

function expandMirror(address) {
  if (isExternal(address)) {
    return address;
  }
  try {
    const response = host.fetchText({ url: address, referer: site + "/", cookie });
    const final = response.url || "";
    return isExternal(final) ? final : "";
  } catch (error) {
    return "";
  }
}

function dramaSourceId(task) {
  const prefix = host.source + ":";
  const value = task && typeof task.dramaId === "string" ? task.dramaId : "";
  if (value.indexOf(prefix) !== 0) {
    return "";
  }
  const id = value.slice(prefix.length).trim();
  return postPattern.test(id) ? id : "";
}

module.exports = {
  validCategory(category) {
    return category === "";
  },

  categories() {
    return [{ id: "", name: "最新" }];
  },

  catalogPage(page, category) {
    if (category !== "") {
      throw new Error(siteName + "没有分类 " + category);
    }
    if (!(page >= 1) || page > pageLimit) {
      return { items: [], hasMore: false };
    }
    const addresses = page > 1 ? [site + "/?paged=" + page, site + "/page/" + page + "/"] : [site + "/"];
    const response = fetchArticles(addresses);
    if (response === null) {
      return { items: [], hasMore: false };
    }
    const items = pageItems(response.body, response.url);
    const hasMore = incrementalPaging("latest", page, items);
    host.log("4horLover 第 " + page + " 页：" + items.length + " 条，继续=" + hasMore + "（" + response.url + "）");
    return { items, hasMore };
  },

  search(page, query) {
    const keyword = clean(query);
    if (!(page >= 1) || page > pageLimit || keyword === "") {
      return { items: [], hasMore: false };
    }
    const encoded = encodeURIComponent(keyword).replace(/\+/g, "%20");
    const addresses = page > 1
      ? [site + "/?s=" + encoded + "&paged=" + page, site + "/page/" + page + "/?s=" + encoded]
      : [site + "/?s=" + encoded];
    const response = fetchArticles(addresses);
    if (response === null) {
      return { items: [], hasMore: false };
    }
    const items = pageItems(response.body, response.url);
    return { items, hasMore: incrementalPaging("search:" + encoded, page, items) };
  },

  detail(sourceId) {
    const id = String(sourceId || "").trim();
    if (!postPattern.test(id)) {
      throw new Error(siteName + "影片编号无效");
    }
    let response = fetchArticles([site + "/?p=" + id]);
    let entry = null;
    if (response !== null) {
      for (const block of articleBlocks(response.body)) {
        if (postId(block) === id) {
          entry = dramaOf(block, response.url, pageTitle(response.body));
          break;
        }
      }
    }
    if (!entry) {
      const home = fetchArticles([site + "/"]);
      const link = home === null ? "" : postLink(home.body, id);
      if (link !== "") {
        const page = fetchArticles([link]);
        if (page !== null) {
          response = page;
          for (const block of articleBlocks(page.body)) {
            if (postId(block) === id) {
              entry = dramaOf(block, page.url, pageTitle(page.body));
              break;
            }
          }
        }
      }
    }
    if (!entry) {
      throw new Error(siteName + "没有找到这个影片");
    }
    const mirrors = [];
    for (const address of entry.mirrors) {
      const expanded = expandMirror(address);
      if (expanded !== "" && mirrors.indexOf(expanded) < 0) {
        mirrors.push(expanded);
      }
    }
    if (mirrors.length === 0) {
      throw new Error(siteName + "这个影片没有在线线路");
    }
    const chapters = [];
    for (let index = 0; index < mirrors.length; index++) {
      chapters.push({
        id: host.chapterId(id, String(index + 1)),
        source: host.source,
        title: "线路 " + (index + 1),
        currentEpisode: index + 1,
        videoUrl: browserMarker + mirrors[index],
        referer: site + "/",
      });
    }
    entry.drama.totalEpisode = chapters.length;
    entry.drama.episodeCount = chapters.length;
    entry.drama.remark = chapters.length + " 条线路" + (entry.drama.badge ? " · " + entry.drama.badge : "");
    return { drama: entry.drama, chapters };
  },

  resolveMedia(task) {
    const sourceId = dramaSourceId(task);
    if (sourceId === "") {
      throw new Error(siteName + "播放信息无效，请刷新详情后重试");
    }
    const chapter = (task && task.chapter) || {};
    const pageUrl = typeof chapter.pageUrl === "string" ? chapter.pageUrl.trim() : "";
    if (pageUrl === "" || pageUrl.indexOf(browserMarker) === 0) {
      throw new Error(siteName + "需要先在应用内浏览器完成验证，请重新播放");
    }
    const hostname = hostNameOf(pageUrl);
    let address = "";
    let reason = "";
    if (/\.(mp4|m3u8)([/?#]|$)/i.test(pageUrl)) {
      address = pageUrl;
    } else {
      const mirror = parseMirror(pageUrl);
      const candidates = mirror ? [mirrorPage(mirror.origin, mirror.fileId), pageUrl] : [pageUrl];
      for (const candidate of candidates) {
        let body = "";
        try {
          body = fetchPlayerBody(candidate, originOf(pageUrl) + "/");
        } catch (error) {
          reason = hostname + " 打不开（" + (error && error.message ? error.message : error) + "）";
          continue;
        }
        if (/\/pass_md5\//.test(body) || isDoodHost(candidate)) {
          address = doodMedia(candidate, body);
          if (address !== "") {
            break;
          }
          reason = hostname + " 的播放器没有给出 pass_md5";
          continue;
        }
        address = mediaOf(body);
        if (address !== "") {
          break;
        }
        for (const outbound of outboundPlayers(body, candidate)) {
          let page = "";
          try {
            page = fetchPlayerBody(outbound, candidate);
          } catch (error) {
            continue;
          }
          address = /\/pass_md5\//.test(page) ? doodMedia(outbound, page) : mediaOf(page);
          if (address !== "") {
            break;
          }
        }
        if (address !== "") {
          break;
        }
        const next = redirectTarget(body, candidate);
        if (next !== "" && next !== candidate) {
          try {
            address = mediaOf(fetchPlayerBody(next, candidate));
          } catch (error) {
            address = "";
          }
          if (address !== "") {
            break;
          }
        }
        reason = hostname + " 的页面里没有播放地址";
      }
    }
    if (address === "") {
      throw new Error(siteName + "播放地址解析失败，请换一条线路：" + (reason || "落地页没有播放地址"));
    }
    return host.prepareWebMedia({ url: address, referer: originOf(pageUrl) + "/" }, siteName);
  },
};
