import { useState } from 'react';
import { httpUpload } from '../../services/volc';

interface UploadResult {
  s3Key: string;
  width: number;
  height: number;
}
interface UseUploadOptions {
  onSuccess: (result: UploadResult) => void;
  onError: (error: Error) => void;
  onComplete: (result: UploadResult[]) => void;
  accept: string;
  multiple: boolean;
}
const useUpload = (options?: Partial<UseUploadOptions>) => {
  const { onSuccess, onError, accept, multiple, onComplete } = options || {};
  const [loading, setLoading] = useState(false);

  const run = async () => {
    return new Promise(async (resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || 'image/*';
      input.multiple = multiple || false;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      input.style.top = '-9999px';
      document.body.appendChild(input);

      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        try {
          input.onchange = null;
          input.remove();
        } catch {}
        window.removeEventListener('focus', checkCancel, true);
      };

      const checkCancel = () => {
        setTimeout(() => {
          if (!resolved && (!input.files || input.files.length === 0)) {
            setLoading(false);
            cleanup();
            resolve(null);
          }
        }, 300);
      };

      window.addEventListener('focus', checkCancel, true);

      input.onchange = async () => {
        window.removeEventListener('focus', checkCancel, true);
        const files = input.files;
        if (files && files.length > 0) {
          setLoading(true);
          Promise.allSettled(
            Array.from(files).map(async (file) => {
              try {
                const { width, height } = await getImageSize(file);
                const formData = new FormData();
                formData.append('file', file);
                const data = await httpUpload(formData);

                onSuccess?.({
                  s3Key: data,
                  width,
                  height,
                });
                return { s3Key: data, width, height };
              } catch (error) {
                onError?.(error as Error);
                return { s3Key: '', width: 0, height: 0 };
              }
            })
          )
            .then((r) => {
              onComplete?.(
                r.map((item) =>
                  item.status === 'fulfilled' ? item.value : { s3Key: '', width: 0, height: 0 }
                )
              );
            })
            .finally(() => {
              setLoading(false);
              cleanup();
              resolve(null);
            });
        } else {
          setLoading(false);
          cleanup();
          resolve(null);
        }
      };

      input.value = '';
      input.click();
    });
  };

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

  return {
    loading,
    run,
  };
};

export default useUpload;
