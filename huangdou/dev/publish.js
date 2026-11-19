const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const publishPages = ["https://z9d4qb8eu.cc/", "https://www.z9d4qb8eu.cc/"];
const seedBases = ["https://wlzetqez.cc", "https://www.wlzetqez.cc"];
const proxy = process.env.HUANGDOU_PROXY || "";
const userAgent =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

function request(url, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "huangdou-publish-"));
  const head = path.join(dir, "head.txt");
  const out = path.join(dir, "body.bin");
  const args = [
    "-sS",
    "--max-time",
    "20",
    "-A",
    userAgent,
    "-D",
    head,
    "-o",
    out,
    "-w",
    "%{http_code} %{content_type} %{size_download}",
  ];
  if (proxy) {
    args.push("-x", proxy);
  }
  args.push(...extra, url);
  let summary = "0 0";
  try {
    summary = execFileSync("curl.exe", args, { encoding: "utf8" }).trim();
  } catch (error) {
    summary = "err " + String(error.message || "").split("\n")[0];
  }
  const body = fs.existsSync(out) ? fs.readFileSync(out) : Buffer.alloc(0);
  fs.rmSync(dir, { recursive: true, force: true });
  return { summary, body };
}

function titleOf(body) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body.toString("utf8"));
  return match ? match[1].replace(/\s+/g, " ").trim().slice(0, 60) : "";
}

function candidatesOf(body) {
  const found = [];
  const add = (raw) => {
    const text = String(raw || "").toLowerCase().split(":")[0];
    if (!/^[a-z0-9][a-z0-9.-]{2,79}$/.test(text)) return;
    const labels = text.split(".");
    if (labels.length < 2 || !/^[a-z]{2,12}$/.test(labels[labels.length - 1])) return;
    if (found.indexOf(text) < 0) found.push(text);
  };
  const text = body.toString("utf8");
  const anchors = /href\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = anchors.exec(text)) !== null) {
    const host = /^https?:\/\/([a-z0-9][a-z0-9.-]*)/i.exec(match[1].trim());
    if (host) add(host[1]);
  }
  const absolute = /https?:\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,12})(?=[/"'\s:?#<),]|$)/gi;
  while ((match = absolute.exec(text)) !== null) add(match[1]);
  const bare = /\b((?:[a-z0-9][a-z0-9-]{0,62}\.)+[a-z]{2,12})\b/gi;
  while ((match = bare.exec(text)) !== null) add(match[1]);
  return found;
}

function ping(base) {
  const result = request(base + "/api/ping", [
    "-X",
    "POST",
    "-H",
    "content-type: application/x-www-form-urlencoded",
    "--data-binary",
    "ping=1",
  ]);
  const first = result.body.length > 0 ? result.body[0].toString(16) : "none";
  return { summary: result.summary, bytes: result.body.length, first };
}

function main() {
  console.log("代理：" + (proxy || "直连"));
  const hosts = [];
  for (const page of publishPages) {
    const result = request(page);
    console.log("\n发布页 " + page);
    console.log("  状态/类型/字节：" + result.summary);
    console.log("  标题：" + (titleOf(result.body) || "(没有 title)"));
    const found = candidatesOf(result.body);
    console.log("  域名候选：" + (found.join(", ") || "(无)"));
    for (const host of found) {
      if (hosts.indexOf(host) < 0) hosts.push(host);
    }
  }
  console.log("\n/api/ping 探测");
  for (const host of hosts.slice(0, 12)) {
    const result = ping("https://" + host);
    console.log("  " + host + " -> " + result.summary + " bytes=" + result.bytes + " first=" + result.first);
  }
  console.log("\n种子域名");
  for (const base of seedBases) {
    const result = ping(base);
    console.log("  " + base + " -> " + result.summary + " bytes=" + result.bytes + " first=" + result.first);
  }
}

main();
