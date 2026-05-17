// Lightweight QR Code generator (no dependencies).
// Based on the public-domain / permissive-reference implementation by Nayuki:
// https://www.nayuki.io/page/qr-code-generator-library (adapted to plain JS + SVG output).
// This file intentionally avoids external npm deps to keep builds offline-friendly.
//
// Supports: byte-mode text encoding, automatic version selection (1..40),
// error correction levels: L/M/Q/H, mask selection, and SVG rendering.
//
// NOTE: For very large payloads, QR codes become dense and harder to scan.

/* eslint-disable no-bitwise */

export const QrEcc = Object.freeze({
  LOW: { ordinal: 0, formatBits: 1 },
  MEDIUM: { ordinal: 1, formatBits: 0 },
  QUARTILE: { ordinal: 2, formatBits: 3 },
  HIGH: { ordinal: 3, formatBits: 2 },
});

class BitBuffer {
  constructor() {
    this.data = [];
    this.bitLength = 0;
  }

  get length() {
    return this.bitLength;
  }

  appendBits(val, len) {
    if (len < 0 || len > 31) throw new RangeError('len');
    for (let i = len - 1; i >= 0; i -= 1) this.appendBit(((val >>> i) & 1) !== 0);
  }

  appendBit(bit) {
    const i = this.bitLength >>> 3;
    if (this.data.length <= i) this.data.push(0);
    if (bit) this.data[i] |= 0x80 >>> (this.bitLength & 7);
    this.bitLength += 1;
  }

  getBit(i) {
    return ((this.data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
  }
}

const getNumRawDataModules = (ver) => {
  if (ver < 1 || ver > 40) throw new RangeError('version');
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
};

const getNumDataCodewords = (ver, ecl) => {
  return Math.floor(getNumRawDataModules(ver) / 8) - getNumEccCodewords(ver, ecl);
};

// ECC codewords per block table (Nayuki)
const ECC_CODEWORDS_PER_BLOCK = [
  // version: 1..40, each row: [L, M, Q, H]
  [7, 10, 13, 17],
  [10, 16, 22, 28],
  [15, 26, 36, 44],
  [20, 36, 52, 64],
  [26, 48, 72, 88],
  [36, 64, 96, 112],
  [40, 72, 108, 130],
  [48, 88, 132, 156],
  [60, 110, 160, 192],
  [72, 130, 192, 224],
  [80, 150, 224, 264],
  [96, 176, 260, 308],
  [104, 198, 288, 352],
  [120, 216, 320, 384],
  [132, 240, 360, 432],
  [144, 280, 408, 480],
  [168, 308, 448, 532],
  [180, 338, 504, 588],
  [196, 364, 546, 650],
  [224, 416, 600, 700],
  [224, 442, 644, 750],
  [252, 476, 690, 816],
  [270, 504, 750, 900],
  [300, 560, 810, 960],
  [312, 588, 870, 1050],
  [336, 644, 952, 1110],
  [360, 700, 1020, 1200],
  [390, 728, 1050, 1260],
  [420, 784, 1140, 1350],
  [450, 812, 1200, 1440],
  [480, 868, 1290, 1530],
  [510, 924, 1350, 1620],
  [540, 980, 1440, 1710],
  [570, 1036, 1530, 1800],
  [570, 1064, 1590, 1890],
  [600, 1120, 1680, 1980],
  [630, 1204, 1770, 2100],
  [660, 1260, 1860, 2220],
  [720, 1316, 1950, 2310],
  [750, 1372, 2040, 2430],
];

// Number of error correction blocks table (Nayuki)
const NUM_ERROR_CORRECTION_BLOCKS = [
  [1, 1, 1, 1],
  [1, 1, 1, 1],
  [1, 1, 2, 2],
  [1, 2, 2, 4],
  [1, 2, 4, 4],
  [2, 4, 4, 4],
  [2, 4, 6, 5],
  [2, 4, 6, 6],
  [2, 5, 8, 8],
  [4, 5, 8, 8],
  [4, 5, 8, 11],
  [4, 8, 10, 11],
  [4, 9, 12, 16],
  [4, 9, 16, 16],
  [6, 10, 18, 18],
  [6, 10, 16, 22],
  [6, 11, 19, 22],
  [6, 13, 21, 26],
  [7, 14, 25, 26],
  [8, 16, 25, 26],
  [8, 17, 25, 30],
  [9, 17, 34, 30],
  [9, 18, 30, 35],
  [10, 20, 32, 35],
  [12, 21, 35, 35],
  [12, 23, 37, 40],
  [12, 25, 40, 42],
  [13, 26, 42, 45],
  [14, 28, 45, 48],
  [15, 29, 48, 51],
  [16, 31, 51, 54],
  [17, 33, 54, 57],
  [18, 35, 57, 60],
  [19, 37, 60, 63],
  [19, 38, 63, 66],
  [20, 40, 66, 70],
  [21, 43, 70, 74],
  [22, 45, 74, 77],
  [24, 47, 77, 81],
  [25, 49, 81, 85],
];

const getNumEccBlocks = (ver, ecl) => NUM_ERROR_CORRECTION_BLOCKS[ver - 1][ecl.ordinal];
const getNumEccCodewords = (ver, ecl) => ECC_CODEWORDS_PER_BLOCK[ver - 1][ecl.ordinal] * getNumEccBlocks(ver, ecl);

const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

const toUtf8Bytes = (str) => new TextEncoder().encode(str);

const reedSolomonComputeDivisor = (degree) => {
  // Generator polynomial (x - r^0)(x - r^1)...(x - r^{degree-1}) in GF(2^8)
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
};

const reedSolomonComputeRemainder = (data, divisor) => {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i += 1) result[i] ^= reedSolomonMultiply(divisor[i], factor);
  }
  return result;
};

