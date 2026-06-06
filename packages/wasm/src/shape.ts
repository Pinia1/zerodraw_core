/**
 * shape-recognizer.ts - 手绘图形识别 + 标准图形转换
 *
 * 基于 $1 Unistroke Recognizer 和几何直线检测，
 * 将手绘轨迹识别为标准图形，并生成标准图形的点序列。
 *
 * @example
 * ```ts
 * const recognizer = new ShapeRecognizer();
 *
 * // 识别
 * const result = recognizer.recognize(points);
 * if (result) {
 *   console.log(result.name, result.score);
 * }
 *
 * // 识别 + 转换
 * const converted = recognizer.recognizeAndConvert(points);
 * if (converted) {
 *   console.log(converted.name);
 *   // converted.points 是标准图形的点序列，可以用来重绘
 *   for (const p of converted.points) {
 *     stroke.to(p.x, p.y, 0.5);
 *   }
 * }
 * ```
 *
 * @license BSD-3-Clause ($1 Recognizer)
 */

// ================================================================
// 类型定义
// ================================================================

/** 二维点 */
export interface Point {
  x: number;
  y: number;
}

/** 识别结果 */
export interface RecognizeResult {
  /** 图形名称 */
  name: ShapeName;
  /** 置信度 (0-1) */
  score: number;
  /** 识别耗时 (ms) */
  time: number;
}

/** 转换结果 */
export interface ConvertResult extends RecognizeResult {
  /** 标准图形的点序列 */
  points: Point[];
  /** 包围盒 */
  bbox: BoundingBox;
}

/** 包围盒 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 识别器选项 */
export interface RecognizerOptions {
  /** 识别置信度阈值 (默认 0.7) */
  threshold?: number;
  /** 转换时的包围盒外边距 (默认 5) */
  padding?: number;
  /** 生成标准图形的点数 (默认 80) */
  resolution?: number;
  /** 使用 Protractor 快速模式 (默认 true) */
  useProtractor?: boolean;
  /** 直线检测的平均偏差阈值，占线长比例 (默认 0.05) */
  lineAvgDeviationRatio?: number;
  /** 直线检测的最大偏差阈值，占线长比例 (默认 0.15) */
  lineMaxDeviationRatio?: number;
  /** 直线最小长度 (默认 30) */
  lineMinLength?: number;
  /** 要排除的图形名称列表 */
  exclude?: ShapeName[];
}

/** 支持的图形名称 */
export type ShapeName =
  | 'line'
  | 'circle'
  | 'rectangle'
  | 'triangle'
  | 'star'
  | 'arrow'
  | 'check'
  | 'x'
  | 'v'
  | 'caret'
  | 'zig-zag'
  | 'delete'
  | 'pigtail';

// ================================================================
// $1 Unistroke Recognizer 内部实现
// ================================================================

interface DollarPoint {
  X: number;
  Y: number;
}

interface DollarRect {
  X: number;
  Y: number;
  Width: number;
  Height: number;
}

interface Unistroke {
  Name: string;
  Points: DollarPoint[];
  Vector: number[];
}

interface DollarResult {
  Name: string;
  Score: number;
  Time: number;
}

const NUM_POINTS = 64;
const SQUARE_SIZE = 250.0;
const ORIGIN: DollarPoint = { X: 0, Y: 0 };
const DIAGONAL = Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE);
const HALF_DIAGONAL = 0.5 * DIAGONAL;
const ANGLE_RANGE = deg2rad(45.0);
const ANGLE_PRECISION = deg2rad(2.0);
const PHI = 0.5 * (-1.0 + Math.sqrt(5.0));

function deg2rad(d: number): number {
  return (d * Math.PI) / 180.0;
}

function distance(p1: DollarPoint, p2: DollarPoint): number {
  const dx = p2.X - p1.X;
  const dy = p2.Y - p1.Y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(points: DollarPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

function resample(points: DollarPoint[], n: number): DollarPoint[] {
  const I = pathLength(points) / (n - 1);
  let D = 0;
  const newpoints: DollarPoint[] = [{ X: points[0].X, Y: points[0].Y }];
  const pts = points.map((p) => ({ X: p.X, Y: p.Y }));

  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (D + d >= I) {
      const qx = pts[i - 1].X + ((I - D) / d) * (pts[i].X - pts[i - 1].X);
      const qy = pts[i - 1].Y + ((I - D) / d) * (pts[i].Y - pts[i - 1].Y);
      const q: DollarPoint = { X: qx, Y: qy };
      newpoints.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else {
      D += d;
    }
  }
  if (newpoints.length === n - 1) {
    newpoints.push({ X: pts[pts.length - 1].X, Y: pts[pts.length - 1].Y });
  }
  return newpoints;
}

function centroid(points: DollarPoint[]): DollarPoint {
  let x = 0,
    y = 0;
  for (const p of points) {
    x += p.X;
    y += p.Y;
  }
  return { X: x / points.length, Y: y / points.length };
}

function indicativeAngle(points: DollarPoint[]): number {
  const c = centroid(points);
  return Math.atan2(c.Y - points[0].Y, c.X - points[0].X);
}

function rotateBy(points: DollarPoint[], radians: number): DollarPoint[] {
  const c = centroid(points);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map((p) => ({
    X: (p.X - c.X) * cos - (p.Y - c.Y) * sin + c.X,
    Y: (p.X - c.X) * sin + (p.Y - c.Y) * cos + c.Y,
  }));
}

function boundingBox(points: DollarPoint[]): DollarRect {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.X);
    minY = Math.min(minY, p.Y);
    maxX = Math.max(maxX, p.X);
    maxY = Math.max(maxY, p.Y);
  }
  return { X: minX, Y: minY, Width: maxX - minX, Height: maxY - minY };
}

