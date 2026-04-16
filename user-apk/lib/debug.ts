const DEBUG_PREFIX = "[RealMatkaDebug]";

function isDebugEnabled() {
  return false;
}

export function debugLog(scope: string, message: string, details?: unknown) {
  if (!isDebugEnabled()) {
    return;
  }

  if (details === undefined) {
    console.log(`${DEBUG_PREFIX} ${scope}: ${message}`);
    return;
  }

  console.log(`${DEBUG_PREFIX} ${scope}: ${message}`, details);
}

export function debugError(scope: string, message: string, error: unknown) {
  if (!isDebugEnabled()) {
    return;
  }

  console.error(`${DEBUG_PREFIX} ${scope}: ${message}`, error);
}
