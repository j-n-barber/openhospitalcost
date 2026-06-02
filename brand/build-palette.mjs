// brand/build-palette.mjs
// Generates openhospitalcost.ase (Adobe Swatch Exchange) for Illustrator.
// Run: node brand/build-palette.mjs
//
// ASE format: "ASEF" + version(1.0) + block count, then blocks.
//   group start (0xC001): nameLen(u16) + UTF-16BE null-terminated name
//   color entry (0x0001): nameLen + name + "RGB " + 3×float32BE (0..1) + type(u16)
//   group end   (0xC002): empty

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const COLORS = [
  ['Ink', '13283A'],
  ['Paper', 'FAF9F6'],
  ['Surface', 'FFFFFF'],
  ['Primary Teal', '1A6B7A'],
  ['Link Teal', '12545F'],
  ['Savings Green', '147A52'],
  ['Higher Red', 'B4433A'],
  ['Border', 'E5E3DD'],
  ['Muted Text', '5B6670'],
  ['Navy (alt primary)', '1B3A5B'],
];

function utf16Name(name) {
  const chars = name.length + 1; // include null terminator
  const buf = Buffer.alloc(chars * 2);
  for (let i = 0; i < name.length; i++) buf.writeUInt16BE(name.charCodeAt(i), i * 2);
  const len = Buffer.alloc(2);
  len.writeUInt16BE(chars, 0);
  return Buffer.concat([len, buf]);
}

function colorBlock(name, hex) {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const vals = Buffer.alloc(12);
  vals.writeFloatBE(r, 0); vals.writeFloatBE(g, 4); vals.writeFloatBE(b, 8);
  const type = Buffer.alloc(2); type.writeUInt16BE(2, 0); // process color
  const data = Buffer.concat([utf16Name(name), Buffer.from('RGB ', 'ascii'), vals, type]);
  const head = Buffer.alloc(6);
  head.writeUInt16BE(0x0001, 0);
  head.writeUInt32BE(data.length, 2);
  return Buffer.concat([head, data]);
}

function groupStart(name) {
  const data = utf16Name(name);
  const head = Buffer.alloc(6);
  head.writeUInt16BE(0xC001, 0);
  head.writeUInt32BE(data.length, 2);
  return Buffer.concat([head, data]);
}
function groupEnd() {
  const head = Buffer.alloc(6);
  head.writeUInt16BE(0xC002, 0);
  head.writeUInt32BE(0, 2);
  return head;
}

const blocks = [groupStart('OpenHospitalCost'), ...COLORS.map((c) => colorBlock(...c)), groupEnd()];
const header = Buffer.alloc(12);
header.write('ASEF', 0, 'ascii');
header.writeUInt16BE(1, 4); // major
header.writeUInt16BE(0, 6); // minor
header.writeUInt32BE(blocks.length, 8);

const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });
const out = `${dir}/openhospitalcost.ase`;
writeFileSync(out, Buffer.concat([header, ...blocks]));
console.log(`Wrote ${out} (${COLORS.length} colors, ${blocks.length} blocks)`);