function scaleTo(points: DollarPoint[], size: number): DollarPoint[] {
  const B = boundingBox(points);
  return points.map((p) => ({
    X: p.X * (size / B.Width),
    Y: p.Y * (size / B.Height),
  }));
}

function translateTo(points: DollarPoint[], pt: DollarPoint): DollarPoint[] {
  const c = centroid(points);
  return points.map((p) => ({
    X: p.X + pt.X - c.X,
    Y: p.Y + pt.Y - c.Y,
  }));
}

function vectorize(points: DollarPoint[]): number[] {
  let sum = 0;
  const vector: number[] = [];
  for (const p of points) {
    vector.push(p.X, p.Y);
    sum += p.X * p.X + p.Y * p.Y;
  }
  const magnitude = Math.sqrt(sum);
  for (let i = 0; i < vector.length; i++) vector[i] /= magnitude;
  return vector;
}

function makeUnistroke(name: string, points: DollarPoint[]): Unistroke {
  let pts = resample(points, NUM_POINTS);
  const radians = indicativeAngle(pts);
  pts = rotateBy(pts, -radians);
  pts = scaleTo(pts, SQUARE_SIZE);
  pts = translateTo(pts, ORIGIN);
  return { Name: name, Points: pts, Vector: vectorize(pts) };
}

function optimalCosineDistance(v1: number[], v2: number[]): number {
  let a = 0,
    b = 0;
  for (let i = 0; i < v1.length; i += 2) {
    a += v1[i] * v2[i] + v1[i + 1] * v2[i + 1];
    b += v1[i] * v2[i + 1] - v1[i + 1] * v2[i];
  }
  const angle = Math.atan(b / a);
  return Math.acos(a * Math.cos(angle) + b * Math.sin(angle));
}

function pathDistance(pts1: DollarPoint[], pts2: DollarPoint[]): number {
  let d = 0;
  for (let i = 0; i < pts1.length; i++) d += distance(pts1[i], pts2[i]);
  return d / pts1.length;
}

function distanceAtAngle(points: DollarPoint[], T: Unistroke, radians: number): number {
  const newpoints = rotateBy(points, radians);
  return pathDistance(newpoints, T.Points);
}

function distanceAtBestAngle(
  points: DollarPoint[],
  T: Unistroke,
  a: number,
  b: number,
  threshold: number
): number {
  let x1 = PHI * a + (1 - PHI) * b;
  let f1 = distanceAtAngle(points, T, x1);
  let x2 = (1 - PHI) * a + PHI * b;
  let f2 = distanceAtAngle(points, T, x2);
  while (Math.abs(b - a) > threshold) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = PHI * a + (1 - PHI) * b;
      f1 = distanceAtAngle(points, T, x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1 - PHI) * a + PHI * b;
      f2 = distanceAtAngle(points, T, x2);
    }
  }
  return Math.min(f1, f2);
}

// ================================================================
// 内置模板数据
// ================================================================

function P(x: number, y: number): DollarPoint {
  return { X: x, Y: y };
}

