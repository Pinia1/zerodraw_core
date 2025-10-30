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
