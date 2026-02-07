import request from '.';

export const httpUpload = (formData: FormData) => {
  return request.post('/api/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
