import { useState } from 'react';
import { httpUploadFile } from '@/services/file';

interface UploadResult {
  s3Key: string;
  width: number;
  height: number;
}

interface UseUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: UploadResult[]) => void;
  accept?: string;
  multiple?: boolean;
}

function getImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function useUpload(options?: UseUploadOptions) {
  const { onSuccess, onError, accept, multiple, onComplete } = options ?? {};
  const [loading, setLoading] = useState(false);

  const run = () =>
    new Promise<void>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept ?? 'image/*';
      input.multiple = multiple ?? false;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
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

      input.onchange = async () => {
        window.removeEventListener('focus', checkCancel, true);
        const files = input.files;
        if (!files?.length) {
          setLoading(false);
          cleanup();
          resolve();
          return;
        }

        setLoading(true);
        try {
          const results = await Promise.all(
            Array.from(files).map(async (file) => {
              try {
                const { width, height } = await getImageSize(file);
                const s3Key = await httpUploadFile(file);
                const result = { s3Key, width, height };
                onSuccess?.(result);
                return result;
              } catch (error) {
                onError?.(error as Error);
                return { s3Key: '', width: 0, height: 0 };
              }
            }),
          );
          onComplete?.(results);
        } finally {
          setLoading(false);
          cleanup();
          resolve();
        }
      };

      input.value = '';
      input.click();
    });

  return { loading, run };
}
