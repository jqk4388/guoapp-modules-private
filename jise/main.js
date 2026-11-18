const baseUrls = ["https://gg69.tv", "https://gscnes.com"];
const mediaBaseUrl = "https://img.gayimg.vip";
const channelName = "基色短剧";
const userAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const pageSize = 24;
const numericIdPattern = /^[0-9]{1,12}$/;
const typeNames = { "live-action": "真人剧", ai: "AI剧", adult: "成人剧" };

function truncate(text, limit) {
  const trimmed = String(text === undefined || text === null ? "" : text).trim();
  const characters = Array.from(trimmed);
  return characters.length <= limit ? trimmed : characters.slice(0, limit).join("") + "...";
}

function absoluteAddress(raw, base) {
  const text = String(raw === undefined || raw === null ? "" : raw).trim();
  if (text === "") {
    return "";
  }
  try {
    const resolved = host.resolveUrl(base, text);
    return /^https?:\/\//i.test(resolved) ? resolved : "";
  } catch (error) {
    return "";
  }
}

function coverAddress(drama) {
  const raw = String(drama.coverUrl || drama.carouselImageUrl || "").trim();
  if (raw === "") {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return absoluteAddress(raw, mediaBaseUrl + "/") || absoluteAddress(raw, baseUrls[0] + "/");
}

function readJson(name) {
  let raw = "";
  try {
    raw = host.loadState(name);
  } catch (error) {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function writeJson(name, value) {
  try {
    host.saveState(name, JSON.stringify(value));
  } catch (error) {
    host.log("基色短剧写入状态失败：" + error.message);
  }
}

function session() {
  return readJson("session") || {};
}

function tokenSeconds(value) {
  const number = parseInt(value, 10);
  return number > 0 ? number : 0;
}

function validToken(value) {
  const token = String(value || "");
  return /^[A-Za-z0-9._-]{20,4096}$/.test(token);
}

function rememberSession(data, guest) {
  if (!data || typeof data !== "object" || !validToken(data.accessToken)) {
    return "";
  }
  const previous = session();
  const now = Math.floor(Date.now() / 1000);
  const next = {
    accessToken: String(data.accessToken),
    accessTokenExpires: tokenSeconds(data.accessTokenExpires) || now + 3000,
    refreshToken: validToken(data.refreshToken) ? String(data.refreshToken) : String(previous.refreshToken || ""),
    refreshTokenExpires: tokenSeconds(data.refreshTokenExpires) || tokenSeconds(previous.refreshTokenExpires),
    account: String(data.account || previous.account || ""),
    password: String(data.password || previous.password || ""),
    guest: guest === undefined ? previous.guest === true : guest === true,
    registeredAt: previous.registeredAt || now,
  };
  writeJson("session", next);
  return next.accessToken;
}

function siteMessage(error) {
  const body = error && typeof error.body === "string" ? error.body.trim() : "";
  if (body === "" || body[0] !== "{") {
    return "";
  }
  try {
    const parsed = JSON.parse(body);
    const message = String((parsed && parsed.message) || "").trim();
    return message;
  } catch (failure) {
    return "";
  }
}

function rawRequest(path, options) {
  const request = {
    url: baseUrls[0] + "/api" + path,
    method: (options && options.method) || "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": userAgent, Referer: baseUrls[0] + "/" },
    timeoutMs: 20000,
    limit: 4 << 20,
  };
  const token = options && options.token;
  if (token) {
    request.headers.Authorization = "Bearer " + token;
  }
  if (options && options.body !== undefined) {
    request.body = JSON.stringify(options.body);
  }
  let response = null;
  let failure = null;
  for (const base of baseUrls) {
    try {
      response = host.fetch(Object.assign({}, request, { url: base + "/api" + path, headers: Object.assign({}, request.headers, { Referer: base + "/" }) }));
    } catch (error) {
      failure = error;
      const message = siteMessage(error);
      if (message !== "") {
        throw new Error(message);
      }
      if (error && error.status && error.status < 500) {
        throw error;
      }
      continue;
    }
    break;
  }
  if (response === null) {
    throw failure || new Error("基色短剧请求失败");
  }
  let parsed = null;
  try {
    parsed = JSON.parse(response.body);
  } catch (error) {
    throw new Error("基色短剧接口返回内容无法解析");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("基色短剧接口返回异常");
  }
  if (parsed.code !== 0) {
    const message = String(parsed.message || "").trim();
    const failure = new Error(message !== "" ? message : "基色短剧接口返回异常");
    failure.code = parsed.code;
    failure.status = response.status;
    throw failure;
  }
  return parsed.data;
}

function refreshToken() {
  const current = session();
  if (!validToken(current.refreshToken)) {
    return "";
  }
  let data = null;
  try {
    data = rawRequest("/refreshToken", { method: "POST", body: { refreshToken: current.refreshToken } });
  } catch (error) {
    host.log("基色短剧刷新登录状态失败：" + error.message);
    return "";
  }
  return rememberSession(data);
}

function accessToken() {
  const current = session();
  if (!validToken(current.accessToken)) {
    return "";
  }
  const expires = tokenSeconds(current.accessTokenExpires);
  const now = Math.floor(Date.now() / 1000);
  if (expires > 0 && expires - now < 120) {
    return refreshToken();
  }
  return String(current.accessToken);
}

function registerAccount() {
  let data = null;
  try {
    data = rawRequest("/member/auto/register", { method: "POST", body: { shareCode: "" } });
  } catch (error) {
    host.log("基色短剧自动注册失败：" + error.message);
    return "";
  }
  const token = rememberSession(data, true);
  if (token !== "") {
    host.log("基色短剧已自动注册账号 " + String(data.account || ""));
  }
  return token;
}

function loginAccount(account, password) {
  const data = rawRequest("/member/account/login", { method: "POST", body: { userName: account, password } });
  const token = rememberSession(data, false);
  if (token === "") {
    throw new Error("基色短剧登录失败：站点没有返回登录状态");
  }
  writeJson("checkin", { date: "", attemptedAt: 0 });
  return accountStatus();
}

function logoutAccount() {
  const current = session();
  const token = validToken(current.accessToken) ? current.accessToken : "";
  if (token !== "" && validToken(current.refreshToken)) {
    try {
      rawRequest("/member/logout", { method: "POST", token, body: { refreshToken: current.refreshToken } });
    } catch (error) {
      host.log("基色短剧退出登录失败：" + error.message);
    }
  }
  writeJson("session", {});
  writeJson("checkin", { date: "", attemptedAt: 0 });
  return accountStatus();
}

function accountStatus() {
  const current = session();
  const status = {
    loggedIn: false,
    guest: current.guest === true,
    account: String(current.account || ""),
    name: "",
    points: 0,
  };
  const token = accessToken();
  if (token === "") {
    return status;
  }
  try {
    const me = rawRequest("/member/me", { token });
    status.loggedIn = true;
    status.name = String(me.nickName || me.userName || status.account);
    status.account = String(me.userName || status.account);
    status.points = parseInt(me.pointsBalance, 10) || 0;
  } catch (error) {
    status.message = error.message;
  }
  return status;
}

function ensureToken() {
  const token = accessToken();
  if (token !== "") {
    return token;
  }
  const current = session();
  if (String(current.account || "") !== "" || validToken(current.accessToken) || validToken(current.refreshToken)) {
    return "";
  }
  return registerAccount();
}

function loginRequired() {
  return new Error("基色短剧登录状态已失效，请在 我的 › 模块 › 基色短剧 里重新登录账号");
}

function todayKey() {
  return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
}

function checkInState() {
  return readJson("checkin") || {};
}

function checkIn() {
  const state = checkInState();
  const now = Date.now();
  const attempted = parseInt(state.attemptedAt, 10);
  if (state.date === todayKey()) {
    return;
  }
  if (attempted > 0 && now - attempted < 600000) {
    return;
  }
  host.exclusive(function () {
    const latest = checkInState();
    if (latest.date === todayKey()) {
      return;
    }
    const next = { date: latest.date || "", attemptedAt: now };
    const token = ensureToken();
    if (token === "") {
      host.log("基色短剧没有可用的登录状态，跳过签到");
      next.attemptedAt = now;
      writeJson("checkin", next);
      return;
    }
    let result = null;
    try {
      result = rawRequest("/member/daily-check-in", { token });
    } catch (error) {
      host.log("基色短剧读取签到状态失败：" + error.message);
      writeJson("checkin", next);
      return;
    }
    if (result && result.signedInToday) {
      next.date = todayKey();
      writeJson("checkin", next);
      return;
    }
    try {
      const signed = rawRequest("/member/daily-check-in", { method: "POST", token });
      next.date = todayKey();
      writeJson("checkin", next);
      if (signed && parseInt(signed.grantedPoints, 10) > 0) {
        host.log("基色短剧签到成功，获得 " + signed.grantedPoints + " 金币，余额 " + signed.pointsBalance);
      }
      return;
    } catch (error) {
      host.log("基色短剧签到失败：" + error.message);
      writeJson("checkin", next);
      return;
    }
  });
}

function apiData(path) {
  const cacheKey = "api:" + path;
  const cached = host.cacheGet(cacheKey);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  const token = accessToken();
  const data = rawRequest(path, { token });
  host.cacheSet(cacheKey, data, 180000);
  return data;
}

function listOf(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== "object") {
    return [];
  }
  for (const key of ["items", "list", "records", "rows", "data"]) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }
  return [];
}

