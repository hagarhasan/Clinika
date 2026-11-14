'use strict';

class HttpError extends Error {
  constructor(status, detail, headers) {
    super(typeof detail === 'string' ? detail : 'HTTP error');
    this.status = status;
    this.detail = detail;
    this.headers = headers || null;
  }
}

class ValidationError extends Error {
  constructor(detail) {
    super('Validation error');
    this.status = 422;
    this.detail = detail;
  }
}

const valueError = (msg, loc = ['body']) =>
  new ValidationError([{ type: 'value_error', loc, msg: `Value error, ${msg}` }]);

module.exports = { HttpError, ValidationError, valueError };
