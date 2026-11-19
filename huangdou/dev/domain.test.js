const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source =
  fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8") +
  "\n;globalThis.__test = { resolveBase, publishedBases, probeBase, usableBase, normalizedBase };";

function build(pages, live) {
  const state = { mem: {}, preferred: "" };
  const host = {
    source: "huangdou",
    dramaId: (id) => "huangdou:" + id,
    chapterId: (id, key) => "huangdou:" + id + ":" + key,
    preferredSite: () => state.preferred,
    log: () => {},
    loadState: (name) => state.mem[name] || "",
    saveState: (name, value) => {
      state.mem[name] = value;
    },
    utf8Encode: (text) => new Uint8Array(Buffer.from(String(text), "utf8")),
    utf8Decode: (bytes) => Buffer.from(bytes).toString("utf8"),
    hexEncode: (bytes) => Buffer.from(bytes).toString("hex"),
    hexDecode: (text) => new Uint8Array(Buffer.from(String(text), "hex")),
    base64Encode: (bytes) => Buffer.from(bytes).toString("base64"),
    parseHtml: (text) => {
      const anchors = [];
      const pattern = /<a\b[^>]*href=["']([^"']*)["'][^>]*>/gi;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        anchors.push({ tag: "a", attrs: { href: match[1] }, children: [] });
      }
      return { tag: "body", children: anchors };
    },
    fetchText: ({ url }) => {
      for (const page of pages) {
        if (url.indexOf(page.prefix) === 0) {
          return { status: 200, url: page.landed || url, body: page.body };
        }
      }
      const error = new Error("unreachable " + url);
      error.status = 0;
      throw error;
    },
    fetch: ({ url }) => {
      for (const base of live) {
        if (url === base + "/api/ping") {
          return { status: 200, body: new Uint8Array([0x7b, 0x22, 0x7d]) };
        }
      }
      const error = new Error("not found " + url);
      error.status = 404;
      throw error;
    },
  };
  const sandbox = {
    host,
    module: { exports: {} },
    console,
    Date,
    Math,
    JSON,
    Uint8Array,
    Error,
    Number,
    String,
    Array,
    Object,
    RegExp,
    parseInt,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "main.js" });
  return { api: sandbox.__test, state, module: sandbox.module.exports };
}

const checks = [];
function expect(name, actual, wanted) {
  checks.push({ name, ok: actual === wanted, actual, wanted });
}

{
  const publish = `<html><body><a href="https://abc123.cc/">本站最新网址</a>
    <a href="https://old999.cc">备用网址</a><p>d324ftvr28cuao.cloudfront.net</p></body></html>`;
  const app = build([{ prefix: "https://z9d4qb8eu.cc", body: publish }], ["https://abc123.cc"]);
  expect("发布页取到在线域名", app.api.resolveBase(false), "https://abc123.cc");
  const cached = JSON.parse(app.state.mem.site);
  expect("记住域名", cached.base, "https://abc123.cc");
  expect("候选里排除无关域", app.api.publishedBases().indexOf("https://cdn.jsdelivr.net"), -1);
  expect("缓存命中不重新探测", app.api.resolveBase(false), "https://abc123.cc");
}

{
  const publish = `<html><body><a href="https://dead111.cc/">旧网址</a><a href="https://live222.cc/">新网址</a></body></html>`;
  const app = build([{ prefix: "https://z9d4qb8eu.cc", body: publish }], ["https://live222.cc"]);
  expect("跳过失效域名", app.api.resolveBase(false), "https://live222.cc");
}

{
  const app = build([], []);
  expect("全部失效回退种子", app.api.resolveBase(false), "https://wlzetqez.cc");
}

{
  const app = build(
    [{ prefix: "https://z9d4qb8eu.cc", body: "<html></html>", landed: "https://jump777.cc/" }],
    ["https://jump777.cc"],
  );
  expect("发布页跳转后的域名", app.api.resolveBase(false), "https://jump777.cc");
}

{
  const app = build([{ prefix: "https://z9d4qb8eu.cc", body: "<html><body>nothing</body></html>" }], []);
  app.state.preferred = "https://wlzetqez.cc/";
  expect("应用里手填的地址优先", app.api.resolveBase(false), "https://wlzetqez.cc");
}

{
  const app = build([{ prefix: "https://z9d4qb8eu.cc", body: "<html></html>" }], []);
  expect("无发布页时用缓存", app.api.resolveBase(false), "https://wlzetqez.cc");
}

let failed = 0;
for (const check of checks) {
  if (!check.ok) {
    failed++;
    console.error("失败 " + check.name + "：得到 " + JSON.stringify(check.actual) + "，期望 " + JSON.stringify(check.wanted));
  } else {
    console.log("通过 " + check.name);
  }
}
process.exitCode = failed === 0 ? 0 : 1;
