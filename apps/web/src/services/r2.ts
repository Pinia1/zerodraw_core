import request from '.';

export const httpGetR2PresignUrl = (contentType: string): Promise<{ key: string; uploadUrl: string }> => {
  return request.post('/api/file/r2/presign', { contentType });
};

export const httpUploadToR2 = async (file: File): Promise<string> => {
  const { key, uploadUrl } = await httpGetR2PresignUrl(file.type);
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  return key;
};
