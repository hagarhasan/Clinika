'use strict';
const express = require('express');
const multer = require('multer');
const settings = require('../config');
const { HttpError, ValidationError } = require('../errors');
const { update } = require('../db');
const { ah, auth, requireRoles } = require('../middleware/auth');
const { userOut } = require('../repo');
const { uploadImage } = require('../services/storage');

const router = express.Router();
const LIMIT = settings.MAX_UPLOAD_MB * 1024 * 1024;
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMIT, files: 1 } }).single('file');

const readFile = (req, res) =>
  new Promise((resolve, reject) => {
    parser(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return reject(new HttpError(413, `Image is larger than ${settings.MAX_UPLOAD_MB} MB`));
        return reject(new ValidationError([{ type: 'value_error', loc: ['body', 'file'], msg: err.message }]));
      }
      if (!req.file) return reject(new ValidationError([{ type: 'missing', loc: ['body', 'file'], msg: 'Field required', input: null }]));
      resolve(req.file.buffer);
    });
  });

router.post('/avatar', auth, ah(async (req, res) => {
  const result = await uploadImage(await readFile(req, res), `clinika/avatars/${req.user.role}`);
  const user = await update('users', req.user.id, { avatar_url: result.url });
  res.json(userOut(user));
}));

router.post('/image', requireRoles('admin'), ah(async (req, res) => {
  res.json(await uploadImage(await readFile(req, res), 'clinika/clinics'));
}));

module.exports = router;
