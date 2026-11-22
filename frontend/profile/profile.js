const profileMessage = document.getElementById('profile-message');
const preferencesMessage = document.getElementById('preferences-message');
const profileForm = document.getElementById('profile-form');
const preferencesForm = document.getElementById('preferences-form');

async function loadProfile() {
  const user = await fitfind.userReady;
  if (!user) { profileMessage.textContent = 'Log in to edit your profile.'; return; }
  profileForm.hidden = false;
  document.getElementById('edit-name').value = user.name;
  try {
    const data = await fitfind.api('/preferences');
    document.getElementById('style').value = data.preferences.style;
    document.getElementById('stores').value = data.preferences.stores.join(', ');
    preferencesForm.hidden = false;
  } catch (error) { preferencesMessage.textContent = error.message + ' Refresh to retry.'; }
}

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = profileForm.querySelector('button');
  button.disabled = true;
  try {
    const data = await fitfind.api('/auth/me', { method: 'PATCH', body: JSON.stringify({ name: document.getElementById('edit-name').value.trim() }) });
    document.getElementById('profile-name').textContent = data.user.name;
    profileMessage.textContent = 'Name updated.';
  } catch (error) { profileMessage.textContent = error.message; }
  finally { button.disabled = false; }
});

preferencesForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = preferencesForm.querySelector('button');
  button.disabled = true;
  const preferences = {
    style: document.getElementById('style').value.trim(),
    stores: document.getElementById('stores').value.split(',').map(store => store.trim()).filter(Boolean)
  };
  try {
    await fitfind.api('/preferences', { method: 'PUT', body: JSON.stringify(preferences) });
    preferencesMessage.textContent = 'Preferences saved.';
  } catch (error) { preferencesMessage.textContent = error.message; }
  finally { button.disabled = false; }
});
loadProfile();
