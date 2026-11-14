'use strict';

const { ValidationError } = require('../errors');
const { isValidDate } = require('./time');

class Q {
  constructor(src, loc = 'query') {
    this.src = src || {};
    this.loc = loc;
    this.errors = [];
  }
  _raw(name, o) {
    const v = this.src[(o && o.alias) || name];
    return Array.isArray(v) ? v[v.length - 1] : v;
  }
  _err(name, o, type, msg, input) {
    this.errors.push({ type, loc: [this.loc, (o && o.alias) || name], msg, input });
  }
  _absent(name, o, v) {
    if (v === undefined || v === '') {
      if (o && o.required) this._err(name, o, 'missing', 'Field required', null);
      return true;
    }
    return false;
  }
  _def(o) {
    return o && o.def !== undefined ? o.def : null;
  }
  str(name, o = {}) {
    const v = this._raw(name, o);
    if (this._absent(name, o, v)) return this._def(o);
    if (typeof v !== 'string') {
      this._err(name, o, 'string_type', 'Input should be a valid string', v);
      return null;
    }
    if (o.min !== undefined && v.length < o.min)
      this._err(name, o, 'string_too_short', `String should have at least ${o.min} characters`, v);
    if (o.max !== undefined && v.length > o.max)
      this._err(name, o, 'string_too_long', `String should have at most ${o.max} characters`, v);
    return v;
  }
  int(name, o = {}) {
    const v = this._raw(name, o);
    if (this._absent(name, o, v)) return this._def(o);
    if (!/^-?\d+$/.test(String(v).trim())) {
      this._err(name, o, 'int_parsing', 'Input should be a valid integer, unable to parse string as an integer', v);
      return null;
    }
    const n = parseInt(v, 10);
    if (o.ge !== undefined && n < o.ge) this._err(name, o, 'greater_than_equal', `Input should be greater than or equal to ${o.ge}`, v);
    if (o.le !== undefined && n > o.le) this._err(name, o, 'less_than_equal', `Input should be less than or equal to ${o.le}`, v);
    return n;
  }
  float(name, o = {}) {
    const v = this._raw(name, o);
    if (this._absent(name, o, v)) return this._def(o);
    const n = Number(v);
    if (String(v).trim() === '' || Number.isNaN(n)) {
      this._err(name, o, 'float_parsing', 'Input should be a valid number, unable to parse string as a number', v);
      return null;
    }
    if (o.ge !== undefined && n < o.ge) this._err(name, o, 'greater_than_equal', `Input should be greater than or equal to ${o.ge}`, v);
    if (o.le !== undefined && n > o.le) this._err(name, o, 'less_than_equal', `Input should be less than or equal to ${o.le}`, v);
    return n;
  }
  bool(name, o = {}) {
    const v = this._raw(name, o);
    if (this._absent(name, o, v)) return this._def(o);
    const s = String(v).trim().toLowerCase();
    if (['true', '1', 't', 'yes', 'y', 'on'].includes(s)) return true;
    if (['false', '0', 'f', 'no', 'n', 'off'].includes(s)) return false;
    this._err(name, o, 'bool_parsing', 'Input should be a valid boolean, unable to interpret input', v);
    return null;
  }
  date(name, o = {}) {
    const v = this._raw(name, o);
    if (this._absent(name, o, v)) return this._def(o);
    if (!isValidDate(String(v))) {
      this._err(name, o, 'date_from_datetime_parsing', 'Input should be a valid date or datetime, invalid date format', v);
      return null;
    }
    return String(v);
  }
  enum(name, values, o = {}) {
    const v = this._raw(name, o);
    if (this._absent(name, o, v)) return this._def(o);
    if (!values.includes(v)) {
      this._err(name, o, 'literal_error', `Input should be ${values.map((x) => `'${x}'`).join(' or ')}`, v);
      return null;
    }
    return v;
  }
  list(name, kind = 'str') {
    let v = this.src[name];
    if (v === undefined || v === '') return null;
    if (!Array.isArray(v)) v = [v];
    const out = [];
    for (const x of v) {
      if (kind === 'int') {
        if (!/^-?\d+$/.test(String(x).trim())) {
          this._err(name, {}, 'int_parsing', 'Input should be a valid integer, unable to parse string as an integer', x);
          continue;
        }
        out.push(parseInt(x, 10));
      } else out.push(String(x));
    }
    return out;
  }
  done() {
    if (this.errors.length) throw new ValidationError(this.errors);
  }
}

const query = (req) => new Q(req.query, 'query');

function pathInt(req, name) {
  const v = req.params[name];
  if (!/^\d+$/.test(String(v))) {
    throw new ValidationError([
      { type: 'int_parsing', loc: ['path', name], msg: 'Input should be a valid integer, unable to parse string as an integer', input: v },
    ]);
  }
  return parseInt(v, 10);
}

module.exports = { Q, query, pathInt };
