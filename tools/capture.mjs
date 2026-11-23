// Capture real gameplay frames from the game running in headless Chromium.
//   node tools/capture.mjs <url> <outdir> <seconds> <fps>
// Screenshots the page at <fps> frames per second for <seconds> seconds and
// saves frame-0000.png, frame-0001.png, ... into <outdir>. Exits non-zero if
// the page logs a console error or throws, so a bad build fails loudly.
// Uses only Node's standard library (global WebSocket, child_process, fs).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9223;

const [url, outdir, secondsArg, fpsArg] = process.argv.slice(2);
const seconds = Number(secondsArg || '10');
const fps = Number(fpsArg || '10');
mkdirSync(outdir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (res.ok) return await res.json();
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('devtools did not come up on port ' + PORT);
}

const chrome = spawn(CHROME, [
  '--headless', `--remote-debugging-port=${PORT}`,
  '--window-size=1080,1920', '--hide-scrollbars',
  '--no-sandbox', '--disable-dev-shm-usage', 'about:blank',
], { stdio: 'ignore' });

let errors = [];
try {
  await getJson('/json/version');
  const targets = await getJson('/json/list');
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 1;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 400));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 400));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push('log: ' + msg.params.entry.text.slice(0, 400));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false,
  });
  await send('Page.navigate', { url });
  await sleep(1500); // let the game boot and settle

  const total = Math.round(seconds * fps);
  const interval = 1000 / fps;
  for (let i = 0; i < total; i++) {
    const t0 = Date.now();
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${outdir}/frame-${String(i).padStart(4, '0')}.png`, Buffer.from(shot.data, 'base64'));
    if (i % 25 === 0) {
      const state = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({score: window.__snake?.score, dead: window.__snake?.dead, len: window.__snake?.length})',
        returnByValue: true,
      });
      console.log(`frame ${i}/${total} state=${state.result?.value}`);
    }
    const wait = interval - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
  }
  console.log(`captured ${total} frames to ${outdir}`);
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}

if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('no console/page errors');
