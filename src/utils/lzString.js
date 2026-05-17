// LZ-based string compression for URL-safe payloads.
// Derived from the MIT-licensed "lz-string" project (pieroxy), trimmed to the
// two functions we need for QR/link transfer.
// https://github.com/pieroxy/lz-string/

/* eslint-disable no-bitwise */

const f = String.fromCharCode;

const keyStrUriSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
const baseReverseDic = {};

const getBaseValue = (alphabet, character) => {
  if (!baseReverseDic[alphabet]) {
    baseReverseDic[alphabet] = {};
    for (let i = 0; i < alphabet.length; i += 1) baseReverseDic[alphabet][alphabet.charAt(i)] = i;
  }
  return baseReverseDic[alphabet][character];
};

const compress = (uncompressed, bitsPerChar, getCharFromInt) => {
  if (uncompressed == null) return '';
  let i;
  let value;
  const contextDictionary = {};
  const contextDictionaryToCreate = {};
  let contextC = '';
  let contextWC = '';
  let contextW = '';
  let contextEnlargeIn = 2;
  let contextDictSize = 3;
  let contextNumBits = 2;
  const contextData = [];
  let contextDataVal = 0;
  let contextDataPosition = 0;

  const writeBit = (bit) => {
    contextDataVal = (contextDataVal << 1) | bit;
    if (contextDataPosition === bitsPerChar - 1) {
      contextDataPosition = 0;
      contextData.push(getCharFromInt(contextDataVal));
      contextDataVal = 0;
    } else contextDataPosition += 1;
  };

  const writeBits = (numBits, num) => {
    for (let j = 0; j < numBits; j += 1) {
      writeBit(num & 1);
      num >>= 1;
    }
  };

  for (let ii = 0; ii < uncompressed.length; ii += 1) {
    contextC = uncompressed.charAt(ii);
    if (!Object.prototype.hasOwnProperty.call(contextDictionary, contextC)) {
      contextDictionary[contextC] = contextDictSize++;
      contextDictionaryToCreate[contextC] = true;
    }

    contextWC = contextW + contextC;
    if (Object.prototype.hasOwnProperty.call(contextDictionary, contextWC)) {
      contextW = contextWC;
    } else {
      if (Object.prototype.hasOwnProperty.call(contextDictionaryToCreate, contextW)) {
        if (contextW.charCodeAt(0) < 256) {
          writeBits(contextNumBits, 0);
          writeBits(8, contextW.charCodeAt(0));
        } else {
          writeBits(contextNumBits, 1);
          writeBits(16, contextW.charCodeAt(0));
        }
        contextEnlargeIn -= 1;
        if (contextEnlargeIn === 0) {
          contextEnlargeIn = 2 ** contextNumBits;
          contextNumBits += 1;
        }
        delete contextDictionaryToCreate[contextW];
      } else {
        value = contextDictionary[contextW];
        writeBits(contextNumBits, value);
      }
      contextEnlargeIn -= 1;
      if (contextEnlargeIn === 0) {
        contextEnlargeIn = 2 ** contextNumBits;
        contextNumBits += 1;
      }
      contextDictionary[contextWC] = contextDictSize++;
      contextW = String(contextC);
    }
  }

  if (contextW !== '') {
    if (Object.prototype.hasOwnProperty.call(contextDictionaryToCreate, contextW)) {
      if (contextW.charCodeAt(0) < 256) {
        writeBits(contextNumBits, 0);
        writeBits(8, contextW.charCodeAt(0));
      } else {
        writeBits(contextNumBits, 1);
        writeBits(16, contextW.charCodeAt(0));
      }
      contextEnlargeIn -= 1;
      if (contextEnlargeIn === 0) {
        contextEnlargeIn = 2 ** contextNumBits;
        contextNumBits += 1;
      }
      delete contextDictionaryToCreate[contextW];
    } else {
      value = contextDictionary[contextW];
      writeBits(contextNumBits, value);
    }
    contextEnlargeIn -= 1;
    if (contextEnlargeIn === 0) {
      contextEnlargeIn = 2 ** contextNumBits;
      contextNumBits += 1;
    }
  }

  writeBits(contextNumBits, 2);

  while (true) {
    contextDataVal <<= 1;
    if (contextDataPosition === bitsPerChar - 1) {
      contextData.push(getCharFromInt(contextDataVal));
      break;
    } else contextDataPosition += 1;
  }

  return contextData.join('');
};

const decompress = (length, resetValue, getNextValue) => {
  const dictionary = [];
  let next;
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  const result = [];
  let i;
  let w;
  let bits;
  let resb;
  let maxpower;
  let power;
  const data = { val: getNextValue(0), position: resetValue, index: 1 };

  const readBits = (n) => {
    bits = 0;
    maxpower = 2 ** n;
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }
    return bits;
  };

  for (i = 0; i < 3; i += 1) dictionary[i] = i;

  next = readBits(2);
  switch (next) {
    case 0:
      w = f(readBits(8));
      break;
    case 1:
      w = f(readBits(16));
      break;
    case 2:
      return '';
    default:
      return '';
  }
  dictionary[3] = w;
  result.push(w);

  while (true) {
    if (data.index > length) return '';
    const c = readBits(numBits);
    switch (c) {
      case 0:
        dictionary[dictSize++] = f(readBits(8));
        enlargeIn -= 1;
        entry = dictionary[dictSize - 1];
        break;
      case 1:
        dictionary[dictSize++] = f(readBits(16));
        enlargeIn -= 1;
        entry = dictionary[dictSize - 1];
        break;
      case 2:
        return result.join('');
      default:
        if (dictionary[c]) entry = dictionary[c];
        else if (c === dictSize) entry = w + w.charAt(0);
        else return '';
    }

    result.push(entry);

    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn -= 1;
    w = entry;

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits += 1;
    }
  }
};

export const LZString = {
  compressToEncodedURIComponent(input) {
    if (input == null) return '';
    return compress(input, 6, (a) => keyStrUriSafe.charAt(a));
  },

  decompressFromEncodedURIComponent(input) {
    if (input == null) return '';
    if (input === '') return '';
    return decompress(input.length, 32, (i) => getBaseValue(keyStrUriSafe, input.charAt(i)));
  },
};