const reedSolomonMultiply = (x, y) => {
  // GF(2^8) with primitive polynomial 0x11D
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    if (((y >>> i) & 1) !== 0) z ^= x;
  }
  return z & 0xff;
};

const getAlignmentPatternPositions = (ver) => {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const size = ver * 4 + 17;
  const step = numAlign === 2 ? size - 13 : Math.ceil((size - 13) / (numAlign - 1) / 2) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
};

const getFormatBits = (ecl, mask) => {
  let data = (ecl.formatBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  return bits & 0x7fff;
};

const getVersionBits = (ver) => {
  let rem = ver;
  for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return ((ver << 12) | rem) & 0x3ffff;
};

const getMaskBit = (mask, x, y) => {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return ((Math.floor(y / 2) + Math.floor(x / 3)) % 2) === 0;
    case 5:
      return ((x * y) % 2 + (x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2 + (x * y) % 3) % 2) === 0;
    case 7:
      return (((x + y) % 2 + (x * y) % 3) % 2) === 0;
    default:
      throw new RangeError('mask');
  }
};

const penaltyRule1 = (modules, size) => {
  let result = 0;
  for (let y = 0; y < size; y += 1) {
    let runColor = false;
    let runX = 0;
    for (let x = 0; x < size; x += 1) {
      const color = modules[y][x];
      if (x === 0) {
        runColor = color;
        runX = 1;
      } else if (color === runColor) {
        runX += 1;
        if (runX === 5) result += 3;
        else if (runX > 5) result += 1;
      } else {
        runColor = color;
        runX = 1;
      }
    }
  }
  for (let x = 0; x < size; x += 1) {
    let runColor = false;
    let runY = 0;
    for (let y = 0; y < size; y += 1) {
      const color = modules[y][x];
      if (y === 0) {
        runColor = color;
        runY = 1;
      } else if (color === runColor) {
        runY += 1;
        if (runY === 5) result += 3;
        else if (runY > 5) result += 1;
      } else {
        runColor = color;
        runY = 1;
      }
    }
  }
  return result;
};

const penaltyRule2 = (modules, size) => {
  let result = 0;
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) result += 3;
    }
  }
  return result;
};

const penaltyRule3 = (modules, size) => {
  let result = 0;
  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];
  const hasPattern = (row, start, pat) => pat.every((v, i) => row[start + i] === v);

  for (let y = 0; y < size; y += 1) {
    const row = modules[y];
    for (let x = 0; x <= size - 11; x += 1) {
      if (hasPattern(row, x, pattern1) || hasPattern(row, x, pattern2)) result += 40;
    }
  }
  for (let x = 0; x < size; x += 1) {
    const col = [];
    for (let y = 0; y < size; y += 1) col.push(modules[y][x]);
    for (let y = 0; y <= size - 11; y += 1) {
      if (hasPattern(col, y, pattern1) || hasPattern(col, y, pattern2)) result += 40;
    }
  }
  return result;
};

const penaltyRule4 = (modules, size) => {
  let black = 0;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (modules[y][x]) black += 1;
  const total = size * size;
  const k = Math.abs(black * 20 - total * 10) / total;
  return Math.floor(k) * 10;
};

