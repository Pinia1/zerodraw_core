/** 快速 smoke test：验证插件化后各 API 是否可达 */
const BASE = 'http://127.0.0.1:3070';

async function req(method: string, path: string, opts?: { token?: string; body?: unknown }) {
  const headers: Record<string, string> = {};
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts?.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  const results: string[] = [];

  const health = await req('GET', '/health');
  results.push(`GET /health → ${health.status} ${health.json?.data?.status ?? health.json?.message}`);

  const guest = await req('POST', '/api/auth/guest', {
    body: { fingerprint: 'smoke-test-fingerprint-001234567890' },
  });
  const token = guest.json?.data?.token as string | undefined;
  results.push(`POST /api/auth/guest → ${guest.status} token=${token ? 'ok' : 'missing'}`);

  if (!token) {
    console.log(results.join('\n'));
    process.exit(1);
  }

  const agentList = await req('GET', '/api/agent?page=1&pageSize=10', { token });
  results.push(`GET /api/agent → ${agentList.status} code=${agentList.json?.code}`);

  const agentCreate = await req('POST', '/api/agent', {
    token,
    body: {},
  });
  const sessionId = agentCreate.json?.data?.id as string | undefined;
  results.push(
    `POST /api/agent → ${agentCreate.status} session=${sessionId ?? agentCreate.json?.message}`,
  );

  const projects = await req('GET', '/api/project?page=1&pageSize=10', { token });
  results.push(`GET /api/project → ${projects.status} code=${projects.json?.code}`);

  console.log(results.join('\n'));
  const failed = results.filter((r) => !r.includes('→ 200'));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
