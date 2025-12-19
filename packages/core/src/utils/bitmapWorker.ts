import { WebWorker } from '@zeroDraw/common';

export function createBitmapWorker(errorHandler?: (error: Error) => void): WebWorker {
  const script = `

  `;

  const blob = new Blob([script], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return new WebWorker(url, errorHandler);
}
