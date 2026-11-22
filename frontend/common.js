// Shared API helper. The browser sends the HTTP-only session cookie automatically.
window.fitfind = {
  async api(path, options = {}) {
    let response;
    try {
      response = await fetch('/api' + path, {
        ...options, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-FitFind-Request': '1', ...options.headers },
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new Error('Could not reach FitFind. Check your connection and try again.');
    }
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'The request could not be completed.');
      error.status = response.status;
      throw error;
    }
    return data;
  },
  // Never insert user or API text as HTML.
  element(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  },
  image(url, title) {
    const image = document.createElement('img');
    image.alt = title;
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    if (url && url.startsWith('https://')) image.src = url;
    else image.hidden = true;
    image.addEventListener('error', () => { image.hidden = true; });
    return image;
  }
};

async function showUser() {
  let user;
  let failed = false;
  try { user = (await fitfind.api('/auth/me')).user; }
  catch (error) { failed = error.status !== 401; }
  const link = document.getElementById('account-link');
  if (link) {
    link.textContent = user ? 'Logout' : 'Login';
    link.href = user ? '../logout/logout.html' : '../login/login.html';
  }
  const name = document.getElementById('profile-name');
  if (name) {
    name.textContent = user ? user.name : 'Style Explorer';
    document.getElementById('profile-email').textContent = user ? user.email :
      (failed ? 'Could not load your profile. Please refresh to retry.' : 'Log in to see your details here.');
  }
  return user;
}
fitfind.userReady = showUser();
window.addEventListener('pageshow', event => {
  if (event.persisted) window.location.reload();
});
