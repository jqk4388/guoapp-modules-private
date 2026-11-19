const platformKey = "7961beb44246e3012ce228d6b5ced05a";
const channelName = "黄豆短剧";
const seedBase = "https://wlzetqez.cc";
const apiVersion = "1.0.0";
const pageSize = 18;
const stateName = "site";

const categories = [
  { id: "yuandou", name: "黄豆原创", cat: "246506" },
  { id: "gaizao", name: "魔改短剧", cat: "246502" },
  { id: "caibian", name: "擦边短剧", cat: "246505" },
  { id: "zhenren", name: "真人短剧", cat: "817202" },
  { id: "danti", name: "单体作品", cat: "246503" },
  { id: "lifan", name: "里番动漫", cat: "817201" },
];

function readState() {
  let raw = "";
  try {
    raw = host.loadState(stateName);
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
    host.saveState(stateName, JSON.stringify(state));
  } catch (error) {
    host.log("黄豆短剧写入本地状态失败：" + error.message);
  }
}

function padHex(value) {
  const text = String(value);
  return text.length < 2 ? "0" + text : text;
}

function uuidV4() {
  const bytes = host.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  let hex = "";
  for (let index = 0; index < 16; index++) {
    hex += padHex(bytes[index].toString(16));
  }
  return (
    hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20)
  );
}

function utf8(text) {
  return host.utf8Encode(String(text));
}

function utf8Text(bytes) {
  return host.utf8Decode(bytes);
}

function hexOf(bytes) {
  return host.hexEncode(bytes);
}

function hexToBytes(text) {
  return host.hexDecode(String(text));
}

function concatBytes(first, second) {
  const out = new Uint8Array(first.length + second.length);
  out.set(first, 0);
  out.set(second, first.length);
  return out;
}

function md5Hex(text) {
  return hexOf(host.md5(utf8(text)));
}

function hmacSha256(keyBytes, messageBytes) {
  const blockSize = 64;
  let key = keyBytes;
  if (key.length > blockSize) {
    key = host.sha256(key);
  }
  const inner = new Uint8Array(blockSize + messageBytes.length);
  const outer = new Uint8Array(blockSize + 32);
  for (let index = 0; index < blockSize; index++) {
    const byte = index < key.length ? key[index] : 0;
    inner[index] = byte ^ 0x36;
    outer[index] = byte ^ 0x5c;
  }
  inner.set(messageBytes, blockSize);
  const digest = host.sha256(inner);
  outer.set(digest, blockSize);
  return host.sha256(outer);
}

function pkcs7Pad(bytes) {
  const padding = 16 - (bytes.length % 16);
  const out = new Uint8Array(bytes.length + padding);
  out.set(bytes, 0);
  for (let index = 0; index < padding; index++) {
    out[bytes.length + index] = padding;
  }
  return out;
}

function pkcs7Unpad(bytes) {
  if (bytes.length === 0) {
    return bytes;
  }
  const padding = bytes[bytes.length - 1];
  if (padding < 1 || padding > 16 || padding > bytes.length) {
    throw new Error("黄豆短剧响应填充无效");
  }
  return bytes.subarray(0, bytes.length - padding);
}

let crcTable = null;

function crc32(bytes) {
  if (crcTable === null) {
    crcTable = [];
    for (let index = 0; index < 256; index++) {
      let value = index;
      for (let bit = 0; bit < 8; bit++) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable.push(value >>> 0);
    }
  }
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function gzipPack(bytes) {
  const parts = [0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff];
  let offset = 0;
  if (bytes.length === 0) {
    parts.push(1, 0x00, 0x00, 0xff, 0xff);
  }
  while (offset < bytes.length) {
    const length = Math.min(65535, bytes.length - offset);
    const last = offset + length >= bytes.length ? 1 : 0;
    parts.push(last, length & 0xff, (length >>> 8) & 0xff, ~length & 0xff, (~length >>> 8) & 0xff);
    for (let index = 0; index < length; index++) {
      parts.push(bytes[offset + index]);
    }
    offset += length;
  }
  const crc = crc32(bytes);
  parts.push(crc & 0xff, (crc >>> 8) & 0xff, (crc >>> 16) & 0xff, (crc >>> 24) & 0xff);
  parts.push(bytes.length & 0xff, (bytes.length >>> 8) & 0xff, (bytes.length >>> 16) & 0xff, (bytes.length >>> 24) & 0xff);
  return Uint8Array.from(parts);
}

const lengthBase = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const lengthExtra = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const distanceBase = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const distanceExtra = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

function huffmanTable(lengths, maxBits) {
  const count = [];
  for (let index = 0; index <= 15; index++) {
    count.push(0);
  }
  for (let index = 0; index < lengths.length; index++) {
    count[lengths[index]]++;
  }
  count[0] = 0;
  const nextCode = [];
  let code = 0;
  for (let bits = 1; bits <= 15; bits++) {
    code = (code + count[bits - 1]) << 1;
    nextCode.push(code);
  }
  const table = new Int32Array(1 << maxBits);
  const size = 1 << maxBits;
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const bits = lengths[symbol];
    if (bits === 0) {
      continue;
    }
    const entry = nextCode[bits - 1]++;
    let reversed = 0;
    let value = entry;
    for (let index = 0; index < bits; index++) {
      reversed = (reversed << 1) | (value & 1);
      value >>>= 1;
    }
    const packed = (bits << 16) | symbol;
    const step = 1 << bits;
    for (let slot = reversed; slot < size; slot += step) {
      table[slot] = packed;
    }
  }
  return { table: table, maxBits: maxBits };
}

