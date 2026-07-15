import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const errors = [];
const dockerfile = read('frontend/Dockerfile');
const nextConfig = read('frontend/next.config.js');
const browserApi = read('frontend/src/lib/api.ts');
const serverApi = read('frontend/src/lib/serverApi.ts');
const proxyRoute = read('frontend/src/app/api/[...path]/route.ts');
const compose = read('docker-compose.yml');

if (!/output:\s*['"]standalone['"]/.test(nextConfig)) errors.push('Next.js standalone output is not enabled.');
if (!/Content-Security-Policy/.test(nextConfig)) errors.push('Frontend security headers were not preserved in the Next.js runtime.');
if (!/FROM \$\{NODE_IMAGE\} AS runner/.test(dockerfile)) errors.push('Frontend runner must use the approved pinned Node runtime.');
if (!/CMD \["node", "server\.js"\]/.test(dockerfile)) errors.push('Frontend container does not start the standalone Next.js server.');
if (/nginx|\/app\/out/i.test(dockerfile)) errors.push('Legacy static Nginx export remains in the frontend image.');
if (!/USER nextjs/.test(dockerfile)) errors.push('Frontend runtime must run as a non-root user.');
if (!/HEALTHCHECK[\s\S]*\/healthz/.test(dockerfile)) errors.push('Frontend container health check is missing.');
if (/NEXT_PUBLIC_API_URL|localhost:4000/.test(browserApi)) errors.push('Browser API code contains a public or localhost backend address.');
if (!/BROWSER_API_BASE/.test(browserApi)) errors.push('Browser API code does not use the same-origin base.');
if (!/getInternalApiBase/.test(serverApi)) errors.push('Server components do not use the server-only API address.');
if (!/await connection\(\)/.test(serverApi)) errors.push('Data-backed public pages may be frozen during the image build.');
if (!/buildInternalApiUrl/.test(proxyRoute) || !/export const POST = proxy/.test(proxyRoute)) errors.push('Same-origin API proxy is incomplete.');
if (!/INTERNAL_API_URL:\s*http:\/\/backend:4000\/api/.test(compose)) errors.push('Local containers do not use the internal backend address.');
if (!/'3000:3000'/.test(compose)) errors.push('Frontend container is not exposed on the Next.js port.');
if (fs.existsSync(path.join(root, 'frontend/nginx.conf'))) errors.push('Obsolete Nginx configuration still exists.');

if (errors.length) {
  console.error('Frontend production runtime check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Frontend runtime valid: standalone Next.js, same-origin browser API, server-only backend address.');
