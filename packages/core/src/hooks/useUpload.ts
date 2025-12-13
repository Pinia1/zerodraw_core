import { useState } from 'react';
import { generateUUID } from '../utils/drawing';
import imageManager from '../utils/imageManager';

interface UseUploadOptions {
  onSuccess: ({ id, url }: { id: string; url: string }) => void;
  onError: (error: Error) => void;
  onComplete: (result: PromiseSettledResult<{ id: string; url: string }>[]) => void;
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
      input.onchange = async () => {
        const files = input.files;

        if (files && files.length > 0) {
          setLoading(true);
          Promise.allSettled(
            Array.from(files).map(async (file) => {
              try {
                const id = generateUUID();
                const url = URL.createObjectURL(file);
                imageManager.saveImage(id, await file.arrayBuffer());
                onSuccess?.({ id, url });
                return { id, url };
              } catch (error) {
                onError?.(error as Error);
                return { id: '', url: '' };
              }
            })
          )
            .then((r) => {
              onComplete?.(r);
            })
            .finally(() => {
              resolve(null);
              setLoading(false);
            });
        } else {
          resolve(null);
          setLoading(false);
        }
      };
      input.click();
      requestAnimationFrame(() => {
        input.remove();
        document.body.removeChild(input);
      });
    });
  };

  return {
    loading,
    run,
  };
};

export default useUpload;
