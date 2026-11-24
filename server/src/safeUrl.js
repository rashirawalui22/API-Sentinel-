const dns = require('dns').promises;
const net = require('net');

function isPrivateAddress(address) {
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
  }
  const parts = address.split('.').map(Number);
  return parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 127 ||
    parts[0] === 169 && parts[1] === 254 ||
    parts[0] === 0;
}

async function validatePublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Monitor URL must be a valid HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) monitor URLs are allowed');
  if (url.username || url.password || url.port) throw new Error('URL credentials and custom ports are not allowed');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) throw new Error('Private addresses are not allowed');
  if (net.isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname)) throw new Error('Private addresses are not allowed');
  } else {
    const addresses = await dns.resolve(url.hostname);
    if (addresses.some(isPrivateAddress)) throw new Error('Private addresses are not allowed');
  }
  return url;
}

module.exports = { validatePublicUrl };
