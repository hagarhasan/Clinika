'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/utils/time');
const { expandDay } = require('../src/utils/slotMath');
const { Q } = require('../src/utils/params');
const { resolveNames, zodToDetail } = require('../src/utils/validate');
const { ValidationError } = require('../src/errors');

test('time helpers', () => {
  assert.equal(T.normTime('9:05'), '09:05:00');
  assert.equal(T.normTime('10:00:00.123'), '10:00:00');
  assert.equal(T.normMinute('10:00:45'), '10:00:00');
  assert.equal(T.hhmm('14:30:00'), '14:30');
  assert.equal(T.isValidTime('24:00'), false);
  assert.equal(T.isValidTime('23:59:59'), true);
});

test('date helpers (weekday: Mon=0 .. Sun=6 like Python)', () => {
  assert.equal(T.weekday('2026-11-13'), 4); // Friday
  assert.equal(T.weekday('2026-11-09'), 0); // Monday
  assert.equal(T.weekday('2026-11-15'), 6); // Sunday
  assert.equal(T.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(T.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(T.diffDays('2026-11-13', '2026-11-01'), 12);
  assert.equal(T.isValidDate('2026-02-30'), false);
  assert.equal(T.isValidDate('2026-02-28'), true);
});

test('nowLocal uses Africa/Cairo', () => {
  T.setNow('2026-11-13T22:30:00Z');
  const n = T.nowLocal();
  assert.equal(n.date, '2026-11-14');
  assert.equal(n.sec, 30 * 60);
  T.setNow(null);
});

const sched = [{ start_time: '10:00:00', end_time: '12:00:00', clinic_id: null }];
const base = { day: '2026-11-16', schedules: sched, booked: new Set(), stepSec: 1800, doctorClinicId: 7, clinicIds: null, cutoff: 0 };

test('expandDay builds slots and falls back to doctor clinic', () => {
  const out = expandDay(base);
  assert.deepEqual(out.map((s) => s.start_time), ['10:00:00', '10:30:00', '11:00:00', '11:30:00']);
  assert.equal(out[3].end_time, '12:00:00');
  assert.ok(out.every((s) => s.clinic_id === 7 && s.is_available));
});

test('expandDay marks booked and drops past slots', () => {
  const cutoff = T.naiveMs('2026-11-16', 10 * 3600 + 45 * 60); // 10:45
  const out = expandDay({ ...base, booked: new Set(['11:30:00']), cutoff });
  assert.deepEqual(out.map((s) => s.start_time), ['11:00:00', '11:30:00']);
  assert.equal(out[1].is_available, false);
});

test('expandDay respects clinic filter and partial last slot', () => {
  assert.equal(expandDay({ ...base, clinicIds: new Set([99]) }).length, 0);
  assert.equal(expandDay({ ...base, clinicIds: new Set([7]) }).length, 4);
  const odd = expandDay({ ...base, schedules: [{ start_time: '10:00:00', end_time: '11:20:00', clinic_id: 3 }] });
  assert.equal(odd.length, 2);
  assert.equal(odd[0].clinic_id, 3);
});

test('query parser mimics FastAPI validation', () => {
  const q = new Q({ limit: '500', date: '2026-13-01', sort: 'bad', verified: 'yes', ids: ['1', '2'] });
  assert.equal(q.int('limit', { def: 20, ge: 1, le: 100 }), 500);
  assert.equal(q.date('date'), null);
  assert.equal(q.enum('sort', ['name', 'fee']), null);
  assert.equal(q.bool('verified'), true);
  assert.deepEqual(q.list('ids', 'int'), [1, 2]);
  assert.equal(q.errors.length, 3);
  assert.throws(() => q.done(), ValidationError);
  const ok = new Q({});
  assert.equal(ok.int('limit', { def: 20 }), 20);
  assert.equal(ok.str('q'), null);
  ok.date('date', { required: true });
  assert.equal(ok.errors[0].type, 'missing');
});

test('resolveNames splits full_name like the old NameMixin', () => {
  const d = resolveNames({ full_name: 'Ahmed Ali Hassan' }, true);
  assert.equal(d.first_name, 'Ahmed');
  assert.equal(d.last_name, 'Ali Hassan');
  assert.throws(() => resolveNames({ full_name: 'Ahmed' }, true), ValidationError);
  assert.throws(() => resolveNames({}, true), ValidationError);
  assert.deepEqual(resolveNames({ phone: '1' }, false), { phone: '1' });
});

test('zodToDetail maps to FastAPI-like shape', () => {
  const [e] = zodToDetail([{ code: 'invalid_type', received: 'undefined', expected: 'string', path: ['email'], message: 'Required' }]);
  assert.deepEqual(e, { type: 'missing', loc: ['body', 'email'], msg: 'Field required' });
});
