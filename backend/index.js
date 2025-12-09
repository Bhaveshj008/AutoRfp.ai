// index.js
require('dotenv').config();
const app = require('./src/app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`AutoRFP backend listening on port ${port}`);
});