const getPenaltyScore = (modules, size) =>
  penaltyRule1(modules, size) + penaltyRule2(modules, size) + penaltyRule3(modules, size) + penaltyRule4(modules, size);

export class QrCode {
  constructor(version, ecl, dataCodewords, mask) {
    this.version = version;
    this.errorCorrectionLevel = ecl;
    this.size = version * 4 + 17;
    this.mask = mask;

    const size = this.size;
    const modules = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
    const isFunc = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

    const setFunctionModule = (x, y, isBlack) => {
      modules[y][x] = isBlack;
      isFunc[y][x] = true;
    };

    // Finder patterns + separators
    const drawFinder = (x, y) => {
      for (let dy = -1; dy <= 7; dy += 1) {
        for (let dx = -1; dx <= 7; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || xx >= size || yy < 0 || yy >= size) continue;
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    // Timing patterns
    for (let i = 0; i < size; i += 1) {
      if (!isFunc[6][i]) setFunctionModule(i, 6, i % 2 === 0);
      if (!isFunc[i][6]) setFunctionModule(6, i, i % 2 === 0);
    }

    // Alignment patterns
    const align = getAlignmentPatternPositions(version);
    for (let i = 0; i < align.length; i += 1) {
      for (let j = 0; j < align.length; j += 1) {
        if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
        const cx = align[i];
        const cy = align[j];
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }

    // Dark module
    setFunctionModule(8, size - 8, true);

    // Version info
    if (version >= 7) {
      const bits = getVersionBits(version);
      for (let i = 0; i < 18; i += 1) {
        const bit = ((bits >>> i) & 1) !== 0;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunctionModule(a, b, bit);
        setFunctionModule(b, a, bit);
      }
    }

    // Draw format bits (mask placeholder for now)
    const drawFormatBits = (mask) => {
      const bits = getFormatBits(ecl, mask);
      for (let i = 0; i <= 5; i += 1) setFunctionModule(8, i, ((bits >>> i) & 1) !== 0);
      setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0);
      setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0);
      setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0);
      for (let i = 9; i < 15; i += 1) setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0);

      for (let i = 0; i < 8; i += 1) setFunctionModule(size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
      for (let i = 8; i < 15; i += 1) setFunctionModule(8, size - 15 + i, ((bits >>> i) & 1) !== 0);
      setFunctionModule(8, size - 8, true);
    };

    // Codewords: interleave blocks
    const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[version - 1][ecl.ordinal];
    const numBlocks = getNumEccBlocks(version, ecl);
    const totalData = getNumDataCodewords(version, ecl);
    const shortBlockLen = Math.floor(totalData / numBlocks);
    const numShortBlocks = numBlocks - (totalData % numBlocks);

    const blocks = [];
    let k = 0;
    const divisor = reedSolomonComputeDivisor(eccPerBlock);
    for (let i = 0; i < numBlocks; i += 1) {
      const dataLen = i < numShortBlocks ? shortBlockLen : shortBlockLen + 1;
      const data = dataCodewords.slice(k, k + dataLen);
      k += dataLen;
      const ecc = reedSolomonComputeRemainder(data, divisor);
      blocks.push({ data, ecc });
    }

    const codewords = [];
    for (let i = 0; i < Math.max(...blocks.map((b) => b.data.length)); i += 1) {
      for (const b of blocks) if (i < b.data.length) codewords.push(b.data[i]);
    }
    for (let i = 0; i < eccPerBlock; i += 1) {
      for (const b of blocks) codewords.push(b.ecc[i]);
    }

    // Draw data bits (zigzag)
    let bitIndex = 0;
    const getBit = () => {
      const byte = codewords[bitIndex >>> 3];
      const bit = ((byte >>> (7 - (bitIndex & 7))) & 1) !== 0;
      bitIndex += 1;
      return bit;
    };

    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right -= 1;
      for (let vert = 0; vert < size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
          if (isFunc[y][x]) continue;
          let black = false;
          if (bitIndex < codewords.length * 8) black = getBit();
          modules[y][x] = black;
        }
      }
    }

    // Mask selection
    let bestMask = 0;
    let bestPenalty = Infinity;
    const applyMask = (mask) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (isFunc[y][x]) continue;
          modules[y][x] = modules[y][x] ^ getMaskBit(mask, x, y);
        }
      }
    };

    if (mask == null) {
      for (let m = 0; m < 8; m += 1) {
        drawFormatBits(m);
        applyMask(m);
        const p = getPenaltyScore(modules, size);
        applyMask(m);
        if (p < bestPenalty) {
          bestPenalty = p;
          bestMask = m;
        }
      }
      this.mask = bestMask;
    }

    drawFormatBits(this.mask);
    applyMask(this.mask);

    this.modules = modules;
  }

  static encodeText(text, ecl = QrEcc.MEDIUM) {
    const bytes = toUtf8Bytes(String(text ?? ''));
    const seg = QrSegment.makeBytes(bytes);
    return QrCode.encodeSegments([seg], ecl);
  }

  static encodeSegments(segs, ecl, minVersion = 1, maxVersion = 40, mask = null) {
    if (!Array.isArray(segs) || segs.length === 0) throw new Error('No segments');
    for (let ver = minVersion; ver <= maxVersion; ver += 1) {
      const dataCapacityBits = getNumDataCodewords(ver, ecl) * 8;
      const usedBits = QrSegment.getTotalBits(segs, ver);
      if (usedBits <= dataCapacityBits) {
        const bb = new BitBuffer();
        for (const s of segs) {
          bb.appendBits(s.mode.modeBits, 4);
          bb.appendBits(s.numChars, s.mode.numCharCountBits(ver));
          for (const b of s.data) bb.appendBit(b);
        }
        // Terminator
        bb.appendBits(0, Math.min(4, dataCapacityBits - bb.length));
        while (bb.length % 8 !== 0) bb.appendBit(false);
        // Pad bytes
        const pad0 = 0xec;
        const pad1 = 0x11;
        let pad = pad0;
        while (bb.length < dataCapacityBits) {
          bb.appendBits(pad, 8);
          pad = pad === pad0 ? pad1 : pad0;
        }

        const dataCodewords = new Uint8Array(bb.data);
        return new QrCode(ver, ecl, dataCodewords, mask);
      }
    }
    throw new Error('Data too long for QR code');
  }

  toSvgString(border = 4) {
    const size = this.size;
    const b = border;
    const dim = size + b * 2;
    const parts = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (this.modules[y][x]) parts.push(`M${x + b},${y + b}h1v1h-1z`);
      }
    }
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">`,
      `<rect width="100%" height="100%" fill="#fff"/>`,
      `<path d="${parts.join('')}" fill="#111"/>`,
      `</svg>`,
    ].join('');
  }

  toDataUrl(scale = 6, border = 4) {
    const svg = this.toSvgString(border);
    // Avoid btoa unicode issues by encoding as UTF-8 first.
    const utf8 = new TextEncoder().encode(svg);
    let bin = '';
    for (let i = 0; i < utf8.length; i += 1) bin += String.fromCharCode(utf8[i]);
    return `data:image/svg+xml;base64,${btoa(bin)}`;
  }
}

