export function createWorker(url: string): Worker {
  // 在开发环境和生产环境都使用 ?worker 后缀
  return new Worker(new URL(url, import.meta.url), { type: 'module' });
}