// 生成圆形模板
function makeCirclePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  clockwise: boolean
): DollarPoint[] {
  const pts: DollarPoint[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const dir = clockwise ? 1 : -1;
    const a = startAngle + dir * ((2 * Math.PI * i) / n);
    pts.push(P(cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
  }
  return pts;
}

const BUILTIN_TEMPLATES: Array<{ name: string; points: DollarPoint[] }> = [
  {
    name: 'triangle',
    points: [
      P(137, 139),
      P(135, 141),
      P(133, 144),
      P(132, 146),
      P(130, 149),
      P(128, 151),
      P(126, 155),
      P(123, 160),
      P(120, 166),
      P(116, 171),
      P(112, 177),
      P(107, 183),
      P(102, 188),
      P(100, 191),
      P(95, 195),
      P(90, 199),
      P(86, 203),
      P(82, 206),
      P(80, 209),
      P(75, 213),
      P(73, 213),
      P(70, 216),
      P(67, 219),
      P(64, 221),
      P(61, 223),
      P(60, 225),
      P(62, 226),
      P(65, 225),
      P(67, 226),
      P(74, 226),
      P(77, 227),
      P(85, 229),
      P(91, 230),
      P(99, 231),
      P(108, 232),
      P(116, 233),
      P(125, 233),
      P(134, 234),
      P(145, 233),
      P(153, 232),
      P(160, 233),
      P(170, 234),
      P(177, 235),
      P(179, 236),
      P(186, 237),
      P(193, 238),
      P(198, 239),
      P(200, 237),
      P(202, 239),
      P(204, 238),
      P(206, 234),
      P(205, 230),
      P(202, 222),
      P(197, 216),
      P(192, 207),
      P(186, 198),
      P(179, 189),
      P(174, 183),
      P(170, 178),
      P(164, 171),
      P(161, 168),
      P(154, 160),
      P(148, 155),
      P(143, 150),
      P(138, 148),
      P(136, 148),
    ],
  },
  {
    name: 'x',
    points: [
      P(87, 142),
      P(89, 145),
      P(91, 148),
      P(93, 151),
      P(96, 155),
      P(98, 157),
      P(100, 160),
      P(102, 162),
      P(106, 167),
      P(108, 169),
      P(110, 171),
      P(115, 177),
      P(119, 183),
      P(123, 189),
      P(127, 193),
      P(129, 196),
      P(133, 200),
      P(137, 206),
      P(140, 209),
      P(143, 212),
      P(146, 215),
      P(151, 220),
      P(153, 222),
      P(155, 223),
      P(157, 225),
      P(158, 223),
      P(157, 218),
      P(155, 211),
      P(154, 208),
      P(152, 200),
      P(150, 189),
      P(148, 179),
      P(147, 170),
      P(147, 158),
      P(147, 148),
      P(147, 141),
      P(147, 136),
      P(144, 135),
      P(142, 137),
      P(140, 139),
      P(135, 145),
      P(131, 152),
      P(124, 163),
      P(116, 177),
      P(108, 191),
      P(100, 206),
      P(94, 217),
      P(91, 222),
      P(89, 225),
      P(87, 226),
      P(87, 224),
    ],
  },
  {
    name: 'rectangle',
    points: [
      P(78, 149),
      P(78, 153),
      P(78, 157),
      P(78, 160),
      P(79, 162),
      P(79, 164),
      P(79, 167),
      P(79, 169),
      P(79, 173),
      P(79, 178),
      P(79, 183),
      P(80, 189),
      P(80, 193),
      P(80, 198),
      P(80, 202),
      P(81, 208),
      P(81, 210),
      P(81, 216),
      P(82, 222),
      P(82, 224),
      P(82, 227),
      P(83, 229),
      P(83, 231),
      P(85, 230),
      P(88, 232),
      P(90, 233),
      P(92, 232),
      P(94, 233),
      P(99, 232),
      P(102, 233),
      P(106, 233),
      P(109, 234),
      P(117, 235),
      P(123, 236),
      P(126, 236),
      P(135, 237),
      P(142, 238),
      P(145, 238),
      P(152, 238),
      P(154, 239),
      P(165, 238),
      P(174, 237),
      P(179, 236),
      P(186, 235),
      P(191, 235),
      P(195, 233),
      P(197, 233),
      P(200, 233),
      P(201, 235),
      P(201, 233),
      P(199, 231),
      P(198, 226),
      P(198, 220),
      P(196, 207),
      P(195, 195),
      P(195, 181),
      P(195, 173),
      P(195, 163),
      P(194, 155),
      P(192, 145),
      P(192, 143),
      P(192, 138),
      P(191, 135),
      P(191, 133),
      P(191, 130),
      P(190, 128),
      P(188, 129),
      P(186, 129),
      P(181, 132),
      P(173, 131),
      P(162, 131),
      P(151, 132),
      P(149, 132),
      P(138, 132),
      P(136, 132),
      P(122, 131),
      P(120, 131),
      P(109, 130),
      P(107, 130),
      P(90, 132),
      P(81, 133),
      P(76, 133),
    ],
  },
  {
    name: 'circle',
    points: [
      P(127, 141),
      P(124, 140),
      P(120, 139),
      P(118, 139),
      P(116, 139),
      P(111, 140),
      P(109, 141),
      P(104, 144),
      P(100, 147),
      P(96, 152),
      P(93, 157),
      P(90, 163),
      P(87, 169),
      P(85, 175),
      P(83, 181),
      P(82, 190),
      P(82, 195),
      P(83, 200),
      P(84, 205),
      P(88, 213),
      P(91, 216),
      P(96, 219),
      P(103, 222),
      P(108, 224),
      P(111, 224),
      P(120, 224),
      P(133, 223),
      P(142, 222),
      P(152, 218),
      P(160, 214),
      P(167, 210),
      P(173, 204),
      P(178, 198),
      P(179, 196),
      P(182, 188),
      P(182, 177),
      P(178, 167),
      P(170, 150),
      P(163, 138),
      P(152, 130),
      P(143, 129),
      P(140, 131),
      P(129, 136),
      P(126, 139),
    ],
  },
  {
    name: 'check',
    points: [
      P(91, 185),
      P(93, 185),
      P(95, 185),
      P(97, 185),
      P(100, 188),
      P(102, 189),
      P(104, 190),
      P(106, 193),
      P(108, 195),
      P(110, 198),
      P(112, 201),
      P(114, 204),
      P(115, 207),
      P(117, 210),
      P(118, 212),
      P(120, 214),
      P(121, 217),
      P(122, 219),
      P(123, 222),
      P(124, 224),
      P(126, 226),
      P(127, 229),
      P(129, 231),
      P(130, 233),
      P(129, 231),
      P(129, 228),
      P(129, 226),
      P(129, 224),
      P(129, 221),
      P(129, 218),
      P(129, 212),
      P(129, 208),
      P(130, 198),
      P(132, 189),
      P(134, 182),
      P(137, 173),
      P(143, 164),
      P(147, 157),
      P(151, 151),
      P(155, 144),
      P(161, 137),
      P(165, 131),
      P(171, 122),
      P(174, 118),
      P(176, 114),
      P(177, 112),
      P(177, 114),
      P(175, 116),
      P(173, 118),
    ],
  },
  {
    name: 'caret',
    points: [
      P(79, 245),
      P(79, 242),
      P(79, 239),
      P(80, 237),
      P(80, 234),
      P(81, 232),
      P(82, 230),
      P(84, 224),
      P(86, 220),
      P(86, 218),
      P(87, 216),
      P(88, 213),
      P(90, 207),
      P(91, 202),
      P(92, 200),
      P(93, 194),
      P(94, 192),
      P(96, 189),
      P(97, 186),
      P(100, 179),
      P(102, 173),
      P(105, 165),
      P(107, 160),
      P(109, 158),
      P(112, 151),
      P(115, 144),
      P(117, 139),
      P(119, 136),
      P(119, 134),
      P(120, 132),
      P(121, 129),
      P(122, 127),
      P(124, 125),
      P(126, 124),
      P(129, 125),
      P(131, 127),
      P(132, 130),
      P(136, 139),
      P(141, 154),
      P(145, 166),
      P(151, 182),
      P(156, 193),
      P(157, 196),
      P(161, 209),
      P(162, 211),
      P(167, 223),
      P(169, 229),
      P(170, 231),
      P(173, 237),
      P(176, 242),
      P(177, 244),
      P(179, 250),
      P(181, 255),
      P(182, 257),
    ],
  },
  {
    name: 'zig-zag',
    points: [P(307, 216), P(333, 186), P(356, 215), P(375, 186), P(399, 216), P(418, 186)],
  },
  {
    name: 'arrow',
    points: [
      P(68, 222),
      P(70, 220),
      P(73, 218),
      P(75, 217),
      P(77, 215),
      P(80, 213),
      P(82, 212),
      P(84, 210),
      P(87, 209),
      P(89, 208),
      P(92, 206),
      P(95, 204),
      P(101, 201),
      P(106, 198),
      P(112, 194),
      P(118, 191),
      P(124, 187),
      P(127, 186),
      P(132, 183),
      P(138, 181),
      P(141, 180),
      P(146, 178),
      P(154, 173),
      P(159, 171),
      P(161, 170),
      P(166, 167),
      P(168, 167),
      P(171, 166),
      P(174, 164),
      P(177, 162),
      P(180, 160),
      P(182, 158),
      P(183, 156),
      P(181, 154),
      P(178, 153),
      P(171, 153),
      P(164, 153),
      P(160, 153),
      P(150, 154),
      P(147, 155),
      P(141, 157),
      P(137, 158),
      P(135, 158),
      P(137, 158),
      P(140, 157),
      P(143, 156),
      P(151, 154),
      P(160, 152),
      P(170, 149),
      P(179, 147),
      P(185, 145),
      P(192, 144),
      P(196, 144),
      P(198, 144),
      P(200, 144),
      P(201, 147),
      P(199, 149),
      P(194, 157),
      P(191, 160),
      P(186, 167),
      P(180, 176),
      P(177, 179),
      P(171, 187),
      P(169, 189),
      P(165, 194),
      P(164, 196),
    ],
  },
  {
    name: 'v',
    points: [
      P(89, 164),
      P(90, 162),
      P(92, 162),
      P(94, 164),
      P(95, 166),
      P(96, 169),
      P(97, 171),
      P(99, 175),
      P(101, 178),
      P(103, 182),
      P(106, 189),
      P(108, 194),
      P(111, 199),
      P(114, 204),
      P(117, 209),
      P(119, 214),
      P(122, 218),
      P(124, 222),
      P(126, 225),
      P(128, 228),
      P(130, 229),
      P(133, 233),
      P(134, 236),
      P(136, 239),
      P(138, 240),
      P(139, 242),
      P(140, 244),
      P(142, 242),
      P(142, 240),
      P(142, 237),
      P(143, 235),
      P(143, 233),
      P(145, 229),
      P(146, 226),
      P(148, 217),
      P(149, 208),
      P(149, 205),
      P(151, 196),
      P(151, 193),
      P(153, 182),
      P(155, 172),
      P(157, 165),
      P(159, 160),
      P(162, 155),
      P(164, 150),
      P(165, 148),
      P(166, 146),
    ],
  },
  {
    name: 'delete',
    points: [
      P(123, 129),
      P(123, 131),
      P(124, 133),
      P(125, 136),
      P(127, 140),
      P(129, 142),
      P(133, 148),
      P(137, 154),
      P(143, 158),
      P(145, 161),
      P(148, 164),
      P(153, 170),
      P(158, 176),
      P(160, 178),
      P(164, 183),
      P(168, 188),
      P(171, 191),
      P(175, 196),
      P(178, 200),
      P(180, 202),
      P(181, 205),
      P(184, 208),
      P(186, 210),
      P(187, 213),
      P(188, 215),
      P(186, 212),
      P(183, 211),
      P(177, 208),
      P(169, 206),
      P(162, 205),
      P(154, 207),
      P(145, 209),
      P(137, 210),
      P(129, 214),
      P(122, 217),
      P(118, 218),
      P(111, 221),
      P(109, 222),
      P(110, 219),
      P(112, 217),
      P(118, 209),
      P(120, 207),
      P(128, 196),
      P(135, 187),
      P(138, 183),
      P(148, 167),
      P(157, 153),
      P(163, 145),
      P(165, 142),
      P(172, 133),
      P(177, 127),
      P(179, 127),
      P(180, 125),
    ],
  },
  {
    name: 'star',
    points: [
      P(75, 250),
      P(75, 247),
      P(77, 244),
      P(78, 242),
      P(79, 239),
      P(80, 237),
      P(82, 234),
      P(82, 232),
      P(84, 229),
      P(85, 225),
      P(87, 222),
      P(88, 219),
      P(89, 216),
      P(91, 212),
      P(92, 208),
      P(94, 204),
      P(95, 201),
      P(96, 196),
      P(97, 194),
      P(98, 191),
      P(100, 185),
      P(102, 178),
      P(104, 173),
      P(104, 171),
      P(105, 164),
      P(106, 158),
      P(107, 156),
      P(107, 152),
      P(108, 145),
      P(109, 141),
      P(110, 139),
      P(112, 133),
      P(113, 131),
      P(116, 127),
      P(117, 125),
      P(119, 122),
      P(121, 121),
      P(123, 120),
      P(125, 122),
      P(125, 125),
      P(127, 130),
      P(128, 133),
      P(131, 143),
      P(136, 153),
      P(140, 163),
      P(144, 172),
      P(145, 175),
      P(151, 189),
      P(156, 201),
      P(161, 213),
      P(166, 225),
      P(169, 233),
      P(171, 236),
      P(174, 243),
      P(177, 247),
      P(178, 249),
      P(179, 251),
      P(180, 253),
      P(180, 255),
      P(179, 257),
      P(177, 257),
      P(174, 255),
      P(169, 250),
      P(164, 247),
      P(160, 245),
      P(149, 238),
      P(138, 230),
      P(127, 221),
      P(124, 220),
      P(112, 212),
      P(110, 210),
      P(96, 201),
      P(84, 195),
      P(74, 190),
      P(64, 182),
      P(55, 175),
      P(51, 172),
      P(49, 170),
      P(51, 169),
      P(56, 169),
      P(66, 169),
      P(78, 168),
      P(92, 166),
      P(107, 164),
      P(123, 161),
      P(140, 162),
      P(156, 162),
      P(171, 160),
      P(173, 160),
      P(186, 160),
      P(195, 160),
      P(198, 161),
      P(203, 163),
      P(208, 163),
      P(206, 164),
      P(200, 167),
      P(187, 172),
      P(174, 179),
      P(172, 181),
      P(153, 192),
      P(137, 201),
      P(123, 211),
      P(112, 220),
      P(99, 229),
      P(90, 237),
      P(80, 244),
      P(73, 250),
      P(69, 254),
      P(69, 252),
    ],
  },
  {
    name: 'pigtail',
    points: [
      P(81, 219),
      P(84, 218),
      P(86, 220),
      P(88, 220),
      P(90, 220),
      P(92, 219),
      P(95, 220),
      P(97, 219),
      P(99, 220),
      P(102, 218),
      P(105, 217),
      P(107, 216),
      P(110, 216),
      P(113, 214),
      P(116, 212),
      P(118, 210),
      P(121, 208),
      P(124, 205),
      P(126, 202),
      P(129, 199),
      P(132, 196),
      P(136, 191),
      P(139, 187),
      P(142, 182),
      P(144, 179),
      P(146, 174),
      P(148, 170),
      P(149, 168),
      P(151, 162),
      P(152, 160),
      P(152, 157),
      P(152, 155),
      P(152, 151),
      P(152, 149),
      P(152, 146),
      P(149, 142),
      P(148, 139),
      P(145, 137),
      P(141, 135),
      P(139, 135),
      P(134, 136),
      P(130, 140),
      P(128, 142),
      P(126, 145),
      P(122, 150),
      P(119, 158),
      P(117, 163),
      P(115, 170),
      P(114, 175),
      P(117, 184),
      P(120, 190),
      P(125, 199),
      P(129, 203),
      P(133, 208),
      P(138, 213),
      P(145, 215),
      P(155, 218),
      P(164, 219),
      P(166, 219),
      P(177, 219),
      P(182, 218),
      P(192, 216),
      P(196, 213),
      P(199, 212),
      P(201, 211),
    ],
  },
];

// ================================================================
// 标准图形生成器
// ================================================================

function generateShapePoints(
  name: ShapeName,
  bbox: BoundingBox,
  resolution: number
): Point[] | null {
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const rx = bbox.width / 2;
  const ry = bbox.height / 2;
  const r = Math.max(rx, ry);
  const steps = resolution;
  const pts: Point[] = [];

  switch (name) {
    case 'line':
      // 直线由调用方直接处理，不走这里
      return null;

    case 'circle':
      for (let i = 0; i <= steps; i++) {
        const a = (2 * Math.PI * i) / steps;
        pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
      }
      break;

    case 'rectangle': {
      const x1 = bbox.x,
        y1 = bbox.y;
      const x2 = bbox.x + bbox.width,
        y2 = bbox.y + bbox.height;
      const seg = Math.floor(steps / 4);
      for (let i = 0; i <= seg; i++) pts.push({ x: x1 + ((x2 - x1) * i) / seg, y: y1 });
      for (let i = 1; i <= seg; i++) pts.push({ x: x2, y: y1 + ((y2 - y1) * i) / seg });
      for (let i = 1; i <= seg; i++) pts.push({ x: x2 - ((x2 - x1) * i) / seg, y: y2 });
      for (let i = 1; i <= seg; i++) pts.push({ x: x1, y: y2 - ((y2 - y1) * i) / seg });
      break;
    }

    case 'triangle': {
      const x1 = bbox.x,
        y2 = bbox.y + bbox.height,
        x2 = bbox.x + bbox.width;
      const topX = cx,
        topY = bbox.y;
      const seg = Math.floor(steps / 3);
      for (let i = 0; i <= seg; i++)
        pts.push({ x: topX + ((x2 - topX) * i) / seg, y: topY + ((y2 - topY) * i) / seg });
      for (let i = 1; i <= seg; i++) pts.push({ x: x2 - ((x2 - x1) * i) / seg, y: y2 });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: x1 + ((topX - x1) * i) / seg, y: y2 - ((y2 - topY) * i) / seg });
      break;
    }

    case 'star':
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / 10;
        const sr = i % 2 === 0 ? r : r * 0.4;
        pts.push({ x: cx + sr * Math.cos(a), y: cy + sr * Math.sin(a) });
        if (i < 10) {
          const a2 = -Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / 10;
          const sr2 = i % 2 === 0 ? r * 0.4 : r;
          const midPts = 4;
          for (let j = 1; j <= midPts; j++) {
            const t = j / (midPts + 1);
            pts.push({
              x: (1 - t) * (cx + sr * Math.cos(a)) + t * (cx + sr2 * Math.cos(a2)),
              y: (1 - t) * (cy + sr * Math.sin(a)) + t * (cy + sr2 * Math.sin(a2)),
            });
          }
        }
      }
      pts.push(pts[0]);
      break;

    case 'arrow': {
      const x1 = bbox.x,
        x2 = bbox.x + bbox.width;
      const seg = Math.floor(steps * 0.6);
      for (let i = 0; i <= seg; i++) pts.push({ x: x1 + ((x2 - x1) * i) / seg, y: cy });
      const headLen = Math.min(bbox.width * 0.3, bbox.height * 0.4);
      const hseg = Math.floor(steps * 0.2);
      for (let i = 1; i <= hseg; i++)
        pts.push({ x: x2 - (headLen * i) / hseg, y: cy - (headLen * i) / hseg });
      pts.push({ x: x2, y: cy });
      for (let i = 1; i <= hseg; i++)
        pts.push({ x: x2 - (headLen * i) / hseg, y: cy + (headLen * i) / hseg });
      break;
    }

    case 'check': {
      const x1 = bbox.x,
        y1 = bbox.y,
        x2 = bbox.x + bbox.width,
        y2 = bbox.y + bbox.height;
      const midX = x1 + bbox.width * 0.35,
        midY = y2;
      const seg = Math.floor(steps / 2);
      for (let i = 0; i <= seg; i++)
        pts.push({ x: x1 + ((midX - x1) * i) / seg, y: cy + ((midY - cy) * i) / seg });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: midX + ((x2 - midX) * i) / seg, y: y2 - ((y2 - y1) * i) / seg });
      break;
    }

    case 'x': {
      const x1 = bbox.x,
        y1 = bbox.y,
        x2 = bbox.x + bbox.width,
        y2 = bbox.y + bbox.height;
      const seg = Math.floor(steps / 2);
      for (let i = 0; i <= seg; i++)
        pts.push({ x: x1 + ((x2 - x1) * i) / seg, y: y1 + ((y2 - y1) * i) / seg });
      break;
    }

    case 'v': {
      const x1 = bbox.x,
        y1 = bbox.y,
        x2 = bbox.x + bbox.width,
        y2 = bbox.y + bbox.height;
      const seg = Math.floor(steps / 2);
      for (let i = 0; i <= seg; i++)
        pts.push({ x: x1 + ((cx - x1) * i) / seg, y: y1 + ((y2 - y1) * i) / seg });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: cx + ((x2 - cx) * i) / seg, y: y2 - ((y2 - y1) * i) / seg });
      break;
    }

    case 'caret': {
      const x1 = bbox.x,
        y1 = bbox.y,
        x2 = bbox.x + bbox.width,
        y2 = bbox.y + bbox.height;
      const seg = Math.floor(steps / 2);
      for (let i = 0; i <= seg; i++)
        pts.push({ x: x1 + ((cx - x1) * i) / seg, y: y2 - ((y2 - y1) * i) / seg });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: cx + ((x2 - cx) * i) / seg, y: y1 + ((y2 - y1) * i) / seg });
      break;
    }

    case 'zig-zag': {
      const x1 = bbox.x,
        y1 = bbox.y,
        x2 = bbox.x + bbox.width,
        y2 = bbox.y + bbox.height;
      const seg = Math.floor(steps / 4);
      for (let i = 0; i <= seg; i++) pts.push({ x: x1 + ((x2 - x1) * 0.25 * i) / seg, y: y1 });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: x1 + (x2 - x1) * (0.25 + (0.25 * i) / seg), y: y2 });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: x1 + (x2 - x1) * (0.5 + (0.25 * i) / seg), y: y1 });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: x1 + (x2 - x1) * (0.75 + (0.25 * i) / seg), y: y2 });
      break;
    }

    case 'delete': {
      const x1 = bbox.x,
        y1 = bbox.y,
        x2 = bbox.x + bbox.width,
        y2 = bbox.y + bbox.height;
      const seg = Math.floor(steps / 3);
      for (let i = 0; i <= seg; i++)
        pts.push({ x: x1 + ((x2 - x1) * i) / seg, y: y1 + ((y2 - y1) * i) / seg });
      for (let i = 1; i <= seg; i++) pts.push({ x: x2 - ((x2 - x1) * i) / seg, y: cy });
      for (let i = 1; i <= seg; i++)
        pts.push({ x: x1 + ((x2 - x1) * i) / seg, y: y2 - ((y2 - y1) * i) / seg });
      break;
    }

    case 'pigtail':
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = t * Math.PI * 2.5;
        const sr = r * (0.2 + 0.8 * t);
        pts.push({ x: cx + sr * Math.cos(a), y: cy + sr * Math.sin(a) * 0.6 });
      }
      break;

    default:
      return null;
  }

  return pts;
}