function dramaList(query) {
  return listOf(apiData("/dramas" + (query ? "?" + query : "")));
}

function dramaTags() {
  const tags = [];
  const entries = listOf(apiData("/dramas/tags"));
  for (const entry of entries) {
    const id = parseInt(entry && entry.id, 10);
    const name = truncate(entry && entry.name, 24);
    if (id > 0 && name !== "") {
      tags.push({ id, name });
    }
  }
  return tags;
}

function categoryTags() {
  try {
    return dramaTags();
  } catch (error) {
    host.log("基色短剧读取分类标签失败：" + (error && error.message ? error.message : error));
    return [];
  }
}

function sortValue(drama, field) {
  const raw = drama[field];
  if (typeof raw === "number") {
    return raw;
  }
  const time = Date.parse(String(raw || ""));
  return isNaN(time) ? 0 : time;
}

function sortedDramas(list, category) {
  const sorted = list.slice();
  if (category === "rank-total") {
    sorted.sort((left, right) => sortValue(right, "viewCount") - sortValue(left, "viewCount"));
  } else if (category === "rank-month") {
    sorted.sort((left, right) => sortValue(right, "monthViewCount") - sortValue(left, "monthViewCount"));
  } else if (category === "rank-week") {
    sorted.sort((left, right) => sortValue(right, "weekViewCount") - sortValue(left, "weekViewCount"));
  } else {
    sorted.sort((left, right) => sortValue(right, "updatedAt") - sortValue(left, "updatedAt"));
  }
  return sorted;
}

