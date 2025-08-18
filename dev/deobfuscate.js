#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractFunction(code, funcName) {
  const start = code.indexOf(`function ${funcName}`);
  if (start === -1) throw new Error(`Cannot find function ${funcName}`);
  const braceStart = code.indexOf('{', start);
  let i = braceStart + 1;
  let depth = 1;
  while (i < code.length && depth > 0) {
    const ch = code[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  const end = i; // position after closing brace
  return code.slice(start, end);
}

function extractIIFE(code) {
  const idx = code.indexOf('(function');
  if (idx === -1) throw new Error('Cannot find IIFE start');
  // Find the special end marker for this pattern
  const endMarker = '})(_0x5cb0';
  const endIdx = code.indexOf(endMarker, idx);
  if (endIdx === -1) throw new Error('Cannot find IIFE end marker');
  // Include the following ");" after the call
  const tail = code.slice(endIdx);
  const closeIdx = tail.indexOf(');');
  if (closeIdx === -1) throw new Error('Cannot locate IIFE closing );');
  const totalEnd = endIdx + closeIdx + 2;
  return code.slice(idx, totalEnd);
}

function buildDecoderEnv(source) {
  const parts = [];
  parts.push(extractFunction(source, '_0x5cb0'));
  parts.push('\n');
  parts.push(extractFunction(source, '_0x3887'));
  parts.push('\n');
  parts.push(extractIIFE(source));
  parts.push('\n');
  parts.push('globalThis.__decode = function(n){ return _0x3887(n); };');
  const envCode = parts.join('\n');
  const context = vm.createContext({ console });
  vm.runInContext(envCode, context, { timeout: 5000 });
  return (n) => vm.runInContext(`__decode(${n})`, context, { timeout: 5000 });
}

function collectDecoderAliases(src) {
  // Start with the canonical decoder names seen in this obfuscator
  const aliases = new Set(['_0x3887', '_0x5be67e']);

  // 1) 收集直接赋值别名：const A = B;
  let changed = true;
  const assignRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)/g;
  while (changed) {
    changed = false;
    assignRe.lastIndex = 0;
    let m;
    while ((m = assignRe.exec(src))) {
      const lhs = m[1];
      const rhs = m[2];
      if (aliases.has(rhs) && !aliases.has(lhs)) {
        aliases.add(lhs);
        changed = true;
      }
    }
  }

  // 2) 发现包装解码器的简单函数（wrapper），例如：
  //    function _0xNNNN(arg){ return decode(arg); }
  //    const _0xNNNN = function(arg){ return decode(arg); };
  //    const _0xNNNN = (arg) => decode(arg);
  function discoverWrappers() {
    let foundNew = false;

    // 普通函数声明包装
    const fnDeclRe = /function\s+(_0x[0-9a-fA-F]+)\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*return\s+([A-Za-z_$][\w$]*)\s*\(\s*\2\s*\)\s*;\s*\}/g;
    let m1;
    while ((m1 = fnDeclRe.exec(src))) {
      const name = m1[1];
      const target = m1[3];
      if (aliases.has(target) && !aliases.has(name)) {
        aliases.add(name);
        foundNew = true;
      }
    }

    // 函数字面量赋值包装
    const fnExprRe = /(const|let|var)\s+(_0x[0-9a-fA-F]+)\s*=\s*function\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*return\s+([A-Za-z_$][\w$]*)\s*\(\s*\3\s*\)\s*;\s*\}\s*;?/g;
    let m2;
    while ((m2 = fnExprRe.exec(src))) {
      const name = m2[2];
      const target = m2[4];
      if (aliases.has(target) && !aliases.has(name)) {
        aliases.add(name);
        foundNew = true;
      }
    }

    // 箭头函数包装（带括号的参数）
    const arrowRe = /(const|let|var)\s+(_0x[0-9a-fA-F]+)\s*=\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(\s*\3\s*\)\s*;?/g;
    let m3;
    while ((m3 = arrowRe.exec(src))) {
      const name = m3[2];
      const target = m3[4];
      if (aliases.has(target) && !aliases.has(name)) {
        aliases.add(name);
        foundNew = true;
      }
    }

    // 箭头函数包装（无括号的单参数）
    const arrowBareRe = /(const|let|var)\s+(_0x[0-9a-fA-F]+)\s*=\s*([A-Za-z_$][\w$]*)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(\s*\3\s*\)\s*;?/g;
    let m4;
    while ((m4 = arrowBareRe.exec(src))) {
      const name = m4[2];
      const target = m4[4];
      if (aliases.has(target) && !aliases.has(name)) {
        aliases.add(name);
        foundNew = true;
      }
    }

    return foundNew;
  }

  // 迭代发现所有 wrapper 别名
  let discovered = true;
  while (discovered) {
    discovered = discoverWrappers();
  }

  return aliases;
}

