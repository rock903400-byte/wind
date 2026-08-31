/* Wind × 飛律 — 實體名片生成與列印腳本 (assets/print-card.js) */

const QRCodeGen = (function(){
 const QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3 };
 const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
 const QRMaskPattern = { PATTERN000: 0, PATTERN001: 1, PATTERN010: 2, PATTERN011: 3, PATTERN100: 4, PATTERN101: 5, PATTERN110: 6, PATTERN111: 7 };
 const QRMath = {
  glog: function(n) { if (n < 1) throw new Error('glog(' + n + ')'); return QRMath.LOG_TABLE[n]; },
  gexp: function(n) { while (n < 0) n += 255; while (n >= 255) n -= 255; return QRMath.EXP_TABLE[n]; },
  EXP_TABLE: new Array(256),
  LOG_TABLE: new Array(256)
 };
 for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
 for (let i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
 for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

 function QRPolynomial(num, shift) {
  let offset = 0;
  while (offset < num.length && num[offset] === 0) offset++;
  this.num = new Array(num.length - offset + shift);
  for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  for (let i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
 }
 QRPolynomial.prototype = {
  get: function(index) { return this.num[index]; },
  getLength: function() { return this.num.length; },
  multiply: function(e) {
   const num = new Array(this.getLength() + e.getLength() - 1);
   for (let i = 0; i < this.getLength(); i++) {
    for (let j = 0; j < e.getLength(); j++) {
     num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
    }
   }
   return new QRPolynomial(num, 0);
  },
  mod: function(e) {
   if (this.getLength() - e.getLength() < 0) return this;
   const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
   const num = new Array(this.getLength());
   for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
   for (let i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
   return new QRPolynomial(num, 0).mod(e);
  }
 };

 function QRRSBlock(totalCount, dataCount) {
  this.totalCount = totalCount;
  this.dataCount = dataCount;
 }
 QRRSBlock.RS_BLOCK_TABLE = [
    [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
    [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
    [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
    [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
    [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
    [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
    [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
    [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
    [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
    [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
    [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
    [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
    [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]
  ];
 QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
  const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
  const length = rsBlock.length / 3;
  const list = [];
  for (let i = 0; i < length; i++) {
   const count = rsBlock[i * 3 + 0];
   const totalCount = rsBlock[i * 3 + 1];
   const dataCount = rsBlock[i * 3 + 2];
   for (let j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount));
  }
  return list;
 };
 QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
  switch (errorCorrectLevel) {
   case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
   case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
   case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
   case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
  }
 };

 function QRBitBuffer() {
  this.buffer = [];
  this.length = 0;
 }
 QRBitBuffer.prototype = {
  get: function(index) {
   const bufIndex = Math.floor(index / 8);
   return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
  },
  put: function(num, length) {
   for (let i = 0; i < length; i++) {
    this.putBit(((num >>> (length - i - 1)) & 1) === 1);
   }
  },
  putBit: function(bit) {
   const bufIndex = Math.floor(this.length / 8);
   if (this.buffer.length <= bufIndex) this.buffer.push(0);
   if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
   this.length++;
  }
 };

 function QRCodeModel(typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = [];
 }
 QRCodeModel.prototype = {
  addData: function(data) {
   this.dataList.push({
    mode: QRMode.MODE_8BIT_BYTE,
    data: data,
    getLength: function() { return encodeURI(data).replace(/%[0-9a-fA-F]{2}/g, 'a').length; },
    write: function(buffer) {
     for (let i = 0; i < data.length; i++) {
      const c = data.charCodeAt(i);
      if (c < 128) {
       buffer.put(c, 8);
      } else {
       const bytes = unescape(encodeURIComponent(data[i]));
       for (let b = 0; b < bytes.length; b++) buffer.put(bytes.charCodeAt(b), 8);
      }
     }
    }
   });
   this.dataCache = null;
  },
  isDark: function(row, col) {
   if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) return false;
   return this.modules[row][col] === true;
  },
  getModuleCount: function() { return this.moduleCount; },
  make: function() {
   if (this.typeNumber < 1) {
    for (let t = 1; t <= 40; t++) {
     const rsBlocks = QRRSBlock.getRSBlocks(t, this.errorCorrectLevel);
     const buffer = new QRBitBuffer();
     let totalDataCount = 0;
     for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
     for (let i = 0; i < this.dataList.length; i++) {
      const data = this.dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), t < 10 ? 8 : 16);
      data.write(buffer);
     }
     if (buffer.length <= totalDataCount * 8) {
      this.typeNumber = t;
      break;
     }
    }
   }
   this.makeImpl(false, this.getBestMaskPattern());
  },
  makeImpl: function(test, maskPattern) {
   this.moduleCount = this.typeNumber * 4 + 17;
   this.modules = new Array(this.moduleCount);
   for (let row = 0; row < this.moduleCount; row++) {
    this.modules[row] = new Array(this.moduleCount);
    for (let col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
   }
   this.setupPositionProbePattern(0, 0);
   this.setupPositionProbePattern(this.moduleCount - 7, 0);
   this.setupPositionProbePattern(0, this.moduleCount - 7);
   this.setupPositionAdjustPattern();
   this.setupTimingPattern();
   this.setupTypeInfo(test, maskPattern);
   if (this.typeNumber >= 7) this.setupTypeNumber(test);
   if (this.dataCache === null) this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
   this.mapData(this.dataCache, maskPattern);
  },
  setupPositionProbePattern: function(row, col) {
   for (let r = -1; r <= 7; r++) {
    if (row + r <= -1 || this.moduleCount <= row + r) continue;
    for (let c = -1; c <= 7; c++) {
     if (col + c <= -1 || this.moduleCount <= col + c) continue;
     if ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
      this.modules[row + r][col + c] = true;
     } else {
      this.modules[row + r][col + c] = false;
     }
    }
   }
  },
  getBestMaskPattern: function() {
   let minLostPoint = 0;
   let pattern = 0;
   for (let i = 0; i < 8; i++) {
    this.makeImpl(true, i);
    const lostPoint = QRCodeModel.getLostPoint(this);
    if (i === 0 || minLostPoint > lostPoint) {
     minLostPoint = lostPoint;
     pattern = i;
    }
   }
   return pattern;
  },
  setupTimingPattern: function() {
   for (let r = 8; r < this.moduleCount - 8; r++) {
    if (this.modules[r][6] !== null) continue;
    this.modules[r][6] = (r % 2 === 0);
   }
   for (let c = 8; c < this.moduleCount - 8; c++) {
    if (this.modules[6][c] !== null) continue;
    this.modules[6][c] = (c % 2 === 0);
   }
  },
  setupPositionAdjustPattern: function() {
   const pos = QRCodeModel.getPatternPosition(this.typeNumber);
   for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
     const row = pos[i];
     const col = pos[j];
     if (this.modules[row][col] !== null) continue;
     for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
       if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        this.modules[row + r][col + c] = true;
       } else {
        this.modules[row + r][col + c] = false;
       }
      }
     }
    }
   }
  },
  setupTypeNumber: function(test) {
   const bits = QRCodeModel.getBCHTypeNumber(this.typeNumber);
   for (let i = 0; i < 18; i++) {
    const mod = (!test && ((bits >> i) & 1) === 1);
    this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
    this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
   }
  },
  setupTypeInfo: function(test, maskPattern) {
   const data = (this.errorCorrectLevel << 3) | maskPattern;
   const bits = QRCodeModel.getBCHTypeInfo(data);
   for (let i = 0; i < 15; i++) {
    const mod = (!test && ((bits >> i) & 1) === 1);
    if (i < 6) {
     this.modules[i][8] = mod;
    } else if (i < 8) {
     this.modules[i + 1][8] = mod;
    } else {
     this.modules[this.moduleCount - 15 + i][8] = mod;
    }
    if (i < 8) {
     this.modules[8][this.moduleCount - i - 1] = mod;
    } else if (i < 9) {
     this.modules[8][15 - i - 1 + 1] = mod;
    } else {
     this.modules[8][15 - i - 1] = mod;
    }
   }
   this.modules[this.moduleCount - 8][8] = !test;
  },
  mapData: function(data, maskPattern) {
   let inc = -1;
   let row = this.moduleCount - 1;
   let bitIndex = 7;
   let byteIndex = 0;
   const maskFunc = QRCodeModel.getMaskFunction(maskPattern);
   for (let col = this.moduleCount - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    while (true) {
     for (let c = 0; c < 2; c++) {
      if (this.modules[row][col - c] === null) {
       let dark = false;
       if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
       const mask = maskFunc(row, col - c);
       if (mask) dark = !dark;
       this.modules[row][col - c] = dark;
       bitIndex--;
       if (bitIndex === -1) {
        byteIndex++;
        bitIndex = 7;
       }
      }
     }
     row += inc;
     if (row < 0 || this.moduleCount <= row) {
      row -= inc;
      inc = -inc;
      break;
     }
    }
   }
  }
 };

 QRCodeModel.getMaskFunction = function(maskPattern) {
  switch (maskPattern) {
   case QRMaskPattern.PATTERN000: return function(i, j) { return (i + j) % 2 === 0; };
   case QRMaskPattern.PATTERN001: return function(i, j) { return i % 2 === 0; };
   case QRMaskPattern.PATTERN010: return function(i, j) { return j % 3 === 0; };
   case QRMaskPattern.PATTERN011: return function(i, j) { return (i + j) % 3 === 0; };
   case QRMaskPattern.PATTERN100: return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; };
   case QRMaskPattern.PATTERN101: return function(i, j) { return (i * j) % 2 + (i * j) % 3 === 0; };
   case QRMaskPattern.PATTERN110: return function(i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; };
   case QRMaskPattern.PATTERN111: return function(i, j) { return ((i * j) % 3 + (i + j) % 2) % 2 === 0; };
   default: throw new Error('bad maskPattern:' + maskPattern);
  }
 };

 QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
  const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
  const buffer = new QRBitBuffer();
  for (let i = 0; i < dataList.length; i++) {
   const data = dataList[i];
   buffer.put(data.mode, 4);
   buffer.put(data.getLength(), typeNumber < 10 ? 8 : 16);
   data.write(buffer);
  }
  let totalDataCount = 0;
  for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
  if (buffer.length > totalDataCount * 8) throw new Error('code length overflow');
  if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
  while (buffer.length % 8 !== 0) buffer.putBit(false);
  while (true) {
   if (buffer.length >= totalDataCount * 8) break;
   buffer.put(0xEC, 8);
   if (buffer.length >= totalDataCount * 8) break;
   buffer.put(0x11, 8);
  }
  return QRCodeModel.createBytes(buffer, rsBlocks);
 };

 QRCodeModel.createBytes = function(buffer, rsBlocks) {
  let offset = 0;
  let maxDcCount = 0;
  let maxEcCount = 0;
  const dcdata = new Array(rsBlocks.length);
  const ecdata = new Array(rsBlocks.length);
  for (let r = 0; r < rsBlocks.length; r++) {
   const dcCount = rsBlocks[r].dataCount;
   const ecCount = rsBlocks[r].totalCount - dcCount;
   maxDcCount = Math.max(maxDcCount, dcCount);
   maxEcCount = Math.max(maxEcCount, ecCount);
   dcdata[r] = new Array(dcCount);
   for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
   offset += dcCount;
   const rsPoly = QRCodeModel.getErrorCorrectPolynomial(ecCount);
   const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
   const modPoly = rawPoly.mod(rsPoly);
   ecdata[r] = new Array(rsPoly.getLength() - 1);
   for (let i = 0; i < ecdata[r].length; i++) {
    const modIndex = i + modPoly.getLength() - ecdata[r].length;
    ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
   }
  }
  let totalCodeCount = 0;
  for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
  const data = new Array(totalCodeCount);
  let index = 0;
  for (let i = 0; i < maxDcCount; i++) {
   for (let r = 0; r < rsBlocks.length; r++) {
    if (i < dcdata[r].length) data[index++] = dcdata[r][i];
   }
  }
  for (let i = 0; i < maxEcCount; i++) {
   for (let r = 0; r < rsBlocks.length; r++) {
    if (i < ecdata[r].length) data[index++] = ecdata[r][i];
   }
  }
  return data;
 };

 QRCodeModel.getErrorCorrectPolynomial = function(errorCorrectLength) {
  let a = new QRPolynomial([1], 0);
  for (let i = 0; i < errorCorrectLength; i++) {
   a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
  }
  return a;
 };

 QRCodeModel.getPatternPosition = function(typeNumber) {
    const PATTERN_POSITION_TABLE = [
      [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
      [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
      [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
      [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
      [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
    ];
  return PATTERN_POSITION_TABLE[typeNumber - 1] || [];
 };

 QRCodeModel.getBCHTypeInfo = function(data) {
  let d = data << 10;
  while (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(1335) >= 0) {
   d ^= (1335 << (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(1335)));
  }
  return ((data << 10) | d) ^ 21522;
 };

 QRCodeModel.getBCHTypeNumber = function(data) {
  let d = data << 12;
  while (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(7973) >= 0) {
   d ^= (7973 << (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(7973)));
  }
  return (data << 12) | d;
 };

 QRCodeModel.getBCHDigit = function(data) {
  let digit = 0;
  while (data !== 0) {
   digit++;
   data >>>= 1;
  }
  return digit;
 };

 QRCodeModel.getLostPoint = function(qrCode) {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;
    // LEVEL1
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += (3 + sameCount - 5);
      }
    }
    // LEVEL2
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qrCode.isDark(row, col)) count++;
        if (qrCode.isDark(row + 1, col)) count++;
        if (qrCode.isDark(row, col + 1)) count++;
        if (qrCode.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) lostPoint += 3;
      }
    }
    // LEVEL3
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) lostPoint += 40;
      }
    }
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) lostPoint += 40;
      }
    }
    // LEVEL4
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) darkCount++;
      }
    }
    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  };

 function createSVG(url, color = '#000000') {
  const qr = new QRCodeModel(0, QRErrorCorrectLevel.M);
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const margin = 4; // 靜區：ISO/IEC 18004 要求 4 模組，低於此值掃描率會下降
  const totalSize = n + margin * 2;
  let pathData = '';
  
  for (let r = 0; r < n; r++) {
   for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) {
     pathData += `M${c + margin},${r + margin}h1v1h-1z `;
    }
   }
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">
   <rect width="${totalSize}" height="${totalSize}" fill="#ffffff"/>
   <path d="${pathData}" fill="${color}"/>
  </svg>`;
 }

 function encodeQRMatrix(url) {
  const qr = new QRCodeModel(0, QRErrorCorrectLevel.M);
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const m = [];
  for (let r = 0; r < n; r++) {
   const row = [];
   for (let c = 0; c < n; c++) {
    row.push(qr.isDark(r, c) ? 1 : 0);
   }
   m.push(row);
  }
  return m;
 }

 return {
  createSVG,
  encodeQRMatrix
 };
})();

// ==========================================================================
// 全域提示 (Toast) — 下載與分享流程共用
// ==========================================================================
function showToast(msg) {
 const toast = document.getElementById('toast');
 if (!toast) return;
 toast.textContent = msg;
 toast.classList.add('show');
 clearTimeout(toast._timer);
 toast._timer = setTimeout(() => {
  toast.classList.remove('show');
 }, 3200);
}

// ==========================================================================
// 高解析 DOM 快照下載 (html2canvas 4x 採樣，與畫面 1:1 一致)
//
// 註：此處刻意「不」提供自行手繪 Canvas 的備援渲染器。舊版備援以 px 硬座標重畫
// 版面，與畫面的 mm/flex 排版對不齊，等於在使用者不知情的狀況下交付一張版面錯誤
// 的送印檔。html2canvas 不可用時改為明確引導走列印/PDF 路徑——該路徑無外部依賴，
// 且輸出的向量檔正是印刷廠真正需要的格式。
// ==========================================================================
const PRINT_FALLBACK_MSG = '⚠️ 高解析圖片模組載入失敗，請改用「另存 1:1 PDF / 列印」取得送印檔';
const H2C_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const H2C_INTEGRITY = 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==';
let _h2cPromise = null;

function ensureHtml2Canvas() {
  if (typeof html2canvas !== 'undefined' && !window.__h2cFailed) return Promise.resolve();
  if (window.__h2cFailed) return Promise.reject(new Error('html2canvas previously failed'));
  if (_h2cPromise) return _h2cPromise;
  _h2cPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = H2C_URL;
    s.integrity = H2C_INTEGRITY;
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.onload = () => resolve();
    s.onerror = () => { window.__h2cFailed = true; reject(new Error('html2canvas load error')); };
    document.head.appendChild(s);
  });
  return _h2cPromise;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
   canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('canvas.toBlob 回傳空值'));
   }, 'image/png', 1.0);
  });
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
  }, 200);
}

async function downloadDOMCardImage(cardEl, filename, btnEl) {
  try {
    await ensureHtml2Canvas();
  } catch (e) {
    showToast(PRINT_FALLBACK_MSG);
    return;
  }
  if (typeof html2canvas === 'undefined' || window.__h2cFailed) {
   showToast(PRINT_FALLBACK_MSG);
   return;
  }

 const isDark = document.body.classList.contains('theme-dark');
 const isBleed = document.body.classList.contains('bleed-active');
 const originalText = btnEl ? btnEl.textContent : '';
 const restore = () => {
  if (!btnEl) return;
  btnEl.textContent = originalText;
  btnEl.disabled = false;
 };

 // 出血模式連同 .card-canvas 的 2mm 空白與裁切線一起擷取，讓 PNG 與 PDF 輸出一致
 const target = (isBleed && cardEl.closest('.card-canvas')) || cardEl;

 if (btnEl) {
  btnEl.textContent = '⏳ 產生高解析圖...';
  btnEl.disabled = true;
 }

 try {
  if (document.fonts && document.fonts.ready) {
   await document.fonts.ready;
  }

  const canvas = await html2canvas(target, {
   scale: 4, // 300+ DPI 超高解析度
   useCORS: true,
   allowTaint: true,
   // 出血模式的外圈是未印刷紙面，恆為白色；成品模式才跟隨卡片主題
   backgroundColor: isBleed ? '#ffffff' : (isDark ? '#090d16' : '#ffffff'),
   logging: false
  });

  const blob = await canvasToBlob(canvas);
  triggerBlobDownload(blob, filename);

  if (btnEl) {
   btnEl.textContent = '✅ 已完成下載';
   setTimeout(restore, 1800);
  }
 } catch (err) {
  // toBlob 的失敗現在會被這裡接到：先前 throw 在 callback 內，外層 try/catch 抓不到
  console.warn('html2canvas 產生圖片失敗:', err);
  showToast(PRINT_FALLBACK_MSG);
  restore();
 }
}

// ==========================================================================
// 頁面互動與控制
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const frontUrl = 'https://wind.rock903400.workers.dev/';
  const backUrl = 'https://wind.rock903400.workers.dev/ai-enablement.html';

  // 1. 動態注入 @page 列印樣式 (修復 CSS 列印尺寸 Bug)
  function updatePrintPageSize(isBleed) {
    let styleEl = document.getElementById('dynamicPrintPageStyle');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamicPrintPageStyle';
      document.head.appendChild(styleEl);
    }
    // 出血頁面需含裁切線落點的四周 2mm 空白：92+4 × 56+4
    const size = isBleed ? '96mm 60mm' : '90mm 54mm';
    styleEl.textContent = `@media print { @page { size: ${size}; margin: 0; } }`;
  }
  updatePrintPageSize(false);

  // 1.5 送印卡面內容：自 3D 名片複製，避免同一份文案維護兩份而漂移。
  //     3D 視圖是主要視圖且為靜態 HTML（可被爬蟲讀取）；送印視圖只能由 JS 按鈕開啟，
  //     因此以它為複製目標不會有 no-JS 的內容損失。
  function buildPrintCards() {
    const specs = [
      { srcSel: '#card3DFlipper .face-front .card-inner', destId: 'cardFront',
        qrId: 'qrFrontWrap', heading: '石誠風 Wind 名片正面 — 全端系統架構師 · 簽約交付' },
      { srcSel: '#card3DFlipper .face-back .card-inner', destId: 'cardBack',
        qrId: 'qrBackWrap', heading: '飛律 名片背面 — 企業試用方案' }
    ];

    specs.forEach(spec => {
      const src = document.querySelector(spec.srcSel);
      const dest = document.getElementById(spec.destId);
      if (!src || !dest) return;

      const clone = src.cloneNode(true);
      // 複製品不得沿用來源的 id，否則 QR 注入時會撞名
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      const qrWrap = clone.querySelector('.qr-img-wrap');
      if (qrWrap) qrWrap.id = spec.qrId;

      const heading = document.createElement('h2');
      heading.className = 'sr-only';
      heading.textContent = spec.heading;
      clone.insertBefore(heading, clone.firstChild);

      dest.innerHTML = '';
      dest.appendChild(clone);
    });
  }
  buildPrintCards();

  // 2. 向量 SVG QR Code 生成與注入 (含 3D 名片與送印預覽 4 個位置)
  function enhanceQR(id, label) {
    const wrap = document.getElementById(id);
    if (!wrap || !wrap.firstElementChild) return;
    const svg = wrap.firstElementChild;
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
    svg.setAttribute('focusable', 'false');
  }

  function renderQR(isDark) {
    const frontColor = isDark ? '#000000' : '#0f172a';
    const backColor = isDark ? '#000000' : '#065f46';
    
    const frontSVG = QRCodeGen.createSVG(frontUrl, frontColor);
    const backSVG = QRCodeGen.createSVG(backUrl, backColor);
    
    const qrTargets = [
      { id: 'qrFrontWrap', svg: frontSVG, label: 'QR Code：掃碼查看 Wind 作品集 https://wind.rock903400.workers.dev/' },
      { id: 'qr3DFrontWrap', svg: frontSVG, label: 'QR Code：掃碼查看 Wind 作品集 https://wind.rock903400.workers.dev/' },
      { id: 'qrBackWrap', svg: backSVG, label: 'QR Code：掃碼查看合約範本與案例 https://wind.rock903400.workers.dev/ai-enablement.html' },
      { id: 'qr3DBackWrap', svg: backSVG, label: 'QR Code：掃碼查看合約範本與案例 https://wind.rock903400.workers.dev/ai-enablement.html' }
    ];
    
    qrTargets.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.innerHTML = item.svg;
        enhanceQR(item.id, item.label);
      }
    });
  }
  renderQR(false);

  // 3. 📱 3D 翻轉名片互動控制
  const cardFlipper = document.getElementById('card3DFlipper');
  const btnFlipCard = document.getElementById('btnFlipCard');
  const flipFaceLabel = document.getElementById('flipFaceLabel');

  // 卡面文字現在可以選取（電話/Email 需要能複製），因此選字中不可觸發翻面
  function hasTextSelection() {
    const sel = window.getSelection && window.getSelection();
    return !!(sel && sel.toString().trim().length > 0);
  }

   function toggleCardFlip() {
     if (!cardFlipper) return;
     const isFlipped = cardFlipper.classList.toggle('is-flipped');
     cardFlipper.setAttribute('aria-pressed', isFlipped ? 'true' : 'false');
     if (btnFlipCard) btnFlipCard.setAttribute('aria-pressed', isFlipped ? 'true' : 'false');
     if (flipFaceLabel) {
       flipFaceLabel.textContent = isFlipped ? '(當前：背面 飛律)' : '(當前：正面 Wind)';
     }
   }

  if (cardFlipper) {
    // 點擊卡片本體翻面 (排除點擊內部連結)
    cardFlipper.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('button')) return;
      if (hasTextSelection()) return;
      toggleCardFlip();
    });

    // 鍵盤無障礙操作
    cardFlipper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCardFlip();
      }
    });

    // 手機觸控左右滑動 (Touch Swipe) 翻面
    let touchStartX = 0;
    let touchStartY = 0;
    cardFlipper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    cardFlipper.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY) && !hasTextSelection()) {
          toggleCardFlip();
        }
      }
    }, { passive: true });
  }

  if (btnFlipCard) {
    btnFlipCard.addEventListener('click', toggleCardFlip);
  }

  // 4. ⚡ 行動快捷列：智慧分享名片與全相容剪貼簿引擎
  //    （showToast 已提升至模組層級，供下載流程共用）

  function getShareUrl() {
    if (window.location.protocol === 'file:') {
      return 'https://wind.rock903400.workers.dev/print-card.html';
    }
    return window.location.href;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        textArea.style.opacity = '0';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          resolve();
        } else {
          reject(new Error('execCommand failed'));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  const btnShare = document.getElementById('btnActionShare');
  if (btnShare) {
    const originalBtnHtml = btnShare.innerHTML;
    btnShare.addEventListener('click', async () => {
      const shareUrl = getShareUrl();
      const shareData = {
        title: '石誠風 Wind × 飛律 — 3D 電子名片',
        text: '石誠風 Wind（全端系統架構師 · 跨產業上線實績 · 統編 54730503）× 飛律（AI 流程賦能）',
        url: shareUrl
      };

      // 手機裝置優先調用原生 Web Share
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // 桌機 / 本機 file:/// / 不支援 Web Share 時：一鍵複製並提供即時反饋
      try {
        await copyToClipboard(shareUrl);
        btnShare.innerHTML = '✅ 已複製名片連結！';
        btnShare.style.background = 'rgba(16, 185, 129, 0.25)';
        btnShare.style.borderColor = '#10b981';
        btnShare.style.color = '#6ee7b7';
        showToast('✅ 名片網址已複製至剪貼簿！');
      } catch (err) {
        prompt('請手動複製名片網址：', shareUrl);
      }

      setTimeout(() => {
        btnShare.innerHTML = originalBtnHtml;
        btnShare.style.background = '';
        btnShare.style.borderColor = '';
        btnShare.style.color = '';
      }, 2200);
    });
  }

  // 5. 視圖模式切換（3D 電子名片 vs 送印展開預覽）
  const btnTogglePrint = document.getElementById('btnTogglePrintToolbox');
  const btnBackToEcard = document.getElementById('btnBackToEcard');

  const SCROLL_BEHAVIOR = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
   function switchToEcardMode() {
     document.body.classList.remove('view-mode-print');
     document.body.classList.add('view-mode-ecard');
     window.scrollTo({ top: 0, behavior: SCROLL_BEHAVIOR });
   }

   function switchToPrintMode() {
     document.body.classList.remove('view-mode-ecard');
     document.body.classList.add('view-mode-print');
     window.scrollTo({ top: 0, behavior: SCROLL_BEHAVIOR });
   }

  if (btnTogglePrint) {
    btnTogglePrint.addEventListener('click', switchToPrintMode);
  }
  if (btnBackToEcard) {
    btnBackToEcard.addEventListener('click', switchToEcardMode);
  }

  // 6. 主題切換（極簡白底商務版 / 曜黑科技版）
  const btnLight = document.getElementById('btnThemeLight');
  const btnDark = document.getElementById('btnThemeDark');

  btnLight.addEventListener('click', () => {
    document.body.classList.remove('theme-dark');
    btnLight.classList.add('active');
    btnDark.classList.remove('active');
    renderQR(false);
  });

  btnDark.addEventListener('click', () => {
    document.body.classList.add('theme-dark');
    btnDark.classList.add('active');
    btnLight.classList.remove('active');
    renderQR(true);
  });

  // 7. 出血模式切換（90×54mm vs 92×56mm）
  const btnTrim = document.getElementById('btnModeTrim');
  const btnBleed = document.getElementById('btnModeBleed');
  const frontLabel = document.getElementById('frontDimLabel');
  const backLabel = document.getElementById('backDimLabel');

  btnTrim.addEventListener('click', () => {
    document.body.classList.remove('bleed-active');
    btnTrim.classList.add('active');
    btnBleed.classList.remove('active');
    frontLabel.textContent = '90mm × 54mm (成品尺寸)';
    backLabel.textContent = '90mm × 54mm (成品尺寸)';
    updatePrintPageSize(false);
  });

  btnBleed.addEventListener('click', () => {
    document.body.classList.add('bleed-active');
    btnBleed.classList.add('active');
    btnTrim.classList.remove('active');
    frontLabel.textContent = '92mm × 56mm (含 1mm 出血與裁切線)';
    backLabel.textContent = '92mm × 56mm (含 1mm 出血與裁切線)';
    updatePrintPageSize(true);
  });

  // 8. 列印 PDF
  document.getElementById('btnPrintPDF').addEventListener('click', () => {
    window.print();
  });

  // 9. 下載高解析 PNG
  const btnDlFront = document.getElementById('btnDownloadFront');
  const btnDlBack = document.getElementById('btnDownloadBack');

  btnDlFront.addEventListener('click', () => {
    const isBleed = document.body.classList.contains('bleed-active');
    const filename = isBleed ? 'Wind_Card_Front_92x56_Bleed.png' : 'Wind_Card_Front_90x54.png';
    downloadDOMCardImage(document.getElementById('cardFront'), filename, btnDlFront);
  });

  btnDlBack.addEventListener('click', () => {
    const isBleed = document.body.classList.contains('bleed-active');
    const filename = isBleed ? 'Feilu_Card_Back_92x56_Bleed.png' : 'Feilu_Card_Back_90x54.png';
    downloadDOMCardImage(document.getElementById('cardBack'), filename, btnDlBack);
  });
});

var h2cScript = document.getElementById("html2canvas-script");
if (h2cScript) {
  h2cScript.addEventListener("error", function() { window.__h2cFailed = true; });
}
