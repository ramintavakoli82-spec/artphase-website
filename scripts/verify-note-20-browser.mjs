import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pageUrl = process.argv[2] ?? 'http://127.0.0.1:4323/engineering-notes/the-hidden-sccr-trap/';
const browserPath = process.env.ARTPHASE_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9400 + Math.floor(Math.random() * 400);
const qaDirectory = await mkdtemp(join(tmpdir(), 'artphase-note20-browser-'));
const profileDirectory = join(qaDirectory, 'profile');
const screenshotHashes = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = spawn(browserPath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--disable-background-networking',
  `--user-data-dir=${profileDirectory}`,
  `--remote-debugging-port=${port}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

let browserErrors = '';
browser.stderr.on('data', (chunk) => { browserErrors += chunk.toString(); });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Browser debugging endpoint did not start. ${browserErrors}`);
}

await waitForDebugger();

const targetResponse = await fetch(
  `http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`,
  { method: 'PUT' },
);
assert(targetResponse.ok, `Could not create browser target: ${targetResponse.status}`);
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextCommandId = 1;
const pendingCommands = new Map();
const eventWaiters = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
    else pending.resolve(message.result ?? {});
    return;
  }
  const waiters = eventWaiters.get(message.method);
  if (!waiters?.length) return;
  eventWaiters.delete(message.method);
  for (const resolve of waiters) resolve(message.params ?? {});
});

