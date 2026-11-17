const site = "https://4horlover.com";
const siteName = "4horLover";
const browserMarker = "browser://";
const postPattern = /^[0-9]{1,12}$/;
const mediaHosts = ["mxdrop.click", "mixdrop.top", "mixdrop.co", "mxdrop.to"];
const cookie = "age_gate=1";

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

function fetchPage(address) {
  const response = host.fetchText({ url: address, referer: site + "/", cookie });
  return { url: response.url || address, body: response.body };
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
  const heading = /<h2\b[^>]*\bentry-title\b[^>]*>([\s\S]*?)<\/h2>/i.exec(block);
  if (!heading) {
    return "";
  }
  return clean(heading[1].replace(/<[^>]*>/g, " "));
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

function entryMirrors(block) {
  const mirrors = [];
  const pattern = /<a\b[^>]*\bhref=["'](https?:\/\/ouo\.(?:io|press)\/[A-Za-z0-9]+)["'][^>]*>([\s\S]{0,40}?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    if (mirrors.indexOf(match[1]) < 0) {
      mirrors.push(match[1]);
    }
    if (mirrors.length >= 8) {
      break;
    }
  }
  return mirrors;
}

function dramaOf(block, pageUrl) {
  const id = postId(block);
  const title = entryTitle(block);
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
    const entry = dramaOf(block, pageUrl);
    if (entry) {
      items.push(entry.drama);
    }
  }
  return items;
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
  const source = unpacked !== "" ? unpacked : String(playerBody);
  const match = /wurl\s*=\s*["']([^"']+)["']/.exec(source);
  if (!match) {
    return "";
  }
  let address = match[1].replace(/&amp;/g, "&");
  if (address.indexOf("//") === 0) {
    address = "https:" + address;
  }
  return /^https?:\/\//.test(address) ? address : "";
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

function parseMirror(address) {
  let parsed;
  try {
    parsed = host.parseUrl(address);
  } catch (error) {
    return null;
  }
  const hostname = String(parsed.hostname || "").toLowerCase();
  if (mediaHosts.indexOf(hostname) < 0) {
    return null;
  }
  const match = /\/(?:f|e|d)\/([A-Za-z0-9]{6,32})/.exec(parsed.path || "");
  if (!match) {
    return null;
  }
  return { origin: parsed.scheme + "://" + parsed.host, fileId: match[1] };
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
    if (!(page >= 1) || page > 1) {
      return { items: [], hasMore: false };
    }
    const response = fetchPage(site + "/");
    return { items: pageItems(response.body, response.url), hasMore: false };
  },

  search(page, query) {
    const keyword = clean(query);
    if (!(page >= 1) || page > 1 || keyword === "") {
      return { items: [], hasMore: false };
    }
    const address = site + "/?s=" + encodeURIComponent(keyword).replace(/\+/g, "%20");
    const response = fetchPage(address);
    return { items: pageItems(response.body, response.url), hasMore: false };
  },

  detail(sourceId) {
    const id = String(sourceId || "").trim();
    if (!postPattern.test(id)) {
      throw new Error(siteName + "影片编号无效");
    }
    const response = fetchPage(site + "/?p=" + id);
    const blocks = articleBlocks(response.body);
    let entry = null;
    for (const block of blocks) {
      if (postId(block) === id) {
        entry = dramaOf(block, response.url);
        break;
      }
    }
    if (!entry) {
      throw new Error(siteName + "没有找到这个影片");
    }
    if (entry.mirrors.length === 0) {
      throw new Error(siteName + "这个影片没有在线线路");
    }
    const chapters = [];
    for (let index = 0; index < entry.mirrors.length; index++) {
      chapters.push({
        id: host.chapterId(id, String(index + 1)),
        source: host.source,
        title: "线路 " + (index + 1),
        currentEpisode: index + 1,
        videoUrl: browserMarker + entry.mirrors[index],
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
    const mirror = parseMirror(pageUrl);
    if (!mirror) {
      if (pageUrl.indexOf("playmogo.com") >= 0 || pageUrl.indexOf("dood") >= 0 || pageUrl.indexOf("jgvcdn.com") >= 0) {
        throw new Error(siteName + "这个线路暂不支持，请换一条线路");
      }
      throw new Error(siteName + "播放地址无法识别，请换一条线路");
    }
    const playerUrl = mirrorPage(mirror.origin, mirror.fileId);
    const response = host.fetchText({ url: playerUrl, referer: mirror.origin + "/" });
    const address = mediaOf(response.body);
    if (address === "") {
      throw new Error(siteName + "播放地址解析失败，请换一条线路");
    }
    return host.prepareWebMedia({ url: address, referer: mirror.origin + "/" }, siteName);
  },
};