function categoryQuery(category) {
  if (category === "" || category === "live-action" || category === "ai") {
    return category === "" ? "" : "dramaType=" + encodeURIComponent(category);
  }
  const tag = /^tag:([0-9]{1,12})$/.exec(category);
  if (tag) {
    return "tagId=" + tag[1];
  }
  if (category === "rank-total" || category === "rank-month" || category === "rank-week") {
    return "";
  }
  return null;
}

function typeNameOf(drama) {
  return typeNames[String(drama.dramaType || "")] || "短剧";
}

function tagsOf(drama) {
  const tags = [];
  if (Array.isArray(drama.tags)) {
    for (const entry of drama.tags) {
      const name = truncate(typeof entry === "string" ? entry : entry && entry.name, 24);
      if (name !== "" && tags.indexOf(name) < 0) {
        tags.push(name);
      }
    }
  }
  return tags;
}

function dramaOf(item) {
  const sourceId = String(item.id);
  const title = truncate(item.title || item.shareTitle || "", 512);
  const cover = coverAddress(item);
  const tags = tagsOf(item);
  const total = parseInt(item.totalEpisodes, 10);
  const drama = {
    id: host.dramaId(sourceId),
    source: host.source,
    sourceId,
    title,
    name: title,
    cover,
    coverUrl: cover,
    channelName,
    categoryName: typeNameOf(item),
    remark: total > 0 ? "共 " + total + " 集" : "",
    badge: item.isHot ? "热门" : "",
    sourceUrl: origin() + "/watch/" + sourceId,
  };
  if (tags.length > 0) {
    drama.tags = tags;
  }
  if (total > 0) {
    drama.totalEpisode = total;
    drama.episodeCount = total;
  }
  const views = parseInt(item.viewCount, 10);
  if (views > 0) {
    drama.views = String(views);
  }
  const online = String(item.createdAt || "").slice(0, 10);
  if (online !== "") {
    drama.onlineDate = online;
  }
  return drama;
}

