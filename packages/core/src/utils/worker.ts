import { WebWorker } from '@monorepo/common';

export function createFillWorker(errorHandler?: (error: Error) => void): WebWorker {
  const script = `
    onmessage = function (e) {
  try {
    const { imageData, posX, posY, tolerance, fillColor, canvasConfig,id } =
      e.data;

    function hexToRgba(hex) {
      hex = hex.replace(/^#/, "");
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((char) => char + char)
          .join("");
      if (hex.length === 6) hex += "FF";
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16),
      ];
    }

    const backgroundRgba = hexToRgba(canvasConfig.layerBackground);
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext("2d");

    const width = imageData.width;
    const height = imageData.height;

    // 优化颜色匹配函数 - 使用曼哈顿距离
    function colorsMatch(r1, g1, b1, r2, g2, b2, tolerance) {
      return (
        Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) <=
        tolerance * 3
      );
    }

    // 只填充区域
    function floodFill(startX, startY, fillColor, tolerance) {
      // 起始点坐标越界检查
      if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
        return Promise.resolve("");
      }

      const targetIndex = startY * width + startX;
      const targetIdx = targetIndex * 4;
      const targetR = imageData.data[targetIdx];
      const targetG = imageData.data[targetIdx + 1];
      const targetB = imageData.data[targetIdx + 2];
      const targetA = imageData.data[targetIdx + 3];

      // 如果目标像素是透明的，使用背景色
      const tr = targetA === 0 ? backgroundRgba[0] : targetR;
      const tg = targetA === 0 ? backgroundRgba[1] : targetG;
      const tb = targetA === 0 ? backgroundRgba[2] : targetB;

      // 预先计算填充颜色的32位值（完全不透明）
      const fillValue =
        (255 << 24) | // alpha
        (fillColor[2] << 16) | // blue
        (fillColor[1] << 8) | // green
        fillColor[0]; // red

      // 预先计算透明颜色的32位值（完全透明）
      const transparentValue = 0; // 完全透明（alpha = 0）

      // 创建一个新的 Uint32Array 用于存储结果（初始全透明）
      const resultData = new Uint32Array(width * height);
      // 全部初始化为透明
      resultData.fill(transparentValue);

      // 使用 Uint8Array 来标记已访问的像素
      const visited = new Uint8Array(width * height);
      // 使用更高效的栈实现，预先分配足够空间
      const stackSize = Math.min(width * height, 10000); // 限制栈大小，防止内存溢出
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

        // 快速跳过已访问或超出边界的像素
        if (
          x < 0 ||
          x >= width ||
          y < 0 ||
          y >= height ||
          visited[y * width + x]
        ) {
          continue;
        }

        // 扫描当前行，找到左右边界
        let left = x;
        let right = x;
        const rowIndex = y * width;

        // 确认当前像素是否满足填充条件
        const currentIdx = (rowIndex + x) * 4;
        const currentA = imageData.data[currentIdx + 3];
        const cr =
          currentA === 0 ? backgroundRgba[0] : imageData.data[currentIdx];
        const cg =
          currentA === 0 ? backgroundRgba[1] : imageData.data[currentIdx + 1];
        const cb =
          currentA === 0 ? backgroundRgba[2] : imageData.data[currentIdx + 2];

        if (!colorsMatch(cr, cg, cb, tr, tg, tb, tolerance)) {
          continue;
        }

        // 向左扫描
        while (left > 0) {
          const idx = (rowIndex + left - 1) * 4;
          const a = imageData.data[idx + 3];
          const r = a === 0 ? backgroundRgba[0] : imageData.data[idx];
          const g = a === 0 ? backgroundRgba[1] : imageData.data[idx + 1];
          const b = a === 0 ? backgroundRgba[2] : imageData.data[idx + 2];

          if (!colorsMatch(r, g, b, tr, tg, tb, tolerance)) break;
          left--;
        }

        // 向右扫描
        while (right < width - 1) {
          const idx = (rowIndex + right + 1) * 4;
          const a = imageData.data[idx + 3];
          const r = a === 0 ? backgroundRgba[0] : imageData.data[idx];
          const g = a === 0 ? backgroundRgba[1] : imageData.data[idx + 1];
          const b = a === 0 ? backgroundRgba[2] : imageData.data[idx + 2];

          if (!colorsMatch(r, g, b, tr, tg, tb, tolerance)) break;
          right++;
        }

        // 填充当前扫描线并标记已访问
        for (let i = left; i <= right; i++) {
          const index = rowIndex + i;
          if (!visited[index]) {
            visited[index] = 1;
            resultData[index] = fillValue; // 设置为填充颜色
          }
        }

        // 检查上下行，添加新的种子点
        const checkAdjacent = (ny) => {
          if (ny < 0 || ny >= height) return;

          let inRange = false;
          for (let i = left; i <= right; i++) {
            const idx = (ny * width + i) * 4;
            const a = imageData.data[idx + 3];
            const r = a === 0 ? backgroundRgba[0] : imageData.data[idx];
            const g = a === 0 ? backgroundRgba[1] : imageData.data[idx + 1];
            const b = a === 0 ? backgroundRgba[2] : imageData.data[idx + 2];

            if (
              !visited[ny * width + i] &&
              colorsMatch(r, g, b, tr, tg, tb, tolerance)
            ) {
              if (!inRange) {
                // 发现新的需要填充的区域
                stack[stackPos++] = i;
                stack[stackPos++] = ny;
                inRange = true;
              }
            } else if (inRange) {
              // 当前区域结束，需要找下一个
              inRange = false;
            }
          }
        };

        // 检查上下行
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
        .then((blob) => {
          const dataUrl = URL.createObjectURL(blob);
          return dataUrl;
        });
    }
    // 执行填充并发送结果
    floodFill(posX, posY, fillColor, tolerance).then((pathData) => {
      postMessage({ pathData,id });
    });
  } catch (error) {
    postMessage({ error: error.message });
  }
};

  `;

  const blob = new Blob([script], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return new WebWorker(url, errorHandler);
}