// ================================================================
// ShapeRecognizer 主类
// ================================================================

export class ShapeRecognizer {
  private _templates: Unistroke[];
  private _opts: Required<RecognizerOptions>;

  constructor(opts?: RecognizerOptions) {
    this._opts = {
      threshold: opts?.threshold ?? 0.7,
      padding: opts?.padding ?? 5,
      resolution: opts?.resolution ?? 80,
      useProtractor: opts?.useProtractor ?? true,
      lineAvgDeviationRatio: opts?.lineAvgDeviationRatio ?? 0.05,
      lineMaxDeviationRatio: opts?.lineMaxDeviationRatio ?? 0.15,
      lineMinLength: opts?.lineMinLength ?? 30,
      exclude: opts?.exclude ?? [],
    };

    // 初始化内置模板（支持排除指定图形）
    const excluded = new Set<string>(opts?.exclude ?? []);
    this._templates = BUILTIN_TEMPLATES
      .filter((t) => !excluded.has(t.name))
      .map((t) => makeUnistroke(t.name, t.points));

    // 补充圆形模板（多方向）
    const cx = 150,
      cy = 150,
      r = 60;
    const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    for (const a of angles) {
      this._templates.push(makeUnistroke('circle', makeCirclePoints(cx, cy, r, r, a, true)));
      this._templates.push(makeUnistroke('circle', makeCirclePoints(cx, cy, r, r, a, false)));
    }
    // 椭圆
    this._templates.push(
      makeUnistroke('circle', makeCirclePoints(cx, cy, 80, 50, -Math.PI / 2, true))
    );
    this._templates.push(
      makeUnistroke('circle', makeCirclePoints(cx, cy, 50, 80, -Math.PI / 2, true))
    );
    this._templates.push(makeUnistroke('circle', makeCirclePoints(cx, cy, 80, 50, 0, false)));
    this._templates.push(makeUnistroke('circle', makeCirclePoints(cx, cy, 50, 80, 0, false)));
  }

