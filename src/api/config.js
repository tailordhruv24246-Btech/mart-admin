const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '');

const RENDER_API_BASE = 'https://mart-backend-jlfj.onrender.com/api';

const runtimeBase = `${window.location.protocol}//${window.location.hostname}:5000/api`;

const isHosted =
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname);

const envBase = import.meta.env.VITE_API_BASE_URL || '';
const envUploadsBase = import.meta.env.VITE_UPLOADS_BASE_URL || '';

export const API_BASE_URL = trimTrailingSlash(
  isHosted && (!envBase || envBase.includes('localhost'))
    ? RENDER_API_BASE
    : (envBase || runtimeBase)
);

export const UPLOADS_BASE_URL = trimTrailingSlash(
  envUploadsBase || API_BASE_URL.replace(/\/api$/i, '')
);