function pageOf(list, page) {
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize).map(dramaOf);
  return { items, hasMore: items.length >= pageSize };
}

function coverPath(raw) {
  const text = String(raw === undefined || raw === null ? "" : raw).trim();
  if (text === "") {
    return "";
  }
  if (/^https?:\/\//i.test(text)) {
    return text;
  }
  return absoluteAddress(text, mediaBaseUrl + "/") || absoluteAddress(text, baseUrls[0] + "/");
}

function episodeCoverOf(episodes) {
  for (const episode of episodes || []) {
    const address = coverPath(episode && episode.coverUrl);
    if (address !== "") {
      return address;
    }
  }
  return "";
}

function coverOf(data) {
  return coverPath(data && (data.coverUrl || data.carouselImageUrl)) || episodeCoverOf(episodesOf(data));
}

function introFallback(drama, count) {
  const parts = [];
  if (drama.categoryName) {
    parts.push(drama.categoryName);
  }
  if (count > 0) {
    parts.push("共 " + count + " 集");
  }
  if (drama.views) {
    parts.push("播放 " + drama.views);
  }
  if (drama.onlineDate) {
    parts.push(drama.onlineDate + " 上线");
  }
  return parts.join(" · ");
}

function fillCovers(items, limit) {
  let filled = 0;
  for (const item of items) {
    if (filled >= limit) {
      break;
    }
    if (item.cover !== "") {
      continue;
    }
    filled += 1;
    let data = null;
    try {
      data = apiData("/dramas/" + item.sourceId);
    } catch (error) {
      continue;
    }
    const address = coverOf(data);
    if (address !== "") {
      item.cover = address;
      item.coverUrl = address;
    }
  }
}

function episodesOf(data) {
  return data && Array.isArray(data.episodes) ? data.episodes : [];
}

function chapterOf(episode, sourceId, index) {
  const episodeId = parseInt(episode && episode.id, 10);
  const number = parseInt(episode && episode.episodeNo, 10);
  if (!(episodeId > 0)) {
    return null;
  }
  const locked = String(episode.videoUrl || "").trim() === "" || episode.isUnlocked === false;
  const chapter = {
    id: host.chapterId(sourceId, String(episodeId)),
    source: host.source,
    title: truncate(episode.title || "第" + (number > 0 ? number : index + 1) + "集", 128),
    currentEpisode: number > 0 ? number : index + 1,
    videoUrl: "jise-episode://" + sourceId + "/" + episodeId,
    pageUrl: origin() + "/watch/" + sourceId,
    referer: origin() + "/",
  };
  if (locked) {
    chapter.vip = true;
  }
  return chapter;
}

function origin() {
  return baseUrls[0];
}

