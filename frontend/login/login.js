const form = document.getElementById('login-form');
const message = document.getElementById('message');
const button = document.getElementById('login-button');
const mode = document.getElementById('mode');
const nameInput = document.getElementById('name');

mode.addEventListener('change', () => {
  const register = mode.value === 'register';
  nameInput.required = register;
  nameInput.disabled = !register;
  document.getElementById('name-field').hidden = !register;
  document.getElementById('password').autocomplete = register ? 'new-password' : 'current-password';
  button.textContent = register ? 'Create account' : 'Log in';
  document.getElementById('continue-link').hidden = true;
  message.textContent = '';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  button.disabled = true;
  document.getElementById('continue-link').hidden = true;
  message.textContent = 'Please wait...';
  const body = {
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value
  };
  if (mode.value === 'register') body.name = nameInput.value.trim();
  try {
    await fitfind.api('/auth/' + mode.value, { method: 'POST', body: JSON.stringify(body) });
    message.textContent = 'You are logged in. Your profile is ready.';
    document.getElementById('password').value = '';
    document.getElementById('continue-link').hidden = false;
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