function inflateRaw(source) {
  const data = new Uint8Array(source.length + 8);
  data.set(source, 0);
  let position = 0;
  let bitBuffer = 0;
  let bitCount = 0;
  const out = [];

  function need(bits) {
    while (bitCount < bits) {
      bitBuffer |= data[position++] << bitCount;
      bitCount += 8;
    }
  }

  function take(bits) {
    if (bits === 0) {
      return 0;
    }
    need(bits);
    const value = bitBuffer & ((1 << bits) - 1);
    bitBuffer >>>= bits;
    bitCount -= bits;
    return value;
  }

  function decode(table) {
    need(table.maxBits);
    const entry = table.table[bitBuffer & ((1 << table.maxBits) - 1)];
    if (entry === 0) {
      throw new Error("黄豆短剧压缩数据无效");
    }
    const bits = entry >>> 16;
    bitBuffer >>>= bits;
    bitCount -= bits;
    return entry & 0xffff;
  }

  let final = 0;
  while (!final) {
    final = take(1);
    const type = take(2);
    if (type === 0) {
      bitBuffer = 0;
      bitCount = 0;
      const length = data[position] | (data[position + 1] << 8);
      position += 4;
      for (let index = 0; index < length; index++) {
        out.push(data[position + index]);
      }
      position += length;
      continue;
    }
    let literalTable = null;
    let distanceTable = null;
    if (type === 1) {
      const literalLengths = [];
      for (let index = 0; index < 288; index++) {
        literalLengths.push(index < 144 ? 8 : index < 256 ? 9 : index < 280 ? 7 : 8);
      }
      literalTable = huffmanTable(literalLengths, 15);
      const distanceLengths = [];
      for (let index = 0; index < 30; index++) {
        distanceLengths.push(5);
      }
      distanceTable = huffmanTable(distanceLengths, 15);
    } else if (type === 2) {
      const literalCount = take(5) + 257;
      const distanceCount = take(5) + 1;
      const codeCount = take(4) + 4;
      const codeLengths = [];
      for (let index = 0; index < 19; index++) {
        codeLengths.push(0);
      }
      for (let index = 0; index < codeCount; index++) {
        codeLengths[codeLengthOrder[index]] = take(3);
      }
      const codeTable = huffmanTable(codeLengths, 7);
      const lengths = [];
      while (lengths.length < literalCount + distanceCount) {
        const symbol = decode(codeTable);
        if (symbol < 16) {
          lengths.push(symbol);
          continue;
        }
        let repeat = 0;
        let value = 0;
        if (symbol === 16) {
          if (lengths.length === 0) {
            throw new Error("黄豆短剧压缩数据无效");
          }
          value = lengths[lengths.length - 1];
          repeat = 3 + take(2);
        } else if (symbol === 17) {
          repeat = 3 + take(3);
        } else {
          repeat = 11 + take(7);
        }
        for (let index = 0; index < repeat; index++) {
          lengths.push(value);
        }
      }
      literalTable = huffmanTable(lengths.slice(0, literalCount), 15);
      distanceTable = huffmanTable(lengths.slice(literalCount), 15);
    } else {
      throw new Error("黄豆短剧压缩数据无效");
    }
    while (true) {
      const symbol = decode(literalTable);
      if (symbol < 256) {
        out.push(symbol);
        continue;
      }
      if (symbol === 256) {
        break;
      }
      const lengthIndex = symbol - 257;
      let length = lengthBase[lengthIndex];
      const extraLength = lengthExtra[lengthIndex];
      if (extraLength > 0) {
        length += take(extraLength);
      }
      const distanceSymbol = decode(distanceTable);
      let distance = distanceBase[distanceSymbol];
      const extraDistance = distanceExtra[distanceSymbol];
      if (extraDistance > 0) {
        distance += take(extraDistance);
      }
      const start = out.length - distance;
      if (start < 0) {
        throw new Error("黄豆短剧压缩数据无效");
      }
      for (let index = 0; index < length; index++) {
        out.push(out[start + index]);
      }
    }
  }
  return Uint8Array.from(out);
}

