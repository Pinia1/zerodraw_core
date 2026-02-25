import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';

const useCopy = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const handleCopy = useMemoizedFn(async (url: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const imageBlob = blob.type.startsWith('image/')
        ? blob
        : new Blob([await blob.arrayBuffer()], { type: 'image/png' });
      const mimeType = imageBlob.type || 'image/png';
      await navigator.clipboard.write([
        new ClipboardItem({
          [mimeType]: imageBlob,
          'text/plain': new Blob([url], { type: 'text/plain' }),
        }),
      ]);
      setLoading(false);
      onSuccess?.();
    } catch (error) {
      setLoading(false);
      setError(error as Error);
      onError?.(error as Error);
    }
  });
  return {
    handleCopy,
    loading,
    error,
  };
};

export default useCopy;
