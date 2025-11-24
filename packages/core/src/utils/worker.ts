import { WebWorker } from '@monorepo/common';

export function createFillWorker(errorHandler?: (error: Error) => void): WebWorker {
  const script = `
onmessage = function (e) {
  try {
    const { imageData, posX, posY, tolerance, fillColor, canvasConfig, id } = e.data;

    function hexToRgba(hex) {
      hex = hex.replace(/^#/, "");
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((char) => char + char)
          .join("");
      }
      if (hex.length === 6) hex += "FF";
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16),
      ];
    }

    const backgroundRgba = hexToRgba(canvasConfig.layerBackground);

    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;
    const data = imageData.data;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const toleranceThreshold = tolerance * 3;

    // 颜色 & 透明度匹配：RGB 使用预先计算好的 toleranceThreshold，alpha 使用 tolerance
    function colorsMatch(r1, g1, b1, a1, r2, g2, b2, a2) {
      const colorDiff =
        Math.abs(r1 - r2) +
        Math.abs(g1 - g2) +
        Math.abs(b1 - b2);
      const alphaDiff = Math.abs(a1 - a2);

      if (colorDiff > toleranceThreshold) return false;
      if (alphaDiff > tolerance) return false;
      return true;
    }

    // 只填充区域
    function floodFill(startX, startY, fillColor, _tolerance) {
      // 起始点坐标越界检查
      if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
        return Promise.resolve("");
      }

      const targetIndex = startY * width + startX;
      const targetOffset = targetIndex * 4;
      const targetR = data[targetOffset];
      const targetG = data[targetOffset + 1];
      const targetB = data[targetOffset + 2];
      const targetA = data[targetOffset + 3];

      // 如果目标像素是透明的，使用背景色；alpha 为 0 表示完全透明
      const tr = targetA === 0 ? backgroundRgba[0] : targetR;
      const tg = targetA === 0 ? backgroundRgba[1] : targetG;
      const tb = targetA === 0 ? backgroundRgba[2] : targetB;
      const ta = targetA === 0 ? 0 : targetA;

      // 使用传入的 alpha（0–255）
      const alpha = Math.max(0, Math.min(255, Math.round(fillColor[3] || 255)));
      const fillValue =
        (alpha << 24) |
        (fillColor[2] << 16) |
        (fillColor[1] << 8) |
        fillColor[0];

      // 完全透明（alpha = 0）
      const transparentValue = 0;

      // 存储结果（初始全透明）
      const resultData = new Uint32Array(totalPixels);
      resultData.fill(transparentValue);

      // 标记已访问的像素
      const visited = new Uint8Array(totalPixels);

      // 栈实现，预先分配足够空间
      const stackSize = Math.min(totalPixels, 10000);
      const stack = new Int32Array(stackSize * 2); // 存储 x,y 坐标
      let stackPos = 0;

      // 初始位置
      stack[stackPos++] = startX;
      stack[stackPos++] = startY;

      while (stackPos > 0) {
        // 防止栈溢出
        if (stackPos >= stackSize * 2 - 4) {
          break;
        }

        const y = stack[--stackPos];
        const x = stack[--stackPos];

        if (x < 0 || x >= width || y < 0 || y >= height) {
          continue;
        }

        const rowIndex = y * width;
        const baseIndex = rowIndex + x;

        // 快速跳过已访问的像素
        if (visited[baseIndex]) {
          continue;
        }

        // 确认当前像素是否满足填充条件
        const currentOffset = baseIndex * 4;
        const currentA = data[currentOffset + 3];
        const cr = currentA === 0 ? backgroundRgba[0] : data[currentOffset];
        const cg = currentA === 0 ? backgroundRgba[1] : data[currentOffset + 1];
        const cb = currentA === 0 ? backgroundRgba[2] : data[currentOffset + 2];
        const ca = currentA === 0 ? 0 : currentA;

        if (!colorsMatch(cr, cg, cb, ca, tr, tg, tb, ta)) {
          continue;
        }

        // 扫描当前行，找到左右边界
        let left = x;
        let right = x;

        // 向左扫描
        while (left > 0) {
          const idx = rowIndex + left - 1;
          const offset = idx * 4;
          const a = data[offset + 3];
          const r = a === 0 ? backgroundRgba[0] : data[offset];
          const g = a === 0 ? backgroundRgba[1] : data[offset + 1];
          const b = a === 0 ? backgroundRgba[2] : data[offset + 2];
          const alpha = a === 0 ? 0 : a;

          if (!colorsMatch(r, g, b, alpha, tr, tg, tb, ta)) break;
          left--;
        }

        // 向右扫描
        while (right < width - 1) {
          const idx = rowIndex + right + 1;
          const offset = idx * 4;
          const a = data[offset + 3];
          const r = a === 0 ? backgroundRgba[0] : data[offset];
          const g = a === 0 ? backgroundRgba[1] : data[offset + 1];
          const b = a === 0 ? backgroundRgba[2] : data[offset + 2];
          const alpha = a === 0 ? 0 : a;

          if (!colorsMatch(r, g, b, alpha, tr, tg, tb, ta)) break;
          right++;
        }

        // 填充当前扫描线并标记已访问
        for (let i = left; i <= right; i++) {
          const index = rowIndex + i;
          if (!visited[index]) {
            visited[index] = 1;
            resultData[index] = fillValue;
          }
        }

        // 检查上下行，添加新的种子点
        const checkAdjacent = (ny) => {
          if (ny < 0 || ny >= height) return;

          const nyRowIndex = ny * width;
          let inRange = false;

          for (let i = left; i <= right; i++) {
            const idx = nyRowIndex + i;
            const offset = idx * 4;
            const a = data[offset + 3];
            const r = a === 0 ? backgroundRgba[0] : data[offset];
            const g = a === 0 ? backgroundRgba[1] : data[offset + 1];
            const b = a === 0 ? backgroundRgba[2] : data[offset + 2];
            const alpha = a === 0 ? 0 : a;

            if (!visited[idx] && colorsMatch(r, g, b, alpha, tr, tg, tb, ta)) {
              if (!inRange) {
                stack[stackPos++] = i;
                stack[stackPos++] = ny;
                inRange = true;
              }
            } else if (inRange) {
              inRange = false;
            }
          }
        };

        checkAdjacent(y - 1);
        checkAdjacent(y + 1);
      }

      // 创建新的 ImageData 对象
      const resultImageData = new ImageData(
        new Uint8ClampedArray(resultData.buffer),
        width,
        height
      );

      // 将结果绘制到画布上
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, width, height);
      ctx.putImageData(resultImageData, 0, 0);

      // 转换为 Blob 并创建 URL
      return canvas
        .convertToBlob({
          type: "image/webp",
          quality: 1,
        })
        .then((blob) => URL.createObjectURL(blob));
    }

    // 执行填充并发送结果
    floodFill(posX, posY, fillColor, tolerance).then((pathData) => {
      postMessage({ pathData, id });
    });
  } catch (error) {
    postMessage({ error: error && error.message ? error.message : String(error) });
  }
};

  `;

  const blob = new Blob([script], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return new WebWorker(url, errorHandler);
}