function gzipUnpack(bytes) {
  if (bytes.length < 18 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    throw new Error("黄豆短剧响应不是 gzip 数据");
  }
  const flags = bytes[3];
  let position = 10;
  if (flags & 4) {
    const extra = bytes[position] | (bytes[position + 1] << 8);
    position += 2 + extra;
  }
  if (flags & 8) {
    while (position < bytes.length && bytes[position] !== 0) {
      position++;
    }
    position++;
  }
  if (flags & 16) {
    while (position < bytes.length && bytes[position] !== 0) {
      position++;
    }
    position++;
  }
  if (flags & 2) {
    position += 2;
  }
  const size =
    bytes[bytes.length - 4] +
    (bytes[bytes.length - 3] << 8) +
    (bytes[bytes.length - 2] << 16) +
    (bytes[bytes.length - 1] << 24);
  const out = inflateRaw(bytes.subarray(position, bytes.length - 8));
  if (size >= 0 && size < out.length) {
    return out.subarray(0, size);
  }
  return out;
}

function requestKey(requestId) {
  return hmacSha256(utf8(platformKey), hexToBytes(requestId.replace(/-/g, "")));
}

function apiHeaders(path, requestId, sessionId, time) {
  const endpoint = hostPartOf(path);
  return {
    "X-Lang": "zh-CN",
    "content-type": "application/x-www-form-urlencoded",
    deviceBrand: "",
    deviceModel: "",
    deviceType: "web",
    requestId: requestId,
    sessionId: sessionId,
    sign: md5Hex("Dart|" + sessionId + "|" + requestId + "|" + time + "|" + endpoint) + "-" + time,
    systemName: "",
    systemVersion: "",
    time: time,
    version: apiVersion,
  };
}

