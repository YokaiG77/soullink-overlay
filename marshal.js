/* Lecteur minimal du format Ruby Marshal 4.8 (sauvegardes RPG Maker / Pokémon Essentials).
   Objets Ruby -> { __class: "Nom", "@ivar": valeur, ... } */
(function (root) {
  function parse(buf) {
    var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), p = 0;
    var syms = [], objs = [];
    var dec = new TextDecoder("utf-8");
    if (u8[0] !== 4 || u8[1] !== 8) throw new Error("Pas un fichier Marshal 4.8");
    p = 2;
    function byte() { return u8[p++]; }
    function int() {
      var c = (byte() << 24) >> 24;
      if (c === 0) return 0;
      if (c > 0) { if (c > 4) return c - 5; var n = 0; for (var i = 0; i < c; i++) n |= byte() << (8 * i); return n >>> 0; }
      if (c < -4) return c + 5;
      c = -c; var m = -1;
      for (var j = 0; j < c; j++) { m &= ~(0xff << (8 * j)); m |= byte() << (8 * j); }
      return m;
    }
    function bytes() { var n = int(); var s = u8.subarray(p, p + n); p += n; return s; }
    function str() { return dec.decode(bytes()); }
    function sym() { var s = str(); syms.push(s); return s; }
    function readSymOnly() {
      var t = String.fromCharCode(byte());
      if (t === ":") return sym();
      if (t === ";") return syms[int()];
      throw new Error("symbole attendu, reçu " + t + " @" + p);
    }
    function reg(v) { objs.push(v); return objs.length - 1; }
    function read() {
      var t = String.fromCharCode(byte()), v, idx, n, i;
      switch (t) {
        case "0": return null;
        case "T": return true;
        case "F": return false;
        case "i": return int();
        case ":": return sym();
        case ";": return syms[int()];
        case "@": return objs[int()];
        case "I": v = read(); n = int(); for (i = 0; i < n; i++) { readSymOnly(); read(); } return v;
        case "\"": v = str(); reg(v); return v;
        case "f": v = str(); v = v === "inf" ? Infinity : v === "-inf" ? -Infinity : v === "nan" ? NaN : parseFloat(v); reg(v); return v;
        case "l": { var sign = String.fromCharCode(byte()); n = int() * 2; var num = 0, mul = 1; for (i = 0; i < n; i++) { num += byte() * mul; mul *= 256; } v = sign === "-" ? -num : num; reg(v); return v; }
        case "[": v = []; reg(v); n = int(); for (i = 0; i < n; i++) v.push(read()); return v;
        case "{": case "}": v = { __hash: [] }; reg(v); n = int(); for (i = 0; i < n; i++) { var k = read(); v.__hash.push([k, read()]); } if (t === "}") v.__default = read(); return v;
        case "o": v = { __class: readSymOnly() }; reg(v); n = int(); for (i = 0; i < n; i++) { var key = readSymOnly(); v[key] = read(); } return v;
        case "S": v = { __class: readSymOnly(), __struct: true }; reg(v); n = int(); for (i = 0; i < n; i++) { var sk = readSymOnly(); v[sk] = read(); } return v;
        case "u": v = { __class: readSymOnly(), __dump: bytes() }; reg(v); return v;
        case "U": v = { __class: readSymOnly() }; idx = reg(v); v.__data = read(); return v;
        case "e": readSymOnly(); return read();
        case "C": readSymOnly(); return read();
        case "c": case "m": case "M": v = { __classref: str() }; reg(v); return v;
        case "/": v = { __regexp: str() }; byte(); reg(v); return v;
        case "d": v = { __class: readSymOnly() }; reg(v); v.__data = read(); return v;
        default: throw new Error("type Marshal inconnu '" + t + "' @" + (p - 1));
      }
    }
    return read();
  }
  function hget(h, key) {
    if (!h || !h.__hash) return undefined;
    for (var i = 0; i < h.__hash.length; i++) if (h.__hash[i][0] === key) return h.__hash[i][1];
    return undefined;
  }
  var api = { parse: parse, hget: hget };
  if (typeof module !== "undefined") module.exports = api; else root.RubyMarshal = api;
})(this);
