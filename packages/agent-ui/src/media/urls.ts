const getEnv = (key: 'VITE_API_URL' | 'VITE_IMAGE_THUMBNAIL' | 'VITE_IMAGE_FILE') => {
  if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[key]) {
    return (import.meta as ImportMeta & { env?: Record<string, string> }).env![key]!;
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key]!;
  }
  return '';
};

export function getApiBaseUrl(): string {
  return getEnv('VITE_API_URL');
}

export function getMediaUrl(type: 'thumbnail' | 'file', key: string): string {
  const base = getApiBaseUrl();
  const path = type === 'file' ? getEnv('VITE_IMAGE_FILE') || '/api/file/s3' : getEnv('VITE_IMAGE_THUMBNAIL') || '/api/file/thumbnail';
  return `${base}${path}/${key}`;
}
