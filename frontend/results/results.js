const catalog = document.getElementById('catalog');
const catalogMessage = document.getElementById('catalog-message');
const source = document.getElementById('catalog-source');
let loading = false;

async function saveProduct(product, collection, button) {
  button.disabled = true;
  try {
    await fitfind.api('/' + collection, {
      method: 'POST',
      body: JSON.stringify({ title: product.title, imageUrl: product.imageUrl, productUrl: product.productUrl, notes: 'Saved from the sample catalog.' })
    });
    catalogMessage.textContent = collection === 'looks' ? 'Saved to My Looks.' : 'Saved to Favorites.';
  } catch (error) { catalogMessage.textContent = error.message; }
  finally { button.disabled = false; }
}

function productCard(product) {
  const row = fitfind.element('article', '', 'shop-row');
  row.append(fitfind.image(product.imageUrl, product.title));
  const detail = fitfind.element('div');
  detail.append(fitfind.element('strong', product.title), fitfind.element('small', product.store + ' · Sample product'));
  const price = new Intl.NumberFormat('en', { style: 'currency', currency: product.currency }).format(product.price);
  detail.append(fitfind.element('p', price + ' (illustrative)', 'price'));
  const actions = fitfind.element('div', '', 'item-actions');
  for (const [collection, label] of [['looks', 'Save look'], ['favorites', 'Favorite']]) {
    const button = fitfind.element('button', label, 'btn light');
    button.addEventListener('click', () => saveProduct(product, collection, button));
    actions.append(button);
  }
  if (product.productUrl && product.productUrl.startsWith('https://')) {
    const link = fitfind.element('a', 'Visit store', 'text-link');
    link.href = product.productUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    actions.append(link);
  }
  detail.append(actions);
  row.append(detail);
  return row;
}

async function loadProducts() {
  if (loading) return;
  loading = true;
  source.disabled = true;
  catalogMessage.textContent = 'Loading catalog...';
  catalog.replaceChildren();
  try {
    const data = await fitfind.api('/products?source=' + source.value);
    catalog.replaceChildren(...data.products.map(productCard));
    catalogMessage.textContent = data.products.length ? 'Sample catalog loaded. Log in to save items.' : 'No products available.';
  } catch (error) { catalogMessage.textContent = error.message; }
  finally { source.disabled = false; loading = false; }
}
source.addEventListener('change', loadProducts);
document.getElementById('refresh-catalog').addEventListener('click', loadProducts);
loadProducts();