export class QrSegmentMode {
  constructor(modeBits, ccbits) {
    this.modeBits = modeBits;
    this.ccbits = ccbits;
  }

  numCharCountBits(ver) {
    if (ver < 1 || ver > 40) throw new RangeError('version');
    return this.ccbits[Math.floor((ver + 7) / 17)];
  }
}

export class QrSegment {
  constructor(mode, numChars, dataBits) {
    this.mode = mode;
    this.numChars = numChars;
    this.data = dataBits;
  }

  static makeBytes(bytes) {
    const data = new BitBuffer();
    for (const b of bytes) data.appendBits(b & 0xff, 8);
    return new QrSegment(QrSegment.Mode.BYTE, bytes.length, dataToBoolArray(data));
  }

  static getTotalBits(segs, ver) {
    let result = 0;
    for (const s of segs) {
      const ccbits = s.mode.numCharCountBits(ver);
      result += 4 + ccbits + s.data.length;
    }
    return result;
  }
}

QrSegment.Mode = Object.freeze({
  NUMERIC: new QrSegmentMode(0x1, [10, 12, 14]),
  ALPHANUMERIC: new QrSegmentMode(0x2, [9, 11, 13]),
  BYTE: new QrSegmentMode(0x4, [8, 16, 16]),
  KANJI: new QrSegmentMode(0x8, [8, 10, 12]),
  ECI: new QrSegmentMode(0x7, [0, 0, 0]),
});

const dataToBoolArray = (bb) => {
  const out = [];
  for (let i = 0; i < bb.length; i += 1) out.push(bb.getBit(i));
  return out;
};