function command(method, params = {}) {
  const id = nextCommandId;
  nextCommandId += 1;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCommands.delete(id);
      reject(new Error(`Timed out waiting for ${method}`));
    }, 15000);
    pendingCommands.set(id, {
      method,
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function waitForEvent(method) {
  return new Promise((resolve) => {
    const waiters = eventWaiters.get(method) ?? [];
    waiters.push(resolve);
    eventWaiters.set(method, waiters);
  });
}

async function evaluate(expression, awaitPromise = false) {
  const result = await command('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function navigate(url) {
  const loaded = waitForEvent('Page.loadEventFired');
  await command('Page.navigate', { url });
  await loaded;
  await evaluate(`new Promise(async (resolve) => {
    const images = [...document.images];
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((done) => {
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
    })));
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`, true);
}

async function screenshot(name) {
  const result = await command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const path = join(qaDirectory, `${name}.png`);
  const buffer = Buffer.from(result.data, 'base64');
  await writeFile(path, buffer);
  screenshotHashes.set(name, createHash('sha256').update(buffer).digest('hex'));
  return path;
}

async function setViewport(width, height, mobile, reducedMotion = false) {
  await command('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
  await command('Emulation.setEmulatedMedia', {
    media: 'screen',
    features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
  });
}

const metricsExpression = `(() => {
  const rect = (element) => element ? (() => {
    const value = element.getBoundingClientRect();
    return { x: value.x, y: value.y, width: value.width, height: value.height };
  })() : null;
  const style = (element) => element ? getComputedStyle(element) : null;
  const h1 = document.querySelector('.article-header h1');
  const prose = document.querySelector('.prose');
  const animation = document.querySelector('.motion-animation');
  const poster = document.querySelector('.reduced-motion-poster');
  const tableScroll = document.querySelector('.engineering-table .table-scroll');
  const references = [...document.querySelectorAll('.references li a')];
  return {
    viewport: { width: innerWidth, height: innerHeight },
    documentWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    h1: { rect: rect(h1), fontSize: style(h1)?.fontSize, lineHeight: style(h1)?.lineHeight },
    prose: { fontSize: style(prose)?.fontSize, lineHeight: style(prose)?.lineHeight },
    animation: {
      rect: rect(animation), display: style(animation)?.display,
      naturalWidth: animation?.naturalWidth, naturalHeight: animation?.naturalHeight,
      complete: animation?.complete,
    },
    poster: {
      rect: rect(poster), display: style(poster)?.display,
      naturalWidth: poster?.naturalWidth, naturalHeight: poster?.naturalHeight,
      complete: poster?.complete,
    },
    table: tableScroll ? {
      clientWidth: tableScroll.clientWidth,
      scrollWidth: tableScroll.scrollWidth,
      overflowX: style(tableScroll).overflowX,
    } : null,
    references: {
      count: references.length,
      invalid: references.filter((link) => !link.href || !link.textContent.trim()).length,
    },
    headingCount: document.querySelectorAll('.prose h2').length,
    layoutShift: (window.__note20LayoutShifts ?? []).reduce((sum, value) => sum + value, 0),
  };
})()`;

const animationExpression = `(async () => {
  const image = document.querySelector('.motion-animation');
  if (!image || getComputedStyle(image).display === 'none') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 108;
  canvas.height = 135;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const hashes = [];
  const rects = [];
  const hashFrame = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let index = 0; index < pixels.length; index += 4) {
      hash ^= pixels[index]; hash = Math.imul(hash, 16777619);
      hash ^= pixels[index + 1]; hash = Math.imul(hash, 16777619);
      hash ^= pixels[index + 2]; hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  for (let sample = 0; sample < 5; sample += 1) {
    const box = image.getBoundingClientRect();
    rects.push({ x: box.x, y: box.y, width: box.width, height: box.height });
    hashes.push(hashFrame());
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const first = rects[0];
  const stableGeometry = rects.every((box) =>
    Math.abs(box.x - first.x) < 0.1 && Math.abs(box.y - first.y) < 0.1 &&
    Math.abs(box.width - first.width) < 0.1 && Math.abs(box.height - first.height) < 0.1
  );
  return { hashes, uniqueFrames: new Set(hashes).size, rects, stableGeometry };
})()`;

await command('Page.enable');
await command('Runtime.enable');
await command('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__note20LayoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__note20LayoutShifts.push(entry.value);
    }).observe({ type: 'layout-shift', buffered: true });`,
});

const report = { pageUrl, browserPath, qaDirectory };

await setViewport(1440, 1000, false, false);
await navigate(`${pageUrl}?qa=desktop`);
report.desktop = await evaluate(metricsExpression);
report.desktop.screenshots = { top: await screenshot('desktop-top') };
await evaluate(`document.querySelector('.motion-animation').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await delay(150);
report.desktop.screenshots.heroA = await screenshot('desktop-hero-a');
await delay(400);
report.desktop.screenshots.heroB = await screenshot('desktop-hero-b');
report.desktop.animationPlayback = await evaluate(animationExpression, true);
report.desktop.animationPlayback.screenshotFrameHashes = [screenshotHashes.get('desktop-hero-a'), screenshotHashes.get('desktop-hero-b')];
await evaluate(`document.querySelector('.engineering-table').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await delay(150);
report.desktop.screenshots.table = await screenshot('desktop-table');
await evaluate(`document.querySelector('.references').scrollIntoView({ block: 'start', behavior: 'instant' })`);
await delay(150);
report.desktop.screenshots.references = await screenshot('desktop-references');

await setViewport(390, 844, true, false);
await navigate(`${pageUrl}?qa=mobile`);
report.mobile = await evaluate(metricsExpression);
report.mobile.screenshots = { top: await screenshot('mobile-top') };
await evaluate(`document.querySelector('.motion-animation').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await delay(150);
report.mobile.screenshots.hero = await screenshot('mobile-hero');
await delay(400);
report.mobile.screenshots.heroB = await screenshot('mobile-hero-b');
report.mobile.animationPlayback = await evaluate(animationExpression, true);
report.mobile.animationPlayback.screenshotFrameHashes = [screenshotHashes.get('mobile-hero'), screenshotHashes.get('mobile-hero-b')];
await evaluate(`document.querySelector('.engineering-table').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await delay(150);
report.mobile.screenshots.table = await screenshot('mobile-table');
await evaluate(`document.querySelector('.references').scrollIntoView({ block: 'start', behavior: 'instant' })`);
await delay(150);
report.mobile.screenshots.references = await screenshot('mobile-references');

await setViewport(390, 844, true, true);
await navigate(`${pageUrl}?qa=reduced-motion`);
report.reducedMotion = await evaluate(metricsExpression);
await evaluate(`document.querySelector('.reduced-motion-poster').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await delay(150);
report.reducedMotion.screenshot = await screenshot('mobile-reduced-motion');

console.log(JSON.stringify(report, null, 2));
socket.close();
browser.kill();

for (const view of [report.desktop, report.mobile]) {
  assert(!view.horizontalOverflow, `Page has horizontal overflow at ${view.viewport.width}px`);
  assert(view.animation.complete && view.animation.naturalWidth === 1080 && view.animation.naturalHeight === 1350, 'GIF did not load at its approved dimensions');
  assert(new Set(view.animationPlayback?.screenshotFrameHashes).size >= 2, 'GIF playback was not detected in timed screenshots');
  assert(view.animationPlayback?.stableGeometry, 'GIF geometry changed during playback');
  assert(view.references.count === 9 && view.references.invalid === 0, 'References are incomplete or invalid');
  assert(view.table.overflowX === 'auto', 'Table wrapper is not horizontally scrollable');
  assert(view.layoutShift < 0.01, `Unexpected layout shift: ${view.layoutShift}`);
}

assert(Number.parseFloat(report.mobile.prose.fontSize) >= 16, 'Mobile prose font is smaller than 16px');
assert(report.mobile.table.scrollWidth >= report.mobile.table.clientWidth, 'Mobile table width measurement is invalid');
assert(report.reducedMotion.animation.display === 'none', 'Animated GIF remains visible for reduced-motion users');
assert(report.reducedMotion.poster.display !== 'none', 'Reduced-motion poster is not visible');
assert(report.reducedMotion.poster.complete && report.reducedMotion.poster.naturalWidth === 1080 && report.reducedMotion.poster.naturalHeight === 1350, 'Reduced-motion poster did not load');
assert(!report.reducedMotion.horizontalOverflow, 'Reduced-motion mobile page has horizontal overflow');
