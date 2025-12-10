/**
 * 工具函数
 */

/**
 * 延迟执行
 * @param ms 延迟时间（毫秒）
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const generateUUID = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const hexToRgba = (color: string, opacity: number): [number, number, number, number] => {
  let hex = color;
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length !== 6) {
    throw new Error('Invalid hex color');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return [r, g, b, 255 * opacity];
};

export const cropTransparentBorder = (
  sourceImageData: ImageData,
  alphaThreshold = 0 // >0 时可以略过非常浅的半透明像素
): {
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
} => {
  const { width, height, data } = sourceImageData;
  const stride = width * 4;

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  let found = false;

  // 找 top
  for (; top < height; top++) {
    const rowOffset = top * stride;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * 4 + 3];
      if (alpha > alphaThreshold) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    // 整张图都透明，返回整张
    return {
      bounds: {
        left: 0,
        top: 0,
        right: width - 1,
        bottom: height - 1,
        width,
        height,
      },
    };
  }

  // 找 bottom
  for (; bottom >= top; bottom--) {
    const rowOffset = bottom * stride;
    let rowHasPixel = false;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * 4 + 3];
      if (alpha > alphaThreshold) {
        rowHasPixel = true;
        break;
      }
    }
    if (rowHasPixel) break;
  }

  // 找 left
  for (; left < width; left++) {
    let colHasPixel = false;
    for (let y = top; y <= bottom; y++) {
      const offset = y * stride + left * 4 + 3;
      if (data[offset] > alphaThreshold) {
        colHasPixel = true;
        break;
      }
    }
    if (colHasPixel) break;
  }

  // 找 right
  for (; right >= left; right--) {
    let colHasPixel = false;
    for (let y = top; y <= bottom; y++) {
      const offset = y * stride + right * 4 + 3;
      if (data[offset] > alphaThreshold) {
        colHasPixel = true;
        break;
      }
    }
    if (colHasPixel) break;
  }

  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;

  return {
    bounds: {
      left,
      top,
      right,
      bottom,
      width: croppedWidth,
      height: croppedHeight,
    },
  };
};

export const isEmptyObj = (obj: unknown): boolean => {
  if (obj == null) return true;

  if (typeof obj !== 'object') return false;

  if (Array.isArray(obj)) {
    return obj.length === 0;
  }

  if (obj instanceof Map || obj instanceof Set) {
    return obj.size === 0;
  }

  return Object.keys(obj).length === 0;
};