  /** 添加自定义模板 */
  addTemplate(name: string, points: Point[]): void {
    const dollarPts = points.map((p) => P(p.x, p.y));
    this._templates.push(makeUnistroke(name, dollarPts));
  }

  /** 检测是否为直线 */
  private _detectLine(
    points: Point[]
  ): { x1: number; y1: number; x2: number; y2: number; deviation: number } | null {
    if (points.length < 5) return null;
    const p0 = points[0],
      pn = points[points.length - 1];
    const dx = pn.x - p0.x,
      dy = pn.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < this._opts.lineMinLength) return null;

    let totalDev = 0,
      maxDev = 0;
    for (const p of points) {
      const d = Math.abs((pn.x - p0.x) * (p0.y - p.y) - (p0.x - p.x) * (pn.y - p0.y)) / len;
      totalDev += d;
      maxDev = Math.max(maxDev, d);
    }
    const avgDev = totalDev / points.length;

    if (
      avgDev < len * this._opts.lineAvgDeviationRatio &&
      maxDev < len * this._opts.lineMaxDeviationRatio
    ) {
      return { x1: p0.x, y1: p0.y, x2: pn.x, y2: pn.y, deviation: avgDev };
    }
    return null;
  }

  /** 用 $1 算法识别图形 */
  private _dollarRecognize(points: DollarPoint[]): DollarResult {
    const t0 = Date.now();
    const candidate = makeUnistroke('', points);

    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this._templates.length; i++) {
      const d = this._opts.useProtractor
        ? optimalCosineDistance(this._templates[i].Vector, candidate.Vector)
        : distanceAtBestAngle(
            candidate.Points,
            this._templates[i],
            -ANGLE_RANGE,
            ANGLE_RANGE,
            ANGLE_PRECISION
          );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const t1 = Date.now();
    if (bestIdx === -1) {
      return { Name: '', Score: 0, Time: t1 - t0 };
    }
    const score = this._opts.useProtractor ? 1 - bestDist : 1 - bestDist / HALF_DIAGONAL;
    return { Name: this._templates[bestIdx].Name, Score: score, Time: t1 - t0 };
  }

  /**
   * 识别手绘轨迹
   * @param points 轨迹点序列
   * @returns 识别结果，未识别到返回 null
   */
  recognize(points: Point[], thresholdOverride?: number): RecognizeResult | null {
    if (points.length < 5) return null;

    // 优先检测直线
    const line = this._detectLine(points);
    if (line) {
      return { name: 'line', score: 1.0 - line.deviation / 100, time: 0 };
    }

    if (points.length < 10) return null;

    // $1 识别
    const dollarPts = points.map((p) => P(p.x, p.y));
    const result = this._dollarRecognize(dollarPts);

    const threshold = thresholdOverride ?? this._opts.threshold;
    if (result.Score < threshold) return null;

    return {
      name: result.Name as ShapeName,
      score: result.Score,
      time: result.Time,
    };
  }

  /**
   * 识别并生成标准图形的点序列
   * @param points 轨迹点序列
   * @returns 转换结果（含标准图形点序列），未识别到返回 null
   */
  recognizeAndConvert(points: Point[], thresholdOverride?: number): ConvertResult | null {
    const result = this.recognize(points, thresholdOverride);
    if (!result) return null;

    // 计算包围盒
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const pad = this._opts.padding;
    const bbox: BoundingBox = {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };

    let shapePoints: Point[];

    if (result.name === 'line') {
      // 直线：起点到终点的均匀插值
      const p0 = points[0],
        pn = points[points.length - 1];
      shapePoints = [];
      const seg = this._opts.resolution;
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        shapePoints.push({
          x: p0.x + (pn.x - p0.x) * t,
          y: p0.y + (pn.y - p0.y) * t,
        });
      }
    } else {
      const generated = generateShapePoints(result.name, bbox, this._opts.resolution);
      if (!generated) return null;
      shapePoints = generated;
    }

    return {
      ...result,
      points: shapePoints,
      bbox,
    };
  }
}

export default ShapeRecognizer;
