import {_electron as electron, type ElectronApplication, type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const FIXTURE = process.env.REEL_FIXTURE ?? '';
// cada prueba que genera caché pesada la limpia al final con `reel limpiar` (el disco de trabajo puede ir justo)
export const limpiarCache = (proyecto: string) => {
  try {
    execFileSync(path.join(os.homedir(), '.reels-toolkit/venv/bin/python'), [path.join(__dirname, '../../skill/editar-reel/scripts/reel.py'), 'limpiar', '-p', proyecto]);
  } catch {
    /* proyecto ya borrado */
  }
};
export const leer = (rel: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, rel), 'utf8'));
export const escribir = (rel: string, obj: unknown) => fs.writeFileSync(path.join(FIXTURE, rel), JSON.stringify(obj, null, 2));

// abrir: true = el fixture (REEL_FIXTURE) · false = nada · "<ruta>" = ese proyecto
export const lanzar = async (abrir: boolean | string = true, userData = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-studio-e2e-'))): Promise<{app: ElectronApplication; page: Page; userData: string}> => {
  // REEL_EJECUTABLE=dist/mac-arm64/Reel Studio.app/Contents/MacOS/Reel Studio → prueba la app empaquetada
  const ejecutable = process.env.REEL_EJECUTABLE;
  const app = await electron.launch({
    ...(ejecutable ? {executablePath: ejecutable, args: []} : {args: [path.join(__dirname, '..', 'out', 'main', 'index.js')]}),
    env: {...process.env, REEL_USER_DATA: userData, ...(abrir ? {REEL_ABRIR: typeof abrir === 'string' ? abrir : FIXTURE} : {})},
  });
  const page = await app.firstWindow();
  page.on('console', (m) => m.type() === 'error' && console.log('[renderer]', m.text().slice(0, 300)));
  return {app, page, userData};
};

// espera hasta que fn() sea verdadero (archivos que escribe la app o reel.py)
export const hasta = async (fn: () => boolean, ms = 30_000) => {
  const donde = new Error().stack?.split('\n')[2]?.trim() ?? '';
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if (fn()) return;
    } catch {
      /* archivo a medio escribir */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`tiempo agotado esperando la condición (${donde})`);
};

// lleva el cabezal al cuadro f con el teclado (Home, Shift+→ = 1 s, → = 1 cuadro)
export const irA = async (page: Page, f: number) => {
  await page.keyboard.press('Home');
  for (let k = 0; k < Math.floor(f / 30); k++) await page.keyboard.press('Shift+ArrowRight');
  for (let k = 0; k < f % 30; k++) await page.keyboard.press('ArrowRight');
};
