const AUTH_KEY = "authToken";
const LAST_ACTIVE_KEY = "lastActiveAt";
const AUTH_EVENT = "auth:changed";

const notify = () => {
  // notify same-tab listeners
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const saveToken = (token) => {
  localStorage.setItem(AUTH_KEY, token);
  notify(); // <— tell the app we’re now authenticated
};

export const getToken = () => localStorage.getItem(AUTH_KEY);

export const clearToken = () => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(LAST_ACTIVE_KEY);
  notify(); // <— tell the app we’re now logged out
};

export const touchActivity = () =>
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));

export const getLastActive = () => {
  const v = localStorage.getItem(LAST_ACTIVE_KEY);
  return v ? Number(v) : 0;
};

export const isAuthenticated = () => !!getToken();

export const isIdle = (idleMs) => {
  const last = getLastActive();
  if (!last) return false;
  return Date.now() - last >= idleMs;
};

// Optional: subscribe helper if you ever want it elsewhere
export const onAuthChange = (cb) => {
  const h = () => cb(isAuthenticated());
  window.addEventListener(AUTH_EVENT, h);
  return () => window.removeEventListener(AUTH_EVENT, h);
};
