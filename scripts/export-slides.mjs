// Windows / macOS / Linux 共通のスライド画像出力。Python 3.10 以上を使用する。
// npm run slides -- presentation/ファイル名.pptx（または .pdf）
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const candidates = process.env.PYTHON
  ? [[process.env.PYTHON]]
  : process.platform === 'win32'
    ? [['python'], ['py', '-3'], ['python3']]
    : [['python3'], ['python']];
const env = { ...process.env, PYTHONUTF8: '1' };
const python = candidates.find(([command, ...args]) => {
  const result = spawnSync(command, [...args, '-c', 'import sys; print(sys.version_info.major, sys.version_info.minor)'], { encoding: 'utf8', env });
  const [major, minor] = (result.stdout || '').trim().split(/\s+/).map(Number);
  return result.status === 0 && major === 3 && minor >= 10;
});

if (!python) {
  console.error('Python 3.10 以上が必要です。Python をインストールし、PATH または PYTHON 環境変数を設定してください。');
  process.exit(1);
}
const [command, ...args] = python;
const result = spawnSync(command, [
  ...args, fileURLToPath(new URL('./export_slides.py', import.meta.url)), ...process.argv.slice(2),
], { stdio: 'inherit', env });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
