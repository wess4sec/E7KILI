function writeLog(output, level, fields, message) {
  output(
    JSON.stringify({
      ...fields,
      timestamp: new Date().toISOString(),
      level,
      message,
    }),
  );
}

const logger = {
  info(fields, message) {
    writeLog(console.log, 'info', fields, message);
  },
  error(fields, message) {
    writeLog(console.error, 'error', fields, message);
  },
};

module.exports = { logger };
