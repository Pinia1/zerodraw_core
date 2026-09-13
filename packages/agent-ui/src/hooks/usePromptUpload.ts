import { useState } from 'react';
import { getMediaUrl } from '../media/urls';
import request from '../services';

interface UploadResult {
  id: string;
  url: string;
}

interface UsePromptUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
  onComplete?: (results: UploadResult[]) => void;
  accept?: string;
  multiple?: boolean;
}

async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const key = (await request.post('/api/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })) as string;
  return { id: key, url: getMediaUrl('file', key) };
}

export default function usePromptUpload(options?: UsePromptUploadOptions) {
  const { onSuccess, onError, accept, multiple, onComplete } = options ?? {};
  const [loading, setLoading] = useState(false);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const result = await uploadFile(file);
            onSuccess?.(result);
            return result;
          } catch (error) {
            onError?.(error as Error);
            return { id: '', url: '' };
          }
        }),
      );
      onComplete?.(results);
    } finally {
      setLoading(false);
    }
  };

  const run = async (files?: File[] | FileList) => {
    if (loading) return;
    if (files) return uploadFiles(Array.from(files));

    return new Promise<void>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept ?? 'image/*';
      input.multiple = multiple ?? false;
      input.style.display = 'none';
      document.body.appendChild(input);

      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        input.onchange = null;
        input.remove();
        window.removeEventListener('focus', checkCancel, true);
      };

      const checkCancel = () => {
        setTimeout(() => {
          if (!settled && (!input.files || input.files.length === 0)) {
            setLoading(false);
            cleanup();
            resolve();
          }
        }, 300);
      };

      window.addEventListener('focus', checkCancel, true);

      input.onchange = () => {
        window.removeEventListener('focus', checkCancel, true);
        const picked = input.files;
        if (!picked?.length) {
          setLoading(false);
          cleanup();
          resolve();
          return;
        }
        void uploadFiles(Array.from(picked)).finally(() => {
          cleanup();
          resolve();
        });
      };

      input.value = '';
      input.click();
    });
  };

  return { loading, run };
}