function detailOf(sourceId) {
  if (!numericIdPattern.test(sourceId)) {
    throw new Error("基色短剧剧集 ID 无效");
  }
  let data = null;
  try {
    data = apiData("/dramas/" + sourceId);
  } catch (error) {
    host.log("基色短剧读取剧集 " + sourceId + " 失败：" + (error && error.message ? error.message : error));
    throw error;
  }
  if (!data || typeof data !== "object" || String(data.id) !== sourceId) {
    throw new Error("基色短剧没有返回这部剧的信息");
  }
  const drama = dramaOf(data);
  if (drama.cover === "") {
    drama.cover = coverOf(data);
    drama.coverUrl = drama.cover;
  }
  const description = truncate(data.intro || data.shareDesc || "", 12000);
  drama.desc = description !== "" ? description : introFallback(drama, episodesOf(data).length);
  drama.intro = drama.desc;
  const chapters = [];
  for (const episode of episodesOf(data)) {
    const chapter = chapterOf(episode, sourceId, chapters.length);
    if (chapter !== null) {
      chapters.push(chapter);
    }
  }
  host.log("基色短剧剧集 " + sourceId + " 分集 " + episodesOf(data).length + " 条，可用 " + chapters.length + " 条");
  drama.totalEpisode = chapters.length;
  drama.episodeCount = Math.max(chapters.length, parseInt(data.totalEpisodes, 10) || 0);
  drama.remark = chapters.length > 0 ? "共 " + chapters.length + " 集" : "暂无可播放分集";
  return { drama, chapters };
}

function dramaSourceId(task) {
  const prefix = host.source + ":";
  if (!task.dramaId || task.dramaId.indexOf(prefix) !== 0) {
    return "";
  }
  const sourceId = String(task.dramaId).slice(prefix.length).trim();
  return numericIdPattern.test(sourceId) ? sourceId : "";
}

function chapterEpisodeId(task, sourceId) {
  const chapter = task.chapter || {};
  const prefix = host.chapterId(sourceId, "");
  if (typeof chapter.id === "string" && chapter.id.indexOf(prefix) === 0) {
    const value = chapter.id.slice(prefix.length).trim();
    if (/^[0-9]{1,12}$/.test(value)) {
      return value;
    }
  }
  return "";
}

function findEpisode(data, episodeId) {
  for (const episode of episodesOf(data)) {
    if (String(episode && episode.id) === episodeId) {
      return episode;
    }
  }
  return null;
}

function mediaAddress(episode) {
  if (!episode || String(episode.videoUrl || "").trim() === "" || episode.isUnlocked === false) {
    return "";
  }
  return absoluteAddress(episode.videoUrl, origin() + "/");
}

function unlockReason(detail, episodeId) {
  const episode = findEpisode(detail, episodeId);
  const number = episode && episode.episodeNo ? episode.episodeNo : "";
  const pending = pendingCost(detail, episodeId);
  const balance = balanceOf();
  const cost = pending.cost > 0 ? pending.cost + " 金币" : "金币";
  const span = pending.count > 1 ? "从第 " + pending.first + " 集到第 " + number + " 集共 " + pending.count + " 集" : "第 " + number + " 集";
  return "基色短剧" + span + "需解锁（" + cost + "），当前余额 " + balance + " 金币；签到每天可领金币，也可以到站点充值";
}

function pendingCost(detail, episodeId) {
  const episodes = episodesOf(detail);
  let cost = 0;
  let count = 0;
  let first = 0;
  for (const episode of episodes) {
    const locked = String(episode.videoUrl || "").trim() === "" || episode.isUnlocked === false;
    if (locked) {
      cost += parseInt(episode.unlockPoints, 10) || 0;
      count += 1;
      if (first === 0) {
        first = parseInt(episode.episodeNo, 10) || 0;
      }
    }
    if (String(episode && episode.id) === episodeId) {
      return { cost, count, first };
    }
  }
  return { cost: 0, count: 0, first: 0 };
}

function balanceOf() {
  const token = accessToken();
  if (token === "") {
    return 0;
  }
  try {
    const me = rawRequest("/member/me", { token });
    return parseInt(me && me.pointsBalance, 10) || 0;
  } catch (error) {
    return 0;
  }
}

