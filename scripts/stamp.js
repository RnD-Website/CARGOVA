/**
 * Cache-busting: after every build, stamp index.html's bundle/CSS URLs with a fresh
 * version (?v=<build time>) so browsers always load the latest deploy.
 */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'index.html');
const v = Date.now().toString(36);
const html = fs.readFileSync(file, 'utf8')
  .replace(/dist\/cargova\.css(\?v=[\w]+)?/g, `dist/cargova.css?v=${v}`)
  .replace(/dist\/cargova\.bundle\.js(\?v=[\w]+)?/g, `dist/cargova.bundle.js?v=${v}`);
fs.writeFileSync(file, html);
console.log('stamped index.html with v=' + v);
