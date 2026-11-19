const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const zlib = require("zlib");

const source = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");

function toBuf(value) { return typeof value === 'string' ? Buffer.from(value, 'latin1') : Buffer.from(value); }

const state = {
  mem: {},
  site: (process.env.HUANGDOU_BASE || "https://wlzetqez.cc").replace(/\/+$/, ""),
};

const host = {
  source: "huangdou",
  dramaId: (id) => "huangdou:" + id,
  chapterId: (id, key) => "huangdou:" + id + ":" + key,
  preferredSite: () => state.site,
  log: (message) => console.log("[log]", message),
  loadState: (name) => state.mem[name] || "",
  saveState: (name, value) => {
    state.mem[name] = value;
  },
  utf8Encode: (text) => new Uint8Array(Buffer.from(String(text), "utf8")),
  utf8Decode: (bytes) => toBuf(bytes).toString("utf8"),
  hexEncode: (bytes) => toBuf(bytes).toString("hex"),
  hexDecode: (text) => new Uint8Array(Buffer.from(String(text), "hex")),
  base64Encode: (bytes) => toBuf(bytes).toString("base64"),
  base64Decode: (text) => new Uint8Array(Buffer.from(String(text), "base64")),
  md5: (bytes) => new Uint8Array(crypto.createHash("md5").update(toBuf(bytes)).digest()),
  sha256: (bytes) => new Uint8Array(crypto.createHash("sha256").update(toBuf(bytes)).digest()),
  randomBytes: (size) => new Uint8Array(crypto.randomBytes(size)),
  aesCbcEncrypt: (key, iv, data) => {
    const cipher = crypto.createCipheriv("aes-" + key.length * 8 + "-cbc", Buffer.from(key), Buffer.from(iv));
    cipher.setAutoPadding(false);
    return new Uint8Array(Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]));
  },
  aesCbcDecrypt: (key, iv, data) => {
    const decipher = crypto.createDecipheriv("aes-" + key.length * 8 + "-cbc", Buffer.from(key), Buffer.from(iv));
    decipher.setAutoPadding(false);
    return new Uint8Array(Buffer.concat([decipher.update(Buffer.from(data)), decipher.final()]));
  },
  fetch: (request) => {
    const body = request.bodyBase64 ? Buffer.from(request.bodyBase64, "base64") : Buffer.from(request.body || "");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "huangdou-"));
    const bodyFile = path.join(dir, "body.bin");
    const outFile = path.join(dir, "out.bin");
    fs.writeFileSync(bodyFile, body);
    const args = ["-sS", "--max-time", "25", "-o", outFile, "-w", "%{http_code}", "-X", request.method || "GET", "--data-binary", "@" + bodyFile];
    for (const name of Object.keys(request.headers || {})) {
      args.push("-H", name + ": " + request.headers[name]);
    }
    args.push(request.url);
    let status = "0";
    try {
      status = execFileSync("curl.exe", args, { encoding: "utf8" }).trim();
    } catch (error) {
      status = "0";
    }
    const bytes = fs.existsSync(outFile) ? fs.readFileSync(outFile) : Buffer.alloc(0);
    fs.rmSync(dir, { recursive: true, force: true });
    if (process.env.HUANGDOU_DEBUG) {
      console.log("[fetch]", request.url, "status=" + status, "len=" + bytes.length, "head=" + bytes.slice(0, 32).toString("hex"));
    }
    return { status: Number(status), body: latin1(bytes), headers: {} };
  },
};

function latin1(bytes) {
  return Buffer.from(bytes).toString("latin1");
}

const sandbox = {
  host,
  module: { exports: {} },
  console,
  Date,
  Math,
  JSON,
  Uint8Array,
  Int32Array,
  Error,
  Promise,
  Number,
  String,
  Array,
  Object,
  RegExp,
  isNaN,
  parseInt,
};
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "main.js" });
const mod = sandbox.module.exports;

async function main() {
  const report = {};
  report.categories = mod.categories();

  const page1 = mod.catalogPage(1, "yuandou");
  report.page1 = { n: page1.items.length, hasMore: page1.hasMore, head: page1.items.slice(0, 3).map((d) => d.title + " / " + d.sourceId) };

  const page2 = mod.catalogPage(2, "caibian");
  report.page2 = { n: page2.items.length, head: page2.items.slice(0, 2).map((d) => d.title) };

  const search = mod.search(1, "催眠");
  report.search = { n: search.items.length, head: search.items.slice(0, 3).map((d) => d.title) };

  const first = page1.items[0];
  const detail = mod.detail(first.sourceId);
  report.detail = {
    title: detail.drama.title,
    cover: detail.drama.cover,
    total: detail.drama.totalEpisode,
    chapters: detail.chapters.length,
    first: detail.chapters[0],
    vipCount: detail.chapters.filter((c) => c.vip).length,
  };

  const chapter = detail.chapters[0];
  const media = mod.resolveMedia({ dramaId: detail.drama.id, chapter, index: 0, total: detail.chapters.length });
  report.media = { url: String(media.url).slice(0, 120), referer: media.referer };

  const m3u8 = await fetch(media.url, { headers: { referer: media.referer } });
  const text = await m3u8.text();
  report.m3u8 = { status: m3u8.status, head: text.slice(0, 160), segments: (text.match(/seg_/g) || []).length };

  let paid = null;
  try {
    mod.resolveMedia({ dramaId: detail.drama.id, chapter: detail.chapters[1], index: 1, total: detail.chapters.length });
    paid = "played";
  } catch (error) {
    paid = "blocked: " + error.message;
  }
  report.paidChapter = paid;

  report.state = state.mem.site ? JSON.parse(state.mem.site) : null;
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("失败：", error && error.stack ? error.stack : error);
  process.exitCode = 1;
});

void zlib;

