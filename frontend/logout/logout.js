document.getElementById('logout-button').addEventListener('click', async function () {
  this.disabled = true;
  try {
    await fitfind.api('/auth/logout', { method: 'POST', body: '{}' });
    document.getElementById('logout-title').textContent = 'You are logged out';
    document.getElementById('logout-message').textContent = 'Thanks for visiting FitFind. See you again soon!';
    this.hidden = true;
    await showUser();
  } catch (error) { document.getElementById('logout-message').textContent = error.message; }
  finally { this.disabled = false; }
});
