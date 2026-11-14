'use strict';
const app = require('./app');

const port = parseInt(process.env.PORT || '8000', 10);
app.listen(port, () => console.log(`Clinika API listening on http://localhost:${port}`));