function escapeForRegex(x) {
  return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceDecoderCalls(source, decoder) {
  const aliases = Array.from(collectDecoderAliases(source));
  // Build a single regex to catch any alias call like alias(0x123)
  const pattern = new RegExp(`\\b(${aliases.map(escapeForRegex).join('|')})\\((0x[0-9a-fA-F]+)\\)`, 'g');
  const cache = new Map();
  return source.replace(pattern, (m, fn, hex) => {
    try {
      let val = cache.get(hex);
      if (val === undefined) {
        val = decoder(parseInt(hex));
        val = JSON.stringify(val); // ensure proper escaping
        cache.set(hex, val);
      }
      return val;
    } catch (e) {
      return m;
    }
  });
}

function foldStringConcatsOnce(src) {
  // Merge adjacent double-quoted string literals concatenated with +
  // Matches "..." + "..." while allowing escaped characters
  const re = /"((?:[^"\\]|\\.)*)"\s*\+\s*"((?:[^"\\]|\\.)*)"/g;
  let changed = false;
  const out = src.replace(re, (m, a, b) => {
    try {
      const sa = JSON.parse('"' + a + '"');
      const sb = JSON.parse('"' + b + '"');
      const merged = sa + sb;
      changed = true;
      return JSON.stringify(merged);
    } catch (e) {
      return m;
    }
  });
  return { out, changed };
}

function foldAllStringConcats(src, maxPasses = 10) {
  let s = src;
  for (let i = 0; i < maxPasses; i++) {
    const { out, changed } = foldStringConcatsOnce(s);
    s = out;
    if (!changed) break;
  }
  return s;
}

function bracketToDotNotation(src) {
  // Convert obj["prop"] => obj.prop where prop is a valid identifier
  // 1) Handle chained form: .["prop"] => .prop
  src = src.replace(/\.(?:\s*)\[(?:\s*)(['"])\s*([A-Za-z_$][\w$]*)\s*\1(?:\s*)\]/g, '.$2');
  // 2) Handle base identifier form: obj["prop"] => obj.prop
  const re = /(\b[A-Za-z_$][\w$]*)\s*\[\s*([\'\"])\s*([A-Za-z_$][\w$]*)\s*\2\s*\]/g;
  src = src.replace(re, (m, obj, q, prop) => `${obj}.${prop}`);
  // 3) Handle closing parenthesis followed by ["prop"]: expr()["prop"] => expr().prop
  src = src.replace(/\)\s*\[\s*(["'])\s*([A-Za-z_$][\w$]*)\s*\1\s*\]/g, ').$2');
  // 4) Handle closing bracket followed by ["prop"]: expr]["prop"] => expr].prop
  src = src.replace(/\]\s*\[\s*(["'])\s*([A-Za-z_$][\w$]*)\s*\1\s*\]/g, '].$2');
  return src;
}

function normalizeBooleans(src) {
  // Convert !![] => true and ![] => false (with optional spaces)
  src = src.replace(/!!\s*\[\s*\]/g, 'true');
  src = src.replace(/!\s*\[\s*\]/g, 'false');
  return src;
}

function simplifyDecoderIdentifier(src) {
  // Optionally rename the primary decoder alias to `decode`
  src = src.replace(/const\s+(_0x[0-9a-fA-F]+)\s*=\s*_0x3887\s*;/, 'const decode = _0x3887;');
  // Repoint any direct aliasing to the canonical `decode`
  src = src.replace(/(const|let|var)\s+(_0x[0-9a-fA-F]+)\s*=\s*decode\b/g, '$1 $2 = decode');
  return src;
}

function inlineObjectStringProps(src) {
  // Find patterns like: const _0x406c92 = { key: "value", ... };
  const results = [];
  const declRe = /(?:^|[,\n;]\s*)(?:const\s+)?(_0x[0-9a-fA-F]+)\s*=\s*\{/g;
  let m;
  while ((m = declRe.exec(src))) {
    const name = m[1];
    const objStart = m.index + m[0].length; // position after '{'
    // scan to matching '}' considering nested braces
    let i = objStart;
    let depth = 1;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    const objEnd = i - 1; // position of closing '}'
    const objBody = src.slice(objStart, objEnd);
    // collect string properties key: "..."
    const propRe = /\b([A-Za-z_$][\w$]*)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,?/g;
    const map = new Map();
    let pm;
    while ((pm = propRe.exec(objBody))) {
      const key = pm[1];
      const raw = pm[2];
      // store without evaluating to preserve escapes; we'll use as-is
      map.set(key, raw);
    }
    if (map.size > 0) {
      results.push({ name, map });
    }
    // continue search after this object literal
    declRe.lastIndex = objEnd + 1;
  }

  let out = src;
  for (const { name, map } of results) {
    for (const [key, raw] of map.entries()) {
      // Replace dot notation: name.key -> raw
      const dotRe = new RegExp(`\\b${escapeForRegex(name)}\\s*\\.\\s*${escapeForRegex(key)}\\b`, 'g');
      out = out.replace(dotRe, raw);
      // Replace bracket notation: name["key"] -> raw
      const brRe = new RegExp(`\\b${escapeForRegex(name)}\\s*\\[\\s*(['"])${escapeForRegex(key)}\\1\\s*\\]`, 'g');
      out = out.replace(brRe, raw);
    }
  }
  return out;
}

function inlineObjectFunctionCallsRecursive(src) {
  // Handle nested object { key: function(...) { return ... } } pattern inlining with arg substitution
  function splitTopLevelArgs(s) {
    const args = [];
    let cur = '';
    let depthParen = 0, depthBrace = 0, depthBracket = 0;
    let quote = null; // ' or "
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (quote) {
        cur += ch;
        if (ch === '\\') {
          // escape next char
          i++;
          if (i < s.length) cur += s[i];
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        cur += ch;
        continue;
      }
      if (ch === '(') depthParen++;
      else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
      else if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
      if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        args.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim().length) args.push(cur.trim());
    return args;
  }

  const results = [];
  const declRe = /(?:^|[,\n;]\s*)(?:const\s+)?(_0x[0-9a-fA-F]+)\s*=\s*\{/g;
  let m;
  while ((m = declRe.exec(src))) {
    const name = m[1];
    const objStart = m.index + m[0].length; // position after '{'
    // scan to matching '}' considering nested braces
    let i = objStart;
    let depth = 1;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    const objEnd = i - 1; // position of closing '}'
    const objBody = src.slice(objStart, objEnd);
    // collect function properties key: function(p1, p2) { return expr }
    const funcRe = /\b([A-Za-z_$][\w$]*)\s*:\s*function\s*\(([^)]*)\)\s*\{\s*return\s+([\s\S]+?)\s*;\s*\}/g;
    const map = new Map();
    let fm;
    while ((fm = funcRe.exec(objBody))) {
      const key = fm[1];
      const params = fm[2].split(',').map(s => s.trim()).filter(Boolean);
      const returnExpr = fm[3];
      map.set(key, { params, returnExpr });
    }
    if (map.size > 0) {
      results.push({ name, map });
    }
    // continue search after this object literal
    declRe.lastIndex = objEnd + 1;
  }

  let out = src;
  for (const { name, map } of results) {
    for (const [key, info] of map.entries()) {
      const { params, returnExpr } = info;
      // Replace function call: name.key(args) -> returnExpr with args substituted
      const callRe = new RegExp(`\\b${escapeForRegex(name)}\\.${escapeForRegex(key)}\\s*\\(([^)]*)\\)`, 'g');
      out = out.replace(callRe, (m, argsStr) => {
        let expr = returnExpr;
        if (params.length > 0 && argsStr.trim().length) {
          const args = splitTopLevelArgs(argsStr);
          params.forEach((p, idx) => {
            const a = (idx < args.length ? args[idx] : '').trim();
            if (p) {
              const pre = new RegExp(`\\b${escapeForRegex(p)}\\b`, 'g');
              expr = expr.replace(pre, a);
            }
          });
        }
        // Wrap to preserve operator precedence
        return `(${expr})`;
      });
    }
  }
  return out;
}

function repairAccidentalNullWindowVar(source) {
  const marker = 'const createWindow';
  const idx = source.indexOf(marker);
  if (idx === -1) return source;
  // find the first '{' after marker
  const braceIdx = source.indexOf('{', idx);
  if (braceIdx === -1) return source;
  // match braces to find function end
  let depth = 0;
  let end = -1;
  for (let i = braceIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return source;
  const head = source.slice(0, braceIdx + 1);
  let body = source.slice(braceIdx + 1, end);
  const tail = source.slice(end);

  // Only act if suspicious patterns exist
  if (!/null\s*=\s*new\s+BrowserWindow|null\s*\.(?:setMenu|webContents)/.test(body)) {
    return source;
  }

  const varName = '__mainWindow';
  // ensure a declaration exists at top of body
  if (!new RegExp(`\\b${varName}\\b`).test(body)) {
    body = `\n  let ${varName};\n` + body;
  }
  // fix assignment and property references
  body = body.replace(/null\s*=\s*new\s+BrowserWindow/g, `${varName} = new BrowserWindow`);
  body = body.replace(/null\s*\./g, `${varName}.`);

  return head + body + tail;
}

function repairIfNullMainWindow(source) {
  // Replace patterns like: if (null) { ... __mainWindow ... } => if (__mainWindow) { ... }
  return source.replace(/if\s*\(\s*null\s*\)/g, 'if (__mainWindow)');
}

function repairSyntaxErrors(source) {
  // Fix common syntax errors that may arise during deobfuscation
  let out = source;
  
  // Fix patterns like: getAllWindows( === ) -> getAllWindows()
  out = out.replace(/(\w+)\(\s*===\s*\)/g, '$1()');
  
  // Fix patterns like: function( === ) -> function()  
  out = out.replace(/(\w+)\s*\(\s*===\s*\)/g, '$1()');
  
  // Fix malformed object access: obj.[prop] -> obj.prop
  out = out.replace(/(\w+)\.\[([^\]]+)\]/g, '$1[$2]');
  
  // Fix double bracket/parentheses: [[prop]] -> [prop], ((args)) -> (args)
  out = out.replace(/\[\[([^\]]+)\]\]/g, '[$1]');
  out = out.replace(/\(\(([^)]+)\)\)/g, '($1)');
  
  return out;
}

function inlineAliasedObjectPropertyValues(source) {
  const objDeclRe = /(?:^|\n)\s*(?:(const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=\s*\{([\s\S]*?)\}\s*;/g;
  const propRe = /(?:["']?)([A-Za-z_$][\w$]*)(?:["']?)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`$]*`|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|true|false|null|([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*\[\s*(["'])([A-Za-z_$][\w$]*)\6\s*\])/gi;
  const map = new Map(); // key: IDENT.prop -> literal string (with quotes/number/etc)
  const edges = []; // alias edges: { from: 'A.x', to: 'B.y' }

  let m;
  while ((m = objDeclRe.exec(source)) !== null) {
    const ident = m[2];
    const body = m[3];
    let pm;
    while ((pm = propRe.exec(body)) !== null) {
      const prop = pm[1];
      const simpleVal = pm[2];
      const aliasIdent1 = pm[3];
      const aliasProp1 = pm[4];
      const aliasIdent2 = pm[5];
      const aliasProp2 = pm[7];
      const key = `${ident}.${prop}`;
      if (simpleVal) {
        if (!map.has(key)) map.set(key, simpleVal);
      } else if (aliasIdent1 && aliasProp1) {
        edges.push({ from: key, to: `${aliasIdent1}.${aliasProp1}` });
      } else if (aliasIdent2 && aliasProp2) {
        edges.push({ from: key, to: `${aliasIdent2}.${aliasProp2}` });
      }
    }
  }

  // propagate aliases up to 10 passes
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const { from, to } of edges) {
      if (!map.has(from) && map.has(to)) {
        map.set(from, map.get(to));
        changed = true;
      }
    }
    if (!changed) break;
  }

  if (map.size === 0) return source;

  // apply replacements
  let out = source;
  for (const [k, v] of map.entries()) {
    const [ident, prop] = k.split('.');
    const dotRe = new RegExp(`\\b${escapeForRegex(ident)}\\s*\\.\\s*${escapeForRegex(prop)}\\b`, 'g');
    out = out.replace(dotRe, v);
    const bracketRe = new RegExp(`\\b${escapeForRegex(ident)}\\s*\\[\\s*(["'])${escapeForRegex(prop)}\\\\1\\s*\\]`, 'g');
    out = out.replace(bracketRe, v);
  }
  return out;
}

function removeFunctionByName(src, name) {
  try {
    const slice = extractFunction(src, name);
    if (slice && slice.length) {
      return src.replace(slice, '');
    }
  } catch (_) {}
  return src;
}

function removeDecoderFunctions(src) {
  // Prefer precise removal using brace-balanced extraction
  src = removeFunctionByName(src, '_0x5cb0');
  src = removeFunctionByName(src, '_0x3887');
  // Remove simple alias declarations
  src = src.replace(/\n\s*(?:const|let|var)\s+_0x[0-9a-fA-F]+\s*=\s*_0x3887\s*;\s*\n/g, '\n');
  src = src.replace(/\n\s*const\s+decode\s*=\s*_0x3887\s*;\s*\n?/g, '\n');
  // Remove any orphaned `return _0x5cb0();` that might remain after slicing
  src = src.replace(/\n\s*return\s+_0x5cb0\(\);\s*\n/g, '\n');
  return src;
}

function removeIIFE(src) {
  try {
    const slice = extractIIFE(src);
    if (slice && slice.length) {
      return src.replace(slice, '');
    }
  } catch (_) {}
  return src;
}

function cleanupDecoderAliases(src) {
  // Remove patterns like: const _0x53ccfb = _0x5be67e,  (keep the trailing const for the next decl)
  src = src.replace(/const\s+_0x[0-9a-fA-F]+\s*=\s*_0x5be67e\s*,\s*/g, 'const ');
  // Remove aliasing to _0x3887 or decode as standalone lines
  src = src.replace(/\n\s*(?:const|let|var)\s+_0x[0-9a-fA-F]+\s*=\s*(?:_0x5be67e|_0x3887|decode)\s*;\s*\n/g, '\n');
  return src;
}

function renameCommonIdentifiers(src) {
  // _0x44787b -> mainWindow
  src = src.replace(/\b_0x44787b\b/g, 'mainWindow');
  // socket_status -> socketStatus
  src = src.replace(/\bsocket_status\b/g, 'socketStatus');
  // UA -> userAgent (only standalone identifier)
  src = src.replace(/\bUA\b/g, 'userAgent');
  return src;
}

function removeObfuscatedObjectDeclarations(src) {
  // Conservatively remove object declarations only if the identifier is not referenced elsewhere
  const declRe = /(\n|^)\s*const\s+(_0x[0-9a-fA-F]+)\s*=\s*\{[\s\S]*?\};/g;
  let out = '';
  let lastIndex = 0;
  let m;
  while ((m = declRe.exec(src))) {
    const start = m.index;
    const end = declRe.lastIndex;
    const name = m[2];
    // Count references of the name in the whole file
    const refRe = new RegExp(`\\b${escapeForRegex(name)}\\b`, 'g');
    const refs = src.match(refRe) || [];
    if (refs.length <= 1) {
      // Safe to remove (only appears in its declaration)
      out += src.slice(lastIndex, start);
      lastIndex = end;
    }
  }
  out += src.slice(lastIndex);
  return out;
}

function cleanupEmptyLines(src) {
  // Remove excessive empty lines
  src = src.replace(/\n\s*\n\s*\n/g, '\n\n');
  // Remove leading/trailing whitespace
  src = src.trim();
  return src;
}

function purgeDecoderTraces(src) {
  // Remove any lines that still reference decoder symbols
  src = src.replace(/^.*\b_0x3887\b.*$/gm, '');
  src = src.replace(/^.*\b_0x5cb0\b.*$/gm, '');
  // Clean up multiple blank lines created by removals
  src = src.replace(/\n{3,}/g, '\n\n');
  return src;
}

function applyDecoderPasses(src, decoder, maxPasses = 8) {
  let out = src;
  for (let i = 0; i < maxPasses; i++) {
    const before = out;
    out = inlineAllDecoderPatterns(out, decoder);
    out = foldAllStringConcats(out);
    out = bracketToDotNotation(out);
    if (out === before) break;
  }
  return out;
}

function main() {
  const inFile = process.argv[2] || path.resolve(__dirname, 'index.readable.js');
  const outFile = process.argv[3] || path.resolve(__dirname, 'index.deobf.js');
  const src = fs.readFileSync(inFile, 'utf8');

  const decoder = buildDecoderEnv(src);
  // Use iterative decoder passes early to aggressively inline
  let out = applyDecoderPasses(src, decoder);
  out = splitMultiDeclarators(out);
  out = inlineObjectStringProps(out);
  out = inlineObjectFunctionCallsRecursive(out);
  out = inlineAliasedObjectPropertyValues(out);
  out = collapseSimpleIdentifierAliases(out);
  out = pruneUnreferencedObjectLiterals(out);
  out = normalizeBooleans(out);
  out = simplifyDecoderIdentifier(out);
  out = repairAccidentalNullWindowVar(out);
  out = repairIfNullMainWindow(out);
  out = repairSyntaxErrors(out);
  // Run decoder passes again after alias collapsing and object inlining
  out = applyDecoderPasses(out, decoder);
  out = cleanupDecoderAliases(out);
  out = renameCommonIdentifiers(out);
  out = removeIIFE(out);
  out = removeDecoderFunctions(out);
  out = purgeDecoderTraces(out);
  out = removeObfuscatedObjectDeclarations(out);
  out = cleanupEmptyLines(out);

  fs.writeFileSync(outFile, out, 'utf8');
  console.log('Deobfuscated written to:', outFile);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

function splitTopLevelCommaSeparated(s) {
  const parts = [];
  let buf = '';
  let depthParen = 0, depthBrace = 0, depthBracket = 0;
  let inSingle = false, inDouble = false, inTemplate = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const prev = s[i - 1];
    if (inSingle) {
      buf += ch;
      if (ch === "'" && prev !== '\\') inSingle = false;
      continue;
    }
    if (inDouble) {
      buf += ch;
      if (ch === '"' && prev !== '\\') inDouble = false;
      continue;
    }
    if (inTemplate) {
      buf += ch;
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (ch === "'") { inSingle = true; buf += ch; continue; }
    if (ch === '"') { inDouble = true; buf += ch; continue; }
    if (ch === '`') { inTemplate = true; buf += ch; continue; }

    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    else if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);

    if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      parts.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function splitMultiDeclarators(src) {
  // 将 const/let/var 的多声明语句拆分成多行，便于后续正则识别对象字面量
  return src.replace(/\b(const|let|var)\b\s+([\s\S]*?);/g, (m, kind, rest) => {
    // 快速判断是否包含逗号且在顶层（保守处理：先拆分，再用 join 生成）
    const decls = splitTopLevelCommaSeparated(rest);
    if (decls.length <= 1) return `${kind} ${rest};`;
    return decls.map(d => `${kind} ${d};`).join('\n');
  });
}

function collapseSimpleIdentifierAliases(source) {
  // Collapse alias chains like: const A = B; const C = A; -> replace A and C with B and remove those declarations
  const aliasDeclRe = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;\s*$/gm;
  const aliases = new Map();
  let m;
  const linesToRemove = [];
  while ((m = aliasDeclRe.exec(source)) !== null) {
    const alias = m[1];
    const target = m[2];
    if (alias !== target) {
      aliases.set(alias, target);
      linesToRemove.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  if (aliases.size === 0) return source;

  // Flatten chains
  function resolve(id) {
    const seen = new Set();
    let cur = id;
    while (aliases.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = aliases.get(cur);
    }
    return cur;
  }
  const flat = new Map();
  for (const [a, b] of aliases.entries()) flat.set(a, resolve(b));

  // Apply replacements
  let out = source;
  for (const [alias, target] of flat.entries()) {
    const re = new RegExp(`\\b${escapeForRegex(alias)}\\b`, 'g');
    out = out.replace(re, target);
  }

  // Remove alias declaration lines (from the updated text, re-scan to ensure safe removal)
  out = out.replace(aliasDeclRe, '');
  // Clean multiple blank lines created
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

function pruneUnreferencedObjectLiterals(source) {
  // Remove object literal declarations that are no longer referenced
  // Only target typical obfuscation identifiers starting with _0x
  const objDeclRe = /(const|let|var)\s+(_0x[0-9a-fA-F]+)\s*=\s*\{[\s\S]*?\}\s*;\s*/g;
  let out = source;
  let changed = false;
  let match;
  const removals = [];
  while ((match = objDeclRe.exec(out)) !== null) {
    const ident = match[2];
    const decl = match[0];
    const before = out;
    // Count occurrences of ident in the whole source
    const re = new RegExp(`\\b${escapeForRegex(ident)}\\b`, 'g');
    const all = out.match(re);
    const count = all ? all.length : 0;
    if (count <= 1) {
      removals.push({ start: match.index, end: match.index + decl.length });
    }
  }
  if (removals.length === 0) return out;
  // Apply removals from end to start to preserve indices
  removals.sort((a, b) => b.start - a.start);
  for (const r of removals) {
    out = out.slice(0, r.start) + out.slice(r.end);
    changed = true;
  }
  if (changed) {
    // collapse multiple blank lines
    out = out.replace(/\n{3,}/g, '\n\n');
  }
  return out;
}

function inlineComplexObjectAccess(source, decoder) {
  // Handle patterns like: obj[decoder(0xHEX)] where decoder returns a string key
  const aliases = Array.from(collectDecoderAliases(source));
  const pattern = new RegExp(
    `\\b(_0x[0-9a-fA-F]+)\\s*\\[\\s*(${aliases.map(escapeForRegex).join('|')})\\s*\\((0x[0-9a-fA-F]+)\\)\\s*\\]`,
    'g'
  );
  const cache = new Map();
  
  return source.replace(pattern, (match, objName, decoderName, hexValue) => {
    try {
      let key = cache.get(hexValue);
      if (key === undefined) {
        key = decoder(parseInt(hexValue));
        cache.set(hexValue, key);
      }
      // Return dot notation if the key is a valid identifier, otherwise bracket notation
      if (/^[A-Za-z_$][\w$]*$/.test(key)) {
        return `${objName}.${key}`;
      } else {
        return `${objName}[${JSON.stringify(key)}]`;
      }
    } catch (e) {
      return match;
    }
  });
}

function inlineAllDecoderPatterns(source, decoder) {
  // First pass: simple decoder calls like _0xdfae8b(0x123)
  source = replaceDecoderCalls(source, decoder);
  
  // Second pass: complex object access like _0x406c92[_0xdfae8b(0x155)]
  source = inlineComplexObjectAccess(source, decoder);
  
  // Third pass: handle chained method calls like obj[decoder(0x123)](args)
  const aliases = Array.from(collectDecoderAliases(source));
  const methodPattern = new RegExp(
    `\\b(_0x[0-9a-fA-F]+)\\s*\\[\\s*(${aliases.map(escapeForRegex).join('|')})\\s*\\((0x[0-9a-fA-F]+)\\)\\s*\\]\\s*\\(`,
    'g'
  );
  const cache = new Map();
  
  source = source.replace(methodPattern, (match, objName, decoderName, hexValue) => {
    try {
      let key = cache.get(hexValue);
      if (key === undefined) {
        key = decoder(parseInt(hexValue));
        cache.set(hexValue, key);
      }
      // Return dot notation method call if the key is a valid identifier
      if (/^[A-Za-z_$][\w$]*$/.test(key)) {
        return `${objName}.${key}(`;
      } else {
        return `${objName}[${JSON.stringify(key)}](`;
      }
    } catch (e) {
      return match;
    }
  });
  
  return source;
}