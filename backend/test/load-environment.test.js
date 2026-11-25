const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadEnvironment } = require('../src/load-environment');

test('loads .env values for absent or blank variables without replacing configured values', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hkili-env-test-'));
  const filePath = path.join(directory, '.env');
  const environment = {
    GEMINI_API_KEY: '',
    GEMINI_MODEL: 'deployment-model',
    OTHER_VALUE: '   ',
  };

  try {
    fs.writeFileSync(
      filePath,
      'GEMINI_API_KEY=local-test-key\nGEMINI_MODEL=local-model\nOTHER_VALUE=from-file\n',
      'utf8',
    );

    assert.equal(loadEnvironment({ filePath, environment }), true);
    assert.equal(environment.GEMINI_API_KEY, 'local-test-key');
    assert.equal(environment.GEMINI_MODEL, 'deployment-model');
    assert.equal(environment.OTHER_VALUE, 'from-file');
  } finally {
    fs.unlinkSync(filePath);
    fs.rmdirSync(directory);
  }
});

test('does not fail when an optional .env file is absent', () => {
  assert.equal(
    loadEnvironment({
      filePath: path.join(os.tmpdir(), 'hkili-test-no-such-env-file'),
      environment: {},
    }),
    false,
  );
});