function unlockEpisode(sourceId, episodeId) {
  if (ensureToken() === "") {
    throw loginRequired();
  }
  let detail = rawRequest("/dramas/" + sourceId, { token: accessToken() });
  let address = mediaAddress(findEpisode(detail, episodeId));
  if (address !== "") {
    return address;
  }
  const needed = pendingCost(detail, episodeId);
  if (needed.cost > 0 && balanceOf() < needed.cost) {
    throw new Error(unlockReason(detail, episodeId));
  }
  let last = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const token = accessToken();
    if (token === "") {
      break;
    }
    let result = null;
    try {
      result = rawRequest("/member/dramas/" + sourceId + "/unlock", { method: "POST", token });
    } catch (error) {
      last = error;
      break;
    }
    if (result && result.drama) {
      detail = result.drama;
      address = mediaAddress(findEpisode(detail, episodeId));
      if (address !== "") {
        host.cacheSet("api:/dramas/" + sourceId, null, 0);
        return address;
      }
    }
    if (!result || result.alreadyUnlocked === true) {
      last = null;
      break;
    }
  }
  if (last !== null) {
    const message = String(last.message || "");
    if (/insufficient|points|积分|金币/i.test(message)) {
      throw new Error(unlockReason(detail, episodeId));
    }
    throw new Error("基色短剧解锁失败：" + message);
  }
  throw new Error(unlockReason(detail, episodeId));
}

  module.exports = {
  categories() {
    const categories = [
      { id: "", name: "最新更新" },
      { id: "live-action", name: "真人剧" },
      { id: "ai", name: "AI剧" },
      { id: "rank-total", name: "总排行" },
      { id: "rank-month", name: "月排行" },
      { id: "rank-week", name: "周排行" },
    ];
    for (const entry of categoryTags()) {
      categories.push({ id: "tag:" + entry.id, name: entry.name });
    }
    return categories;
  },

  validCategory(category) {
    return categoryQuery(category) !== null;
  },

  catalogPage(page, category) {
    if (!(page >= 1) || page > 1000) {
      return { items: [], hasMore: false };
    }
    const query = categoryQuery(category);
    if (query === null) {
      throw new Error("基色短剧没有分类 " + category);
    }
    const list = sortedDramas(dramaList(query), category);
    const result = pageOf(list, page);
    fillCovers(result.items, 4);
    return result;
  },

  search(page, query) {
    const keyword = String(query || "").trim();
    if (!(page >= 1) || page > 1000 || keyword === "") {
      return { items: [], hasMore: false };
    }
    const list = dramaList("search=" + encodeURIComponent(keyword));
    const matched = list.filter((item) => {
      const title = String(item.title || "");
      if (title.indexOf(keyword) >= 0) {
        return true;
      }
      return tagsOf(item).some((name) => name.indexOf(keyword) >= 0);
    });
    const result = pageOf(sortedDramas(matched.length > 0 ? matched : list, ""), page);
    fillCovers(result.items, 4);
    return result;
  },

  detail(sourceId) {
    return detailOf(sourceId);
  },

  account(command, payload) {
    const name = String(command || "").trim();
    const input = payload && typeof payload === "object" ? payload : {};
    if (name === "status") {
      return accountStatus();
    }
    if (name === "login") {
      const account = String(input.account || input.userName || input.username || "").trim();
      const password = String(input.password || "");
      if (account === "" || password === "") {
        throw new Error("请输入基色短剧的账号和密码");
      }
      return loginAccount(account, password);
    }
    if (name === "logout") {
      return logoutAccount();
    }
    if (name === "register") {
      if (registerAccount() === "") {
        throw new Error("基色短剧自动注册失败，请稍后再试");
      }
      writeJson("checkin", { date: "", attemptedAt: 0 });
      return accountStatus();
    }
    throw new Error("基色短剧不支持的账号操作 " + name);
  },

  resolveMedia(task) {
    checkIn();
    const sourceId = dramaSourceId(task);
    if (sourceId === "") {
      throw new Error("基色短剧播放分集信息无效，请刷新详情");
    }
    const episodeId = chapterEpisodeId(task, sourceId);
    if (episodeId === "") {
      throw new Error("基色短剧播放分集信息无效，请刷新详情");
    }
    const address = unlockEpisode(sourceId, episodeId);
    if (address === "") {
      throw new Error("基色短剧该集播放地址无效");
    }
    return host.prepareWebMedia({ url: address, referer: origin() + "/" }, channelName);
  },
};
