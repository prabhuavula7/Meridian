const isDebugEnabled = () => {
  if (process.env.REACT_APP_DEBUG_LOGS === 'false') {
    return false;
  }

  if (process.env.REACT_APP_DEBUG_LOGS === 'true') {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
};

const withTimestamp = () => new Date().toISOString();

export const debugLog = (scope, message, data = null) => {
  if (!isDebugEnabled()) {
    return;
  }

  if (data === null) {
    console.log(`[${withTimestamp()}][${scope}] ${message}`);
    return;
  }

  console.log(`[${withTimestamp()}][${scope}] ${message}`, data);
};

export const debugWarn = (scope, message, data = null) => {
  if (!isDebugEnabled()) {
    return;
  }

  if (data === null) {
    console.warn(`[${withTimestamp()}][${scope}] ${message}`);
    return;
  }

  console.warn(`[${withTimestamp()}][${scope}] ${message}`, data);
};

export const debugError = (scope, message, data = null) => {
  if (!isDebugEnabled()) {
    return;
  }

  if (data === null) {
    console.error(`[${withTimestamp()}][${scope}] ${message}`);
    return;
  }

  console.error(`[${withTimestamp()}][${scope}] ${message}`, data);
};
