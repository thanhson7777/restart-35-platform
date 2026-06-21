require('dotenv').config({ path: '.env' });
require('@babel/register')({
  presets: ['@babel/preset-env']
});
const { CONNECT_DB } = require('./src/config/mongodb');
const { fixProgress } = require('./src/scripts/fix_progress.js');

async function run() {
  await CONNECT_DB();
  await fixProgress();
  process.exit(0);
}
run();
