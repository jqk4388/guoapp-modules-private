const zlib = require("zlib");
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
  return inflateRaw(bytes.subarray(position, bytes.length - 8));
}


module.exports = { gzipUnpack, inflateRaw, gzipPack, crc32, huffmanTable };

