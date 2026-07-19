const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
  if (reqUrl.includes('/api/bills')) {
    originalFetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: reqUrl,
        method: args[1]?.method || 'GET',
        status: 'pending',
        bodyText: args[1]?.body ? (typeof args[1].body === 'string' ? args[1].body.substring(0, 100) : 'not-string') : 'none'
      })
    });
  }
  const res = await originalFetch.apply(this, args);
  if (reqUrl.includes('/api/bills')) {
    originalFetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: reqUrl,
        method: args[1]?.method || 'GET',
        status: res.status,
        ok: res.ok
      })
    });
  }
  return res;
};
