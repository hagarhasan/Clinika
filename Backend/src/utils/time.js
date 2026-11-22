'use strict';

const settings = require('../config');

const pad = (n, w = 2) => String(n).padStart(w, '0');

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

function isValidTime(t) {
  const m = TIME_RE.exec(String(t));
  return !!m && +m[1] < 24 && +m[2] < 60 && (m[3] === undefined || +m[3] < 60);
}
function timeToSec(t) {
  const m = TIME_RE.exec(String(t));
  if (!m) throw new Error(`Bad time: ${t}`);
  return +m[1] * 3600 + +m[2] * 60 + (m[3] ? +m[3] : 0);
}
const secToTime = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
const floorMinute = (s) => s - (s % 60);

const normTime = (t) => secToTime(timeToSec(t));

const normMinute = (t) => secToTime(floorMinute(timeToSec(t)));

const hhmm = (t) => normTime(t).slice(0, 5);

function dayMs(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
const addDays = (s, n) => new Date(dayMs(s) + n * 86400000).toISOString().slice(0, 10);

const weekday = (s) => (new Date(dayMs(s)).getUTCDay() + 6) % 7;
const diffDays = (a, b) => Math.round((dayMs(a) - dayMs(b)) / 86400000);
function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(dayMs(s));
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const naiveMs = (dateStr, sec) => dayMs(dateStr) + sec * 1000;

let _fmt;
let _nowOverride = null;

function setNow(d) {
  _nowOverride = d;
}
function nowLocal() {
  if (!_fmt) {
    _fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: settings.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  }
  const parts = _fmt.formatToParts(_nowOverride ? new Date(_nowOverride) : new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  const date = `${g('year')}-${g('month')}-${g('day')}`;
  const sec = +g('hour') * 3600 + +g('minute') * 60 + +g('second');
  return { date, sec, year: +g('year'), ms: dayMs(date) + sec * 1000 };
}

module.exports = {
  pad, isValidTime, timeToSec, secToTime, floorMinute, normTime, normMinute, hhmm,
  dayMs, addDays, weekday, diffDays, isValidDate, naiveMs, nowLocal, setNow,
};
