const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '');

const runtimeBase = `${window.location.protocol}//${window.location.hostname}:5000/api`;

const envBase = import.meta.env.VITE_API_BASE_URL || '';
const envUploadsBase = import.meta.env.VITE_UPLOADS_BASE_URL || '';

export const API_BASE_URL = trimTrailingSlash(
  envBase || runtimeBase
);

export const UPLOADS_BASE_URL = trimTrailingSlash(
  envUploadsBase || API_BASE_URL.replace(/\/api$/i, '')
);
