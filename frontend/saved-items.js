// My Looks and Favorites share a form and card layout.
const endpoint = document.body.dataset.collection;
const list = document.getElementById('saved-list');
const form = document.getElementById('item-form');
const message = document.getElementById('items-message');
const submit = document.getElementById('save-item');
const cancel = document.getElementById('cancel-edit');
let editingId = '';
let page = 1;
let loading = false;

function resetForm() {
  editingId = '';
  form.reset();
  submit.textContent = 'Save item';
  cancel.hidden = true;
}

function itemCard(item) {
  const card = fitfind.element('article', '', 'look-card');
  card.append(fitfind.image(item.imageUrl, item.title));
  const content = fitfind.element('div');
  content.append(fitfind.element('h3', item.title), fitfind.element('p', item.notes));
  if (item.productUrl && item.productUrl.startsWith('https://')) {
    const link = fitfind.element('a', 'Visit link', 'text-link');
    link.href = item.productUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    content.append(link);
  }
  const actions = fitfind.element('div', '', 'item-actions');
  const edit = fitfind.element('button', 'Edit', 'btn light');
  edit.type = 'button';
  edit.addEventListener('click', () => {
    editingId = item._id;
    for (const field of ['title', 'notes', 'imageUrl', 'productUrl']) form.elements[field].value = item[field] || '';
    submit.textContent = 'Update item';
    cancel.hidden = false;
    form.elements.title.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  const remove = fitfind.element('button', 'Delete', 'btn light');
  remove.type = 'button';
  remove.addEventListener('click', async () => {
    if (!window.confirm('Delete this saved item?')) return;
    remove.disabled = true;
    try {
      await fitfind.api('/' + endpoint + '/' + item._id, { method: 'DELETE' });
      if (editingId === item._id) resetForm();
      message.textContent = 'Item deleted.';
      await loadItems();
    } catch (error) { message.textContent = error.message; }
    finally { remove.disabled = false; }
  });
  actions.append(edit, remove);
  content.append(actions);
  card.append(content);
  return card;
}

async function loadItems() {
  if (loading) return;
  loading = true;
  document.getElementById('previous-page').disabled = true;
  document.getElementById('next-page').disabled = true;
  try {
    const data = await fitfind.api('/' + endpoint + '?page=' + page + '&limit=12');
    if (!data.items.length && page > 1) { page--; loading = false; return loadItems(); }
    list.replaceChildren(...data.items.map(itemCard));
    document.getElementById('empty-message').hidden = data.total > 0;
    document.getElementById('previous-page').disabled = page === 1;
    document.getElementById('next-page').disabled = page * data.limit >= data.total;
    document.getElementById('page-number').textContent = 'Page ' + page;
    form.hidden = false;
  } catch (error) {
    list.replaceChildren();
    form.hidden = true;
    document.getElementById('empty-message').hidden = true;
    document.getElementById('previous-page').disabled = true;
    document.getElementById('next-page').disabled = true;
    message.textContent = error.message;
  } finally {
    loading = false;
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled || !form.reportValidity()) return;
  submit.disabled = true;
  const item = {};
  for (const field of ['title', 'notes', 'imageUrl', 'productUrl']) item[field] = form.elements[field].value.trim();
  try {
    await fitfind.api('/' + endpoint + (editingId ? '/' + editingId : ''), {
      method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(item)
    });
    resetForm();
    message.textContent = 'Item saved.';
    page = 1;
    await loadItems();
  } catch (error) { message.textContent = error.message; }
  finally { submit.disabled = false; }
});
cancel.addEventListener('click', resetForm);
document.getElementById('previous-page').addEventListener('click', () => { page--; loadItems(); });
document.getElementById('next-page').addEventListener('click', () => { page++; loadItems(); });
document.getElementById('refresh-items').addEventListener('click', () => { message.textContent = ''; loadItems(); });
loadItems();
