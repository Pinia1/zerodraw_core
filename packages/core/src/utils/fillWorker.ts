import { WebWorker } from '@zeroDraw/common';

export function createFillWorker(errorHandler?: (error: Error) => void): WebWorker {
  const script = `
onmessage = function (e) {
  try {
    const {
      imageData,
      posX,
      posY,
      tolerance,
      fillColor,
      canvasConfig,
      direction = 0,
      // 新数据结构（可选）：任意角度 + 带 offset 的 stops
      angleDeg,
      stops,
      gradient,
      id,
    } = e.data;

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

    function clamp01(v) {
      if (v < 0) return 0;
      if (v > 1) return 1;
      return v;
    }

    function isRgbaArray(v) {
      return Array.isArray(v) && v.length >= 3;
    }

    function toRgba(color) {
      // 支持 '#RRGGBB' / '#RGB' / '#RRGGBBAA' 或 [r,g,b,a]
      if (typeof color === "string") return hexToRgba(color);
      if (isRgbaArray(color)) {
        return [
          color[0] | 0,
          color[1] | 0,
          color[2] | 0,
          color[3] != null ? (color[3] | 0) : 255,
        ];
      }
      // 兜底：黑色不透明
      return [0, 0, 0, 255];
    }

    // 统一入口：支持我们定义的新结构（stops 带 offset），也兼容旧结构（fillColor + direction）
    function normalizeGradientInput() {
      // 新协议优先：gradient / stops / angleDeg
      const g = gradient && typeof gradient === "object" ? gradient : null;
      const rawStops = (g && g.stops) || stops;
      const rawAngle = (g && g.angle) != null ? g.angle : angleDeg;

      if (Array.isArray(rawStops) && rawStops.length > 0) {
        const normalized = rawStops
          .map((s) => {
            const off = s && s.offset != null ? clamp01(+s.offset) : 0;
            const c = s && (s.color != null ? s.color : s.rgba);
            const rgba = toRgba(c);
            return { offset: off, rgba };
          })
          .sort((a, b) => a.offset - b.offset);

        const ang = rawAngle != null ? +rawAngle : 0;
        const a = ((ang % 360) + 360) % 360;
        return { mode: "offsetStops", angle: a, stops: normalized };
      }

      // 旧协议：fillColor 单色或 [[rgba],...] 但没有 offset（均匀分布）
      const legacyStops = (() => {
        if (Array.isArray(fillColor) && Array.isArray(fillColor[0])) return fillColor;
        return [fillColor];
      })();
      return { mode: "legacy", direction: direction | 0, stops: legacyStops };
    }

    const gradientInput = normalizeGradientInput();

    // 预处理 stops（用于 offsetStops 模式的快速采样）
    let offsets = null;
    let rs = null;
    let gs = null;
    let bs = null;
    let as = null;
    let offsetStopsCount = 0;

    if (gradientInput.mode === "offsetStops") {
      offsetStopsCount = gradientInput.stops.length;
      offsets = new Float32Array(offsetStopsCount);
      rs = new Float32Array(offsetStopsCount);
      gs = new Float32Array(offsetStopsCount);
      bs = new Float32Array(offsetStopsCount);
      as = new Float32Array(offsetStopsCount);
      for (let i = 0; i < offsetStopsCount; i++) {
        const s = gradientInput.stops[i];
        offsets[i] = s.offset;
        rs[i] = s.rgba[0];
        gs[i] = s.rgba[1];
        bs[i] = s.rgba[2];
        as[i] = s.rgba[3] != null ? s.rgba[3] : 255;
      }
    }

    function sampleOffsetStops(t) {
      // offsetsStopsCount >= 1
      if (offsetStopsCount <= 1) {
        return [rs[0], gs[0], bs[0], as[0]];
      }
      if (t <= offsets[0]) return [rs[0], gs[0], bs[0], as[0]];
      const last = offsetStopsCount - 1;
      if (t >= offsets[last]) return [rs[last], gs[last], bs[last], as[last]];

      // upper bound: first index with offsets[i] >= t
      let lo = 0;
      let hi = last;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid] >= t) hi = mid;
        else lo = mid;
      }
      const i0 = hi - 1;
      const i1 = hi;
      const o0 = offsets[i0];
      const o1 = offsets[i1];
      const denom = o1 - o0 || 1;
      const k = (t - o0) / denom;
      return [
        rs[i0] + (rs[i1] - rs[i0]) * k,
        gs[i0] + (gs[i1] - gs[i0]) * k,
        bs[i0] + (bs[i1] - bs[i0]) * k,
        as[i0] + (as[i1] - as[i0]) * k,
      ];
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

      // 完全透明（alpha = 0）
      const transparentValue = 0;

      // 存储结果（初始全透明）
      const resultData = new Uint32Array(totalPixels);
      resultData.fill(transparentValue);

      // 标记已访问的像素（同时作为填充区域的 mask）
      const visited = new Uint8Array(totalPixels);

      // 记录填充区域的包围盒
      let minX = width;
      let maxX = -1;
      let minY = height;
      let maxY = -1;

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

            // 更新包围盒
            if (i < minX) minX = i;
            if (i > maxX) maxX = i;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
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

      // 如果没有有效填充区域，直接返回空
      if (maxX < minX || maxY < minY) {
        return Promise.resolve("");
      }

      // 计算渐变方向向量
      // - 新模式：任意角度（0°=→，90°=↓，屏幕坐标系）
      // - 旧模式：八方向枚举（保持兼容）
      let dirX = 1;
      let dirY = 0;
      if (gradientInput.mode === "offsetStops") {
        const rad = (gradientInput.angle * Math.PI) / 180;
        dirX = Math.cos(rad);
        dirY = Math.sin(rad);
      } else {
        // 0: 左->右, 1: 右->左, 2: 上->下, 3: 下->上,
        // 4: 左上->右下, 5: 右下->左上, 6: 右上->左下, 7: 左下->右上
        switch (gradientInput.direction) {
          case 1:
            dirX = -1;
            dirY = 0;
            break;
          case 2:
            dirX = 0;
            dirY = 1;
            break;
          case 3:
            dirX = 0;
            dirY = -1;
            break;
          case 4:
            dirX = 1;
            dirY = 1;
            break;
          case 5:
            dirX = -1;
            dirY = -1;
            break;
          case 6:
            dirX = -1;
            dirY = 1;
            break;
          case 7:
            dirX = 1;
            dirY = -1;
            break;
          case 8:
            dirX = 1;
            dirY = 0;
            break;
          default:
            dirX = 1;
            dirY = 0;
        }
      }

      // 先在包围盒内扫描一遍，得到投影的最小/最大值
      let minProj = Infinity;
      let maxProj = -Infinity;
      for (let y = minY; y <= maxY; y++) {
        const rowIndex = y * width;
        for (let x = minX; x <= maxX; x++) {
          const index = rowIndex + x;
          if (!visited[index]) continue;
          const proj = x * dirX + y * dirY;
          if (proj < minProj) minProj = proj;
          if (proj > maxProj) maxProj = proj;
        }
      }

      const projRange = maxProj - minProj || 1;

      // 根据方向和渐变 stop，对每个像素设置最终颜色
      for (let y = minY; y <= maxY; y++) {
        const rowIndex = y * width;
        for (let x = minX; x <= maxX; x++) {
          const index = rowIndex + x;
          if (!visited[index]) continue;

          const proj = x * dirX + y * dirY;
          let t = (proj - minProj) / projRange;
          if (t < 0) t = 0;
          if (t > 1) t = 1;

          let r, g, b, a;
          if (gradientInput.mode === "offsetStops") {
            const c = sampleOffsetStops(t);
            r = c[0];
            g = c[1];
            b = c[2];
            a = c[3];
          } else {
            // 旧逻辑：stops 均匀分布（与历史行为保持一致）
            const legacyStops = gradientInput.stops;
            const stopsCount = legacyStops.length;
            if (stopsCount === 1) {
              const c0 = legacyStops[0];
              r = c0[0];
              g = c0[1];
              b = c0[2];
              a = c0[3] != null ? c0[3] : 255;
            } else {
              const scaled = t * (stopsCount - 1);
              const idx0 = Math.floor(scaled);
              const idx1 = Math.min(stopsCount - 1, idx0 + 1);
              const localT = scaled - idx0;

              const c0 = legacyStops[idx0];
              const c1 = legacyStops[idx1];

              r = c0[0] + (c1[0] - c0[0]) * localT;
              g = c0[1] + (c1[1] - c0[1]) * localT;
              b = c0[2] + (c1[2] - c0[2]) * localT;
              const a0 = c0[3] != null ? c0[3] : 255;
              const a1 = c1[3] != null ? c1[3] : 255;
              a = a0 + (a1 - a0) * localT;
            }
          }

          const alpha = Math.max(0, Math.min(255, Math.round(a)));
          const rr = Math.max(0, Math.min(255, Math.round(r)));
          const gg = Math.max(0, Math.min(255, Math.round(g)));
          const bb = Math.max(0, Math.min(255, Math.round(b)));

          resultData[index] =
            (alpha << 24) |
            (bb << 16) |
            (gg << 8) |
            rr;
        }
      }

      // 创建新的 ImageData 对象
      const resultImageData = new ImageData(
        new Uint8ClampedArray(resultData.buffer),
        width,
        height
      );

      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, width, height);
      ctx.putImageData(resultImageData, 0, 0);

      return canvas
        .convertToBlob({
          type: "image/webp",
          quality: 1,
        })
        .then((blob) => blob.arrayBuffer());
    }

    floodFill(posX, posY, fillColor, tolerance).then((buffer) => {
      if (buffer) {
        postMessage({ buffer, id }, [buffer]);
      } else {
        postMessage({ buffer: null, id });
      }
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
