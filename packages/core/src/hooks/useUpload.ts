import { generateUUID } from '@zeroDraw/common';
import { useState } from 'react';
import { imageManager } from '..';
import Fetch from '../fetch';

interface UseUploadOptions {
  onSuccess: ({ id, url }: { id: string; url: string }) => void;
  onError: (error: Error) => void;
  onComplete: (result: PromiseSettledResult<{ id: string; url: string }>[]) => void;
  accept: string;
  multiple: boolean;
  local?: boolean;
}
const useUpload = (options?: Partial<UseUploadOptions>) => {
  const { onSuccess, onError, accept, multiple, onComplete, local } = options || {};
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (loading) return;
    return new Promise(async (resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || 'image/*';
      input.multiple = multiple || false;
      input.style.display = 'none';

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

      // iOS 用户取消选择时可能不触发 onchange，通过 focus 事件检测
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
                if (local) {
                  const id = generateUUID();
                  const url = URL.createObjectURL(file);
                  await imageManager.saveImage(
                    id,
                    await file.arrayBuffer(),
                    file.type || undefined
                  );
                  onSuccess?.({ id: id, url: url });
                  return { id: id, url: url };
                }

                const formData = new FormData();
                formData.append('file', file);
                const data = await Fetch.httpUploadImage(formData);
                const url = Fetch.getFileUrl('file', data);

                onSuccess?.({ id: data, url: url });
                return { id: data, url: url };
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

  return {
    loading,
    run,
  };
};

export default useUpload;
