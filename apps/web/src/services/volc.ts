import request from '.';

export const httpUpload = (formData: FormData): Promise<string> => {
  return request.post('/api/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