function hostPartOf(endpoint) {
  return String(endpoint).replace(/^https?:\/\//i, "");
}

function resolveBase() {
  const state = readState();
  let preferred = "";
  try {
    preferred = String(host.preferredSite() || "").trim();
  } catch (error) {
    preferred = "";
  }
  preferred = preferred.replace(/\/+$/, "");
  if (/^https?:\/\/[a-z0-9][a-z0-9.-]{2,80}$/i.test(preferred)) {
    return preferred;
  }
  if (typeof state.base === "string" && /^https?:\/\/[a-z0-9][a-z0-9.-]{2,80}$/i.test(state.base)) {
    return state.base.replace(/\/+$/, "");
  }
  return seedBase;
}

function apiCall(path, data, options) {
  const state = readState();
  const base = resolveBase();
  const endpoint = base + "/api" + path;
  const requestId = uuidV4();
  const sessionId = typeof state.sessionId === "string" && state.sessionId.length >= 16 ? state.sessionId : "0123456789abcdef";
  const time = String(Math.floor(Date.now() / 1000));
  const headers = apiHeaders(endpoint, requestId, sessionId, time);
  const key = requestKey(requestId);
  const token = options && options.token !== undefined ? options.token : state.token || "";
  const body = {
    token: token,
    deviceId: typeof state.deviceId === "string" && state.deviceId !== "" ? state.deviceId : uuidV4(),
    data: data === undefined ? null : data,
  };
  const packed = gzipPack(utf8(JSON.stringify(body)));
  const iv = host.randomBytes(16);
  const sealed = host.aesCbcEncrypt(key, iv, pkcs7Pad(packed));
  const requestBody = concatBytes(iv, sealed);
  const response = host.fetch({
    method: "POST",
    url: endpoint,
    headers: headers,
    bodyBase64: host.base64Encode(requestBody),
    timeoutMs: 20000,
    limit: 4 * 1024 * 1024,
  });
  const bytes = host.hexDecode(host.hexEncode(response.body === undefined ? "" : response.body));
  if (bytes.length === 0) {
    throw new Error("黄豆短剧接口没有返回内容（HTTP " + response.status + "）");
  }
  let payload = null;
  if (bytes[0] === 0x7b) {
    try {
      payload = JSON.parse(utf8Text(bytes));
    } catch (error) {
      payload = null;
    }
  }
  if (payload === null) {
    const sealedBody = pkcs7Unpad(host.aesCbcDecrypt(key, bytes.subarray(0, 16), bytes.subarray(16)));
    payload = JSON.parse(utf8Text(gzipUnpack(sealedBody)));
  }
  if (payload === null || typeof payload !== "object") {
    throw new Error("黄豆短剧接口返回格式无法识别");
  }
  if (payload.status === "n") {
    const message = String(payload.error || "接口返回失败");
    const failure = new Error(message);
    failure.code = payload.errorCode;
    throw failure;
  }
  return payload.data;
}

function ensureSession() {
  const state = readState();
  if (typeof state.deviceId !== "string" || state.deviceId === "") {
    state.deviceId = uuidV4();
  }
  if (typeof state.sessionId !== "string" || state.sessionId.length < 16) {
    state.sessionId = hexOf(host.randomBytes(16));
  }
  if (typeof state.token !== "string" || state.token === "") {
    const data = apiCall(
      "/login/device",
      {
        line_code: "china_1",
        share_code: "",
        channel_code: "",
        clipboard_text: "",
        force_new: "",
        device_info: {
          browserName: "Chrome",
          language: "zh-CN",
          userAgent:
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
          platform: "Linux armv8l",
        },
      },
      { token: "" }
    );
    if (!data || typeof data.token !== "string" || data.token === "") {
      throw new Error("黄豆短剧获取游客身份失败");
    }
    state.token = data.token + (data.user_id ? "_" + data.user_id : "");
    state.userId = data.user_id || "";
    state.nickname = data.nickname || "";
  }
  writeState(state);
  return state;
}

function categoryOf(category) {
  const text = String(category || "").trim();
  if (text === "") {
    return null;
  }
  for (const entry of categories) {
    if (entry.id === text) {
      return entry;
    }
  }
  return categories[0];
}

function dramaFromItem(item, categoryName) {
  if (!item || typeof item.id !== "string" || item.id === "") {
    return null;
  }
  const title = String(item.name || "").trim();
  const description = String(item.description || "").trim();
  const cover = String(item.img || item.img_x || item.img_y || "").trim();
  return {
    id: host.dramaId(item.id),
    source: host.source,
    sourceId: item.id,
    title: title,
    name: title,
    desc: description,
    intro: description,
    cover: cover,
    coverUrl: cover,
    img: cover,
    totalEpisode: Number(item.episode_count || 0) || undefined,
    episodeCount: Number(item.episode_count || 0) || undefined,
    category: categoryName || String(item.category || ""),
    categoryName: categoryName || String(item.category || ""),
    views: String(item.hot_rate || ""),
    heat: String(item.hot_rate || ""),
    badge: String(item.corner || ""),
    remark: String(item.update_label || ""),
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : undefined,
  };
}

function listDramas(data, categoryName) {
  const items = [];
  if (data && Array.isArray(data.list)) {
    for (const item of data.list) {
      const drama = dramaFromItem(item, categoryName);
      if (drama !== null) {
        items.push(drama);
      }
    }
  }
  return items;
}

function fetchList(category, page, keywords) {
  const payload = { page: String(page), page_size: String(pageSize), order: "new:top" };
  if (category && category.cat) {
    payload.cat_id = category.cat;
  }
  if (keywords) {
    payload.keywords = keywords;
  }
  return apiCall("/drama/list", payload);
}

function detailOf(sourceId) {
  const data = apiCall("/drama/detail", { id: sourceId });
  if (!data || typeof data !== "object") {
    throw new Error("黄豆短剧没有返回剧集详情");
  }
  const title = String(data.name || "").trim();
  const description = String(data.description || "").trim();
  const cover = String(data.img_x || data.img_y || data.img || "").trim();
  const total = Number(data.episode_count || (Array.isArray(data.episodes) ? data.episodes.length : 0)) || 0;
  const drama = {
    id: host.dramaId(sourceId),
    source: host.source,
    sourceId: sourceId,
    title: title,
    name: title,
    desc: description,
    intro: description,
    cover: cover,
    coverUrl: cover,
    img: cover,
    totalEpisode: total,
    episodeCount: total,
    category: String(data.category || ""),
    categoryName: String(data.category || ""),
    views: String(data.click || ""),
    heat: String(data.click || ""),
    remark: String(data.update_label || ""),
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : undefined,
  };
  const chapters = [];
  const episodes = Array.isArray(data.episodes) ? data.episodes : [];
  for (let index = 0; index < episodes.length; index++) {
    const episode = episodes[index];
    const seq = Number(episode.seq || index + 1) || index + 1;
    const free = String(episode.type || "") === "free" || Number(episode.price || 0) === 0;
    chapters.push({
      id: host.chapterId(sourceId, String(seq)),
      source: host.source,
      title: String(episode.name || "") || "第" + seq + "集",
      currentEpisode: seq,
      videoUrl: "huangdou-episode://" + sourceId + "/" + seq,
      vip: !free,
    });
  }
  if (chapters.length === 0 && total > 0) {
    for (let seq = 1; seq <= total; seq++) {
      chapters.push({
        id: host.chapterId(sourceId, String(seq)),
        source: host.source,
        title: "第" + seq + "集",
        currentEpisode: seq,
        videoUrl: "huangdou-episode://" + sourceId + "/" + seq,
      });
    }
  }
  return { drama: drama, chapters: chapters };
}

function dramaSourceId(task) {
  const raw = String((task && task.dramaId) || "");
  const cut = raw.indexOf(":");
  const value = cut >= 0 ? raw.slice(cut + 1) : raw;
  return value.trim();
}

function chapterSequence(task, sourceId) {
  const chapter = (task && task.chapter) || {};
  const rawId = String(chapter.id || "");
  const parts = rawId.split(":");
  if (parts.length >= 3) {
    const value = Number(parts[2]);
    if (value >= 1) {
      return value;
    }
  }
  const current = Number(chapter.currentEpisode);
  if (current >= 1) {
    return current;
  }
  const index = Number(task && task.index);
  if (index >= 0) {
    return index + 1;
  }
  const match = String(chapter.videoUrl || "").match(/\/([0-9]+)$/);
  if (match) {
    return Number(match[1]);
  }
  throw new Error("黄豆短剧分集信息无效，请刷新详情");
}

module.exports = {
  validCategory(category) {
    const text = String(category || "").trim();
    if (text === "") {
      return true;
    }
    return categories.some((entry) => entry.id === text);
  },

  categories() {
    return categories.map((entry) => ({ id: entry.id, name: entry.name }));
  },

  catalogPage(page, category) {
    const number = Number(page);
    const current = number >= 1 ? Math.floor(number) : 1;
    const selected = categoryOf(category);
    ensureSession();
    const items = listDramas(fetchList(selected, current), selected ? selected.name : "");
    return { items: items, hasMore: items.length >= pageSize };
  },

  search(page, query) {
    const text = String(query || "").trim();
    if (text === "") {
      return { items: [], hasMore: false };
    }
    const number = Number(page);
    const current = number >= 1 ? Math.floor(number) : 1;
    ensureSession();
    const data = apiCall("/drama/list", {
      page: String(current),
      page_size: String(pageSize),
      keywords: text,
    });
    const items = listDramas(data, "");
    return { items: items, hasMore: items.length >= pageSize };
  },

  detail(sourceId) {
    const id = String(sourceId || "").trim();
    if (id === "") {
      throw new Error("黄豆短剧剧集 ID 为空");
    }
    ensureSession();
    return detailOf(id);
  },

  resolveMedia(task) {
    const sourceId = dramaSourceId(task);
    if (sourceId === "") {
      throw new Error("黄豆短剧播放信息无效，请刷新详情");
    }
    const seq = chapterSequence(task, sourceId);
    ensureSession();
    const data = apiCall("/drama/play", { id: sourceId, seq: String(seq) });
    if (!data || typeof data !== "object") {
      throw new Error("黄豆短剧该集暂无可播放地址");
    }
    if (data.is_preview === true) {
      throw new Error("该集需要解锁（" + (data.drama_id ? "站点会员/金币" : "付费") + "）后才能播放");
    }
    let address = String(data.m3u8 || "").trim();
    if (address === "" && Array.isArray(data.lines)) {
      for (const line of data.lines) {
        const url = String((line && line.url) || "").trim();
        if (url.indexOf(".m3u8") >= 0) {
          address = url;
          break;
        }
      }
    }
    if (address === "") {
      throw new Error("黄豆短剧该集暂无可播放地址");
    }
    const referer = resolveBase() + "/";
    return { url: address, referer: referer, durationMs: (Number(data.duration) || 0) * 1000 };
  },
};
