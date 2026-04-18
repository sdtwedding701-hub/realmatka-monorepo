function serializeError(error) {
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return {
    message: String(error)
  };
}

function writeLog(level, message, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...fields
  };

  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(payload)}\n`);
}

export function createLogger(baseFields = {}) {
  return {
    child(extraFields = {}) {
      return createLogger({ ...baseFields, ...extraFields });
    },
    info(message, fields = {}) {
      writeLog("info", message, { ...baseFields, ...fields });
    },
    warn(message, fields = {}) {
      writeLog("warn", message, { ...baseFields, ...fields });
    },
    error(message, fields = {}) {
      const nextFields = { ...baseFields, ...fields };
      if (nextFields.error) {
        nextFields.error = serializeError(nextFields.error);
      }
      writeLog("error", message, nextFields);
    }
  };
}

export const logger = createLogger({ service: "realmatka-backend" });
