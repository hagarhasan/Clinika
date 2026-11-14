'use strict';
const { ValidationError, valueError } = require('../errors');

function zodToDetail(issues, loc = 'body') {
  return issues.map((i) => {
    let type = 'value_error';
    let msg = i.message;
    switch (i.code) {
      case 'invalid_type':
        if (i.received === 'undefined') {
          type = 'missing';
          msg = 'Field required';
        } else {
          type = 'type_error';
          msg = `Input should be a valid ${i.expected}`;
        }
        break;
      case 'too_small':
        if (i.type === 'string') {
          type = 'string_too_short';
          msg = `String should have at least ${i.minimum} character${i.minimum === 1 ? '' : 's'}`;
        } else if (i.type === 'array') {
          type = 'too_short';
          msg = `List should have at least ${i.minimum} item${i.minimum === 1 ? '' : 's'} after validation`;
        } else {
          type = 'greater_than_equal';
          msg = `Input should be greater than${i.inclusive ? ' or equal to' : ''} ${i.minimum}`;
        }
        break;
      case 'too_big':
        if (i.type === 'string') {
          type = 'string_too_long';
          msg = `String should have at most ${i.maximum} character${i.maximum === 1 ? '' : 's'}`;
        } else if (i.type === 'array') {
          type = 'too_long';
          msg = `List should have at most ${i.maximum} item${i.maximum === 1 ? '' : 's'} after validation`;
        } else {
          type = 'less_than_equal';
          msg = `Input should be less than${i.inclusive ? ' or equal to' : ''} ${i.maximum}`;
        }
        break;
      case 'invalid_string':
        if (i.validation === 'email') msg = 'value is not a valid email address';
        break;
      case 'invalid_enum_value':
        type = 'literal_error';
        msg = `Input should be ${i.options.map((o) => `'${o}'`).join(' or ')}`;
        break;
      default:
    }
    return { type, loc: [loc, ...i.path], msg };
  });
}

function parseBody(schema, data, loc = 'body') {
  const r = schema.safeParse(data === undefined || data === null ? {} : data);
  if (!r.success) throw new ValidationError(zodToDetail(r.error.issues, loc));
  return r.data;
}

function resolveNames(d, required = false) {
  if (d.full_name && !d.first_name && !d.last_name) {
    const parts = String(d.full_name).trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) throw valueError('Please enter first and last name');
    d.first_name = parts[0].slice(0, 70);
    d.last_name = parts.slice(1).join(' ').slice(0, 70);
  }
  if (required && (!d.first_name || !d.last_name)) {
    throw valueError('first_name and last_name (or full_name) are required');
  }
  return d;
}

function parseNamed(schema, data, required) {
  return resolveNames(parseBody(schema, data), required);
}

module.exports = { zodToDetail, parseBody, resolveNames, parseNamed };
