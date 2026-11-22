'use strict';
// Swagger UI على /docs  (الـ spec بيتولّد بـ: npm run docs:build)
const express = require('express');
const spec = require('../openapi.json');

const router = express.Router();
const VERSION = '5.17.14';

router.get('/openapi.json', (_req, res) => res.json(spec));

router.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Clinika API — Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      persistAuthorization: true,
      tagsSorter: 'alpha',
      docExpansion: 'none',
    });
  </script>
</body>
</html>`);
});

module.exports = router;
