const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');

function loadEnvironment({
  filePath = path.resolve(__dirname, '..', '.env'),
  environment = process.env,
} = {}) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const parsed = parseEnv(fs.readFileSync(filePath, 'utf8'));
  for (const [name, value] of Object.entries(parsed)) {
    const existing = environment[name];
    if (typeof existing !== 'string' || existing.trim() === '') {
      environment[name] = value;
    }
  }
  return true;
}

module.exports = { loadEnvironment };
