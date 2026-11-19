'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.RESEND_API_KEY = 're_test';
process.env.RESEND_TEMPLATE_RESET = 'tpl-reset';
process.env.RESEND_TEMPLATE_DOCTOR_REJECTED = 'tpl-rejected';
process.env.FRONTEND_URL = 'https://example.github.io/Clinika';
const email = require('../src/services/email');

function mockFetch(handler) {
  const calls = [];
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    calls.push(body);
    return handler(body, calls.length);
  };
  return calls;
}
const ok = () => ({ status: 200, text: async () => '' });
const fail = () => ({ status: 422, text: async () => 'template not found' });

test('reset email uses the Resend template with variables', async () => {
  const calls = mockFetch(ok);
  assert.equal(await email.sendPasswordResetEmail('a@b.com', 'Hagar', 'TOKEN123', 15), true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].template, {
    id: 'tpl-reset',
    variables: { NAME: 'Hagar', RESET_LINK: 'https://example.github.io/Clinika/reset-password?token=TOKEN123', EXPIRES_MINUTES: '15' },
  });
  assert.equal(calls[0].html, undefined); // مينفعش html مع template
  assert.ok(calls[0].subject);
});

test('invite email has no template configured → built-in HTML', async () => {
  const calls = mockFetch(ok);
  await email.sendPasswordResetEmail('a@b.com', 'Hagar', 'TOKEN123', 60, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].template, undefined);
  assert.match(calls[0].html, /reset-password\?token=TOKEN123/);
});

test('template failure falls back to built-in HTML', async () => {
  const calls = mockFetch((_b, n) => (n === 1 ? fail() : ok()));
  const warn = console.warn; const err = console.error;
  console.warn = () => {}; console.error = () => {};
  const res = await email.sendPasswordResetEmail('a@b.com', 'Hagar', 'T', 15);
  console.warn = warn; console.error = err;
  assert.equal(res, true);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].template);
  assert.ok(calls[1].html && !calls[1].template);
});

test('empty variables become "-" (Resend rejects empty ones)', async () => {
  const calls = mockFetch(ok);
  await email.sendDoctorDecisionEmail('d@b.com', 'Omar', false, '');
  assert.equal(calls[0].template.id, 'tpl-rejected');
  assert.deepEqual(calls[0].template.variables, { NAME: 'Omar', REASON: '-' });
});

test('approved decision has no template → HTML', async () => {
  const calls = mockFetch(ok);
  await email.sendDoctorDecisionEmail('d@b.com', 'Omar', true);
  assert.equal(calls[0].template, undefined);
  assert.match(calls[0].html, /approved/i);
});
