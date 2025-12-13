/**
 * 统一的设备/平台判断工具。
 *
 * 设计原则：
 * - 尽量基于 feature detect（比如触摸能力），UA/platform 仅用于区分 Windows/Mac/iOS/iPad 等。
 * - iPadOS 13+ 的 UA 可能伪装成 Mac，需要额外用 maxTouchPoints 辅助识别。
 * - 所有导出都在浏览器环境下才有意义；SSR 下会返回 false/unknown。
 */

export type PlatformOS = 'windows' | 'mac' | 'ios' | 'android' | 'linux' | 'unknown';

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

const ua = isBrowser ? navigator.userAgent : '';
const platformStr = isBrowser ? navigator.platform || '' : '';

export const hasTouch = isBrowser
  ? ('maxTouchPoints' in navigator && (navigator as any).maxTouchPoints > 0) ||
    'ontouchstart' in window
  : false;

export const isWindows = isBrowser ? /Win/i.test(platformStr) || /Windows/i.test(ua) : false;

export const isMac = isBrowser ? /Mac/i.test(platformStr) || /Macintosh/i.test(ua) : false;

export const isAndroid = isBrowser ? /Android/i.test(ua) : false;

export const isIPhone = isBrowser ? /iPhone/i.test(ua) : false;

export const isIPad = isBrowser
  ? /iPad/i.test(ua) ||
    // iPadOS 13+：UA 可能包含 Macintosh，但有触摸点
    (isMac && hasTouch)
  : false;

export const isIOS = isBrowser ? isIPhone || isIPad || /iPod/i.test(ua) : false;

export const isMobile = isBrowser ? isAndroid || isIOS : false;

export const os: PlatformOS = (() => {
  if (!isBrowser) return 'unknown';
  if (isWindows) return 'windows';
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  if (isMac) return 'mac';
  if (/Linux/i.test(platformStr) || /Linux/i.test(ua)) return 'linux';
  return 'unknown';
})();

export function getPlatformDebugInfo() {
  return {
    os,
    isWindows,
    isMac,
    isIOS,
    isIPad,
    isIPhone,
    isAndroid,
    isMobile,
    hasTouch,
    ua,
    platform: platformStr,
    maxTouchPoints: isBrowser ? (navigator as any).maxTouchPoints : 0,
  };
}
