'use strict';
// بيولّد src/openapi.json من كود الـ routes والـ schemas (Swagger /docs).
// شغّليه بعد أي تعديل في الـ endpoints:   npm run docs:build
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MOUNT = {
  auth: ['/auth', 'Auth'], specialties: ['/specialties', 'Specialties'], clinics: ['/clinics', 'Clinics'],
  doctors: ['/doctors', 'Doctors'], patients: ['/patients', 'Patients'], appointments: ['/appointments', 'Appointments'],
  medicalRecords: ['/medical-records', 'Medical Records'], prescriptions: ['/prescriptions', 'Prescriptions'],
  notifications: ['/notifications', 'Notifications'], reviews: ['/reviews', 'Reviews'], admin: ['/admin', 'Admin'],
  uploads: ['/uploads', 'Uploads'], internal: ['/internal', 'Internal'], public: ['', 'Public'],
};

// ---------- helpers ----------
function splitTop(text, sep = ',') {
  const out = [];
  let depth = 0, cur = '', quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { cur += ch; if (ch === quote && text[i - 1] !== '\\') quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}
function matchBrace(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

// ---------- zod schemas (schemas.js) → JSON schema ----------
const schemaSrc = fs.readFileSync(path.join(ROOT, 'schemas.js'), 'utf8');
const plainObjects = {}; // nameFields, profileFields, clinicFields
const named = {}; // z.object schemas

function fieldSchema(expr) {
  const e = expr.replace(/\s+/g, ' ').trim();
  const nullable = /\.(nullish|nullable)\(/.test(e);
  const required = !/\.(nullish|optional|default)\(/.test(e);
  let s;
  const num = (re) => { const m = re.exec(e); return m ? Number(m[1]) : undefined; };
  if (/^zint\b/.test(e)) s = { type: 'integer' };
  else if (/^znum\b/.test(e)) s = { type: 'number' };
  else if (/^zdate\b/.test(e)) s = { type: 'string', format: 'date', example: '2026-11-20' };
  else if (/^ztime\b/.test(e)) s = { type: 'string', format: 'time', example: '10:00:00' };
  else if (/^email\b/.test(e)) s = { type: 'string', format: 'email' };
  else if (/^gender\b/.test(e)) s = { type: 'string', enum: ['male', 'female'] };
  else if (/^bloodType\b/.test(e)) s = { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] };
  else if (/^password\b/.test(e)) s = { type: 'string', minLength: 8, maxLength: 72, format: 'password' };
  else if (/^z\.boolean/.test(e)) s = { type: 'boolean' };
  else if (/^z\.enum\(/.test(e)) s = { type: 'string', enum: [...e.slice(e.indexOf('['), e.indexOf(']') + 1).matchAll(/'([^']+)'/g)].map((m) => m[1]) };
  else if (/^z\.array\(/.test(e)) {
    const inner = /^z\.array\(\s*(?:S\.)?([\w.()]+?)\)/.exec(e);
    s = { type: 'array', items: inner && named[inner[1]] ? { $ref: `#/components/schemas/${inner[1]}` } : { type: 'string' } };
  } else s = { type: 'string' };
  if (s.type === 'string' && !s.format) {
    const min = num(/\.min\((\d+)\)/), max = num(/\.max\((\d+)\)/);
    if (min !== undefined) s.minLength = min;
    if (max !== undefined) s.maxLength = max;
  }
  if (['integer', 'number'].includes(s.type)) {
    const min = num(/\.min\((-?\d+)\)/), max = num(/\.max\((-?\d+)\)/);
    if (min !== undefined) s.minimum = min;
    if (max !== undefined) s.maximum = max;
  }
  const d = /\.default\(([^)]*)\)/.exec(e);
  if (d) { try { s.default = JSON.parse(d[1].replace(/'/g, '"')); } catch (_) { /* ignore */ } }
  if (nullable) s.nullable = true;
  return { schema: s, required };
}

function parseFields(body) {
  const props = {};
  const required = [];
  for (const item of splitTop(body)) {
    if (item.startsWith('...')) {
      const ref = item.slice(3).trim();
      if (plainObjects[ref]) { Object.assign(props, plainObjects[ref].props); required.push(...plainObjects[ref].required); }
      continue;
    }
    const m = /^(\w+)\s*(?::\s*([\s\S]+))?$/.exec(item);
    if (!m) continue;
    const { schema, required: req } = fieldSchema(m[2] === undefined ? m[1] : m[2]);
    props[m[1]] = schema;
    if (req) required.push(m[1]);
  }
  return { props, required };
}

for (const m of schemaSrc.matchAll(/const (\w+) = \{/g)) {
  const open = m.index + m[0].length - 1;
  plainObjects[m[1]] = parseFields(schemaSrc.slice(open + 1, matchBrace(schemaSrc, open)));
}
for (const m of schemaSrc.matchAll(/const (\w+) =\s*(\w+\.extend|z\s*\.object)\(\{/g)) {
  const open = m.index + m[0].length - 1;
  const body = schemaSrc.slice(open + 1, matchBrace(schemaSrc, open));
  const parsed = parseFields(body);
  if (m[2].endsWith('.extend')) {
    const base = named[m[2].split('.')[0]];
    parsed.props = { ...base.props, ...parsed.props };
    parsed.required = [...base.required, ...parsed.required];
  }
  named[m[1]] = parsed;
}
const nameDesc = 'ابعتي full_name، أو first_name + last_name';
const components = {};
for (const [n, { props, required }] of Object.entries(named)) {
  const p = { ...props };
  const req = required.filter((r) => !['full_name', 'first_name', 'last_name'].includes(r));
  const o = { type: 'object', properties: p };
  if (req.length) o.required = [...new Set(req)];
  if (p.full_name || p.first_name) o.description = nameDesc;
  components[n] = o;
}

// ---------- routes ----------
const paths = {};
const tagsSeen = [];
for (const [file, [prefix, tag]] of Object.entries(MOUNT)) {
  const src = fs.readFileSync(path.join(ROOT, 'routes', `${file}.js`), 'utf8');
  if (!tagsSeen.includes(tag)) tagsSeen.push(tag);
  const fileAdmin = /router\.use\(requireRoles\('admin'\)\)/.test(src);
  const re = /router\.(get|post|put|patch|delete)\(\s*'([^']*)'/g;
  const found = [...src.matchAll(re)];
  found.forEach((m, i) => {
    const method = m[1];
    const rel = m[2];
    const full = ((prefix + rel).replace(/\/$/, '') || '/').replace(/:(\w+)/g, '{$1}');
    const end = i + 1 < found.length ? found[i + 1].index : src.length;
    const chunk = src.slice(m.index, end);
    const afterPath = src.slice(m.index + m[0].length, m.index + m[0].length + 300);
    const mwEnd = Math.min(...['ah(', '(req', '(_req'].map((k) => { const x = afterPath.indexOf(k); return x < 0 ? 1e9 : x; }));
    const mw = afterPath.slice(0, mwEnd);

    // وصف من التعليق اللي فوق الـ route
    const before = src.slice(0, m.index).trimEnd().split('\n');
    const comments = [];
    for (let k = before.length - 1; k >= 0 && before[k].trim().startsWith('//'); k--) comments.unshift(before[k].trim().replace(/^\/\/\s?/, ''));
    const description = comments.filter((c) => !c.startsWith('---')).join(' ');

    let roles = null;
    let secured = false;
    if (fileAdmin || /adminOnly/.test(mw)) { roles = ['admin']; secured = true; }
    const rr = /requireRoles\(([^)]*)\)/.exec(mw);
    if (rr) { roles = [...rr[1].matchAll(/'(\w+)'/g)].map((x) => x[1]); secured = true; }
    if (/\bviewer\b/.test(mw)) { roles = ['patient', 'doctor']; secured = true; }
    if (/currentPatient/.test(mw)) { roles = ['patient']; secured = true; }
    if (/currentDoctor/.test(mw)) { roles = ['doctor']; secured = true; }
    if (/\bauth\b/.test(mw) && !roles) secured = true;

    const parameters = [];
    for (const pm of full.matchAll(/\{(\w+)\}/g)) parameters.push({ name: pm[1], in: 'path', required: true, schema: { type: 'integer' } });
    for (const qm of chunk.matchAll(/\bq\.(int|str|bool|float|date|enum|list)\(\s*'(\w+)'(?:\s*,\s*(\[[^\]]*\]))?([^)]*)\)/g)) {
      const [, kind, name, enumList, opts] = qm;
      const schema = { type: { int: 'integer', str: 'string', bool: 'boolean', float: 'number', date: 'string', enum: 'string', list: 'string' }[kind] };
      if (kind === 'date') schema.format = 'date';
      if (kind === 'enum' && enumList) schema.enum = [...enumList.matchAll(/'([^']+)'/g)].map((x) => x[1]);
      if (kind === 'list') { schema.type = 'array'; schema.items = { type: /'int'/.test(opts) ? 'integer' : 'string' }; }
      const g = (k) => { const x = new RegExp(`${k}:\\s*(-?\\d+)`).exec(opts); return x ? Number(x[1]) : undefined; };
      if (g('ge') !== undefined) schema.minimum = g('ge');
      if (g('le') !== undefined) schema.maximum = g('le');
      const d = /def:\s*([^,}\s]+)/.exec(opts);
      if (d && d[1] !== 'null') { try { schema.default = JSON.parse(d[1].replace(/'/g, '"')); } catch (_) { /* ignore */ } }
      if (!parameters.some((p) => p.name === name && p.in === 'query')) {
        parameters.push({ name, in: 'query', required: /required:\s*true/.test(opts), schema });
      }
    }
    // params مستخدمة بدون q.* (مثلًا upload)
    const op = {
      tags: [tag],
      summary: `${method.toUpperCase()} ${full}`,
      ...(description ? { description } : {}),
      parameters,
      responses: {},
    };

    const bodyRef = /parse(?:Body|Named)\(\s*(z\.array\()?\s*S\.(\w+)/.exec(chunk);
    if (/parseBody\(S\.CancelIn/.test(chunk)) {
      op.requestBody = { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelIn' } } } };
    } else if (bodyRef && components[bodyRef[2]]) {
      const ref = { $ref: `#/components/schemas/${bodyRef[2]}` };
      op.requestBody = { required: true, content: { 'application/json': { schema: bodyRef[1] ? { type: 'array', items: ref } : ref } } };
    } else if (/readFile\(/.test(chunk)) {
      op.requestBody = { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } } };
    } else if (full === '/auth/token') {
      op.requestBody = { required: true, content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string', description: 'الإيميل' }, password: { type: 'string', format: 'password' } } } } } };
    }

    const st = /res\.status\((\d+)\)/.exec(chunk);
    const code = st ? st[1] : '200';
    op.responses[code] = { description: code === '204' ? 'No Content' : code === '201' ? 'Created' : 'Successful Response' };
    if (/X-Total-Count/.test(chunk)) op.responses[code].headers = { 'X-Total-Count': { schema: { type: 'integer' }, description: 'العدد الكلي بعد الفلاتر' } };
    if (parameters.some((p) => p.in === 'query') || op.requestBody || /\{/.test(full)) op.responses['422'] = { description: 'Validation Error' };
    if (secured) {
      op.security = [{ OAuth2PasswordBearer: [] }];
      op.responses['401'] = { description: 'Not authenticated' };
      if (roles) { op.responses['403'] = { description: `Allowed roles: ${roles.join(', ')}` }; op.description = `${op.description ? `${op.description}\n\n` : ''}**Roles:** ${roles.join(', ')}`; }
    }
    (paths[full] ||= {})[method] = op;
  });
}

const spec = {
  openapi: '3.0.3',
  info: { title: 'Clinika API', version: '1.0.0', description: 'Clinic Management & Booking Platform — Node.js + Express.\n\nللتجربة: اضغطي **Authorize** واكتبي الإيميل والباسورد (حقل username = الإيميل).' },
  tags: tagsSeen.map((name) => ({ name })),
  paths,
  components: {
    schemas: components,
    securitySchemes: { OAuth2PasswordBearer: { type: 'oauth2', flows: { password: { tokenUrl: '/auth/token', scopes: {} } } } },
  },
};
fs.writeFileSync(path.join(ROOT, 'openapi.json'), JSON.stringify(spec, null, 2));
const ops = Object.values(paths).reduce((a, p) => a + Object.keys(p).length, 0);
console.log(`openapi.json written: ${Object.keys(paths).length} paths, ${ops} operations, ${Object.keys(components).length} schemas`);
