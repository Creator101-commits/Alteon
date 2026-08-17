import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative, resolve } from 'node:path';

const distDirectory = resolve('dist');
const assetsDirectory = join(distDirectory, 'assets');
const html = readFileSync(join(distDirectory, 'index.html'), 'utf8');

const initialJavaScriptAssets = [
  ...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)"/g),
].map((match) => match[1]);

if (initialJavaScriptAssets.length === 0) {
  throw new Error('No initial JavaScript assets were found in dist/index.html');
}

const uniqueInitialAssets = [...new Set(initialJavaScriptAssets)];
const readAsset = (assetPath) => readFileSync(join(distDirectory, assetPath.slice(1)));
const initialAssets = uniqueInitialAssets.map((assetPath) => ({
  path: assetPath,
  bytes: readAsset(assetPath),
}));
const entryAsset = initialAssets[0];
const allJavaScriptAssets = readdirSync(assetsDirectory)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({
    path: join(assetsDirectory, file),
    bytes: readFileSync(join(assetsDirectory, file)),
  }));
const largestAsset = allJavaScriptAssets.reduce((largest, asset) =>
  asset.bytes.byteLength > largest.bytes.byteLength ? asset : largest,
);

const limits = {
  entryGzipBytes: 150 * 1024,
  initialJavaScriptGzipBytes: 450 * 1024,
  largestJavaScriptBytes: 800 * 1024,
};

const entryGzipBytes = gzipSync(entryAsset.bytes).byteLength;
const initialJavaScriptGzipBytes = initialAssets.reduce(
  (total, asset) => total + gzipSync(asset.bytes).byteLength,
  0,
);
const largestJavaScriptBytes = largestAsset.bytes.byteLength;
const violations = [];

if (entryGzipBytes > limits.entryGzipBytes) {
  violations.push(`entry gzip is ${entryGzipBytes} bytes (limit ${limits.entryGzipBytes})`);
}
if (initialJavaScriptGzipBytes > limits.initialJavaScriptGzipBytes) {
  violations.push(
    `initial JavaScript gzip is ${initialJavaScriptGzipBytes} bytes (limit ${limits.initialJavaScriptGzipBytes})`,
  );
}
if (largestJavaScriptBytes > limits.largestJavaScriptBytes) {
  violations.push(
    `largest JavaScript chunk is ${largestJavaScriptBytes} bytes (limit ${limits.largestJavaScriptBytes})`,
  );
}

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;
console.log(`Entry gzip: ${formatBytes(entryGzipBytes)}`);
console.log(`Initial JavaScript gzip: ${formatBytes(initialJavaScriptGzipBytes)}`);
console.log(
  `Largest JavaScript chunk: ${formatBytes(largestJavaScriptBytes)} (${relative(process.cwd(), largestAsset.path)})`,
);

if (violations.length > 0) {
  throw new Error(`Production performance budget exceeded:\n- ${violations.join('\n- ')}`);
}
