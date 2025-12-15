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

      // iOS Safari 兼容：必须先 append 到 DOM，且在选择完成前不能移除
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
                const id = generateUUID();
                const url = URL.createObjectURL(file);
                // 保存时带上 mimeType，iOS 更严格
                await imageManager.saveImage(id, await file.arrayBuffer(), file.type || undefined);
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

      // 允许重复选择同一文件
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
