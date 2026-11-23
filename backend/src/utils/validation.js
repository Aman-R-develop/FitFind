function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function bodyFields(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Send a JSON object.');
  if (Object.keys(body).some(key => !allowed.includes(key))) fail('The request contains an unsupported field.');
}

function text(value, label, min, max) {
  if (typeof value !== 'string') fail(`${label} must be text.`);
  const result = value.trim();
  if (result.length < min || result.length > max) fail(`${label} must be ${min}-${max} characters.`);
  return result;
}

function email(value) {
  const result = text(value, 'Email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Enter a valid email address.');
  return result;
}

function password(value) {
  // bcrypt processes at most 72 bytes. Reject longer passwords instead of truncating.
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value) > 72) fail('Password must have at least 12 characters and at most 72 UTF-8 bytes.');
  return value;
}

function httpsUrl(value, label) {
  if (value === '') return '';
  const result = text(value, label, 1, 2000);
  let url;
  try { url = new URL(result); } catch { fail(`${label} must be a valid HTTPS URL.`); }
  if (url.protocol !== 'https:' || url.username || url.password) fail(`${label} must use HTTPS without credentials.`);
  return result;
}

function savedItem(body, partial = false) {
  bodyFields(body, ['title', 'notes', 'imageUrl', 'productUrl']);
  if (partial && !Object.keys(body).length) fail('Send at least one field to update.');
  const result = {};
  if (!partial || body.title !== undefined) result.title = text(body.title, 'Title', 2, 100);
  if (!partial || body.notes !== undefined) result.notes = text(body.notes ?? '', 'Notes', 0, 1000);
  if (!partial || body.imageUrl !== undefined) result.imageUrl = httpsUrl(body.imageUrl ?? '', 'Image URL');
  if (!partial || body.productUrl !== undefined) result.productUrl = httpsUrl(body.productUrl ?? '', 'Product URL');
  return result;
}

function pagination(query) {
  const parse = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > max) fail('Invalid pagination. Use page >= 1 and limit between 1 and 50.');
    return Number(value);
  };
  return { page: parse(query.page, 1, 100000), limit: parse(query.limit, 12, 50) };
}

module.exports = { fail, bodyFields, text, email, password, httpsUrl, savedItem, pagination };
