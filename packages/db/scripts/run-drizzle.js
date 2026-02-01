import { spawn } from 'child_process';
import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载根目录的 .env 文件
config({ path: resolve(__dirname, '../../../.env') });

// 获取命令行参数
const args = process.argv.slice(2);

// 执行 drizzle-kit
const drizzleKit = spawn('drizzle-kit', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

drizzleKit.on('exit', (code) => {
  process.exit(code);
});
