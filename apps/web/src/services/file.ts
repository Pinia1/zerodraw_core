import request from '.';

/** 上传文件到后端，返回存储 key */
export const httpUploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/api/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
