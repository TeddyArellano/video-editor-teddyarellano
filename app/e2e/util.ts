import {_electron as electron, type ElectronApplication, type Page} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const FIXTURE = process.env.REEL_FIXTURE ?? '';
export const leer = (rel: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, rel), 'utf8'));
export const escribir = (rel: string, obj: unknown) => fs.writeFileSync(path.join(FIXTURE, rel), JSON.stringify(obj, null, 2));

export const lanzar = async (abrir = true): Promise<{app: ElectronApplication; page: Page}> => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-studio-e2e-'));
  const app = await electron.launch({
    args: [path.join(__dirname, '..', 'out', 'main', 'index.js')],
    env: {...process.env, REEL_USER_DATA: userData, ...(abrir ? {REEL_ABRIR: FIXTURE} : {})},
  });
  const page = await app.firstWindow();
  page.on('console', (m) => m.type() === 'error' && console.log('[renderer]', m.text().slice(0, 300)));
  return {app, page};
};

// espera hasta que fn() sea verdadero (archivos que escribe la app o reel.py)
export const hasta = async (fn: () => boolean, ms = 30_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if (fn()) return;
    } catch {
      /* archivo a medio escribir */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('tiempo agotado esperando la condición');
};
