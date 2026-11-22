'use strict';

const pick = (data, keys) => {
  const o = {};
  for (const k of keys) if (data[k] !== undefined) o[k] = data[k];
  return o;
};
const asNumber = (v) => (v === null || v === undefined ? null : Number(v));
module.exports = { pick, asNumber };
