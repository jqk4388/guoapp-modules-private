const zlib = require("zlib");
const path = require("path");
const lib = require(path.join(__dirname, "inflate.js"));

const samples = [
  "hello world",
  JSON.stringify({ status: "y", data: { list: [] } }),
  JSON.stringify({
    a: "x".repeat(500),
    list: Array.from({ length: 50 }, (_, i) => ({ i, name: "剧" + i })),
  }),
];

for (const text of samples) {
  const gz = zlib.gzipSync(Buffer.from(text, "utf8"));
  try {
    const out = lib.gzipUnpack(new Uint8Array(gz));
    const decoded = Buffer.from(out).toString("utf8");
    console.log("gzip", decoded === text ? "OK" : "MISMATCH", gz.length + "->" + out.length);
  } catch (error) {
    console.log("gzip FAIL", gz.length, error.message);
  }
}

for (const level of [0, 1, 6, 9]) {
  const raw = Buffer.from(JSON.stringify({ level, text: "黄豆短剧 inflate 测试 " + level }));
  const gz = zlib.gzipSync(raw, { level });
  try {
    const out = lib.gzipUnpack(new Uint8Array(gz));
    console.log("level", level, Buffer.from(out).equals(raw) ? "OK" : "MISMATCH");
  } catch (error) {
    console.log("level", level, "FAIL", error.message);
  }
}

const packed = lib.gzipPack(new Uint8Array(Buffer.from("stored block test")));
try {
  console.log("stored roundtrip", zlib.gunzipSync(Buffer.from(packed)).toString());
} catch (error) {
  console.log("stored FAIL", error.message);
}
