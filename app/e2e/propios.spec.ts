// Proyecto con componentes PROPIOS (src/components distintos a la plantilla, sin `reel actualizar`): la vista previa
// los compila al vuelo y debe coincidir con `remotion still` del proyecto, como el render.
import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {irA, lanzar} from './util';

const PY = path.join(os.homedir(), '.reels-toolkit/venv/bin/python');
// proyecto con componentes propios de una plantilla anterior (sin `reel actualizar`)
const FIXTURE = process.env.REEL_FIXTURE_PROPIOS ?? '';
const leer = (rel: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, rel), 'utf8'));

test('vista previa con los componentes del proyecto = render', async () => {
  test.skip(!FIXTURE, 'falta REEL_FIXTURE_PROPIOS');
  const d = leer('src/data.json');
  const frames = [Math.floor((d.hookEnd || 60) / 2), Math.floor(d.n * 0.35), Math.floor(d.n * 0.7)];
  const {app, page} = await lanzar(FIXTURE);
  await expect(page.getByTestId('visor')).toBeVisible();
  // componentes de una plantilla anterior: abre en la vista editable y un clic cambia a la exacta
  await expect(page.getByTestId('insignia-propios')).toHaveText('vista editable · ver exacta', {timeout: 60_000}).catch(async (e) => {
    console.log('DIAG propios:', await page.getByTestId('insignia-propios').getAttribute('title'));
    throw e;
  });
  await page.getByTestId('insignia-propios').click();
  await expect(page.getByTestId('insignia-propios')).toHaveText('componentes del proyecto').catch(async (e) => {
    console.log('DIAG propios:', await page.getByTestId('insignia-propios').getAttribute('title'));
    throw e;
  });
  await page.getByText('Ocultar guías').click();
  const reproductor = page.locator('[data-testid=visor] > div').first();
  for (const f of frames) {
    await irA(page, f);
    await expect.poll(() => page.locator('[data-testid=visor] video').first().evaluate((v: HTMLVideoElement) => !v.seeking && v.readyState >= 2)).toBe(true).catch(async (e) => {
      console.log('DIAG base:', await page.evaluate(() => [window.remotion_staticBase, (window.__reelDeps!.remotion as {staticFile: (s: string) => string}).staticFile('cut.mp4'), document.baseURI]));
      console.log('DIAG video:', await page.locator('[data-testid=visor] video').evaluateAll((l) => l.map((v) => [(v as HTMLVideoElement).src, (v as HTMLVideoElement).readyState, (v as HTMLVideoElement).error?.message])));
      throw e;
    });
    await page.waitForTimeout(900);
    const prev = path.join(__dirname, '../test-results', `propios_prev_${f}.png`);
    const still = path.join(__dirname, '../test-results', `propios_still_${f}.png`);
    await reproductor.screenshot({path: prev});
    // el <video> de la vista previa puede quedar ±1 cuadro al buscar: se compara con f−1, f y f+1 y gana el más parecido
    const rs = [f - 1, f, f + 1].map((g) => {
      const st = still.replace(/\.png$/, `_${g}.png`);
      execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Reel', st, `--frame=${g}`, '--log=error'], {cwd: FIXTURE});
      return JSON.parse(execFileSync(PY, [path.join(__dirname, 'comparar.py'), prev, st]).toString()) as {brillo: number[]; media: number; malos: number};
    });
    const r = rs.reduce((m, x) => (x.media < m.media ? x : m));
    console.log(`cuadro ${f}:`, r);
    expect(Math.max(...r.brillo.map(Math.abs))).toBeLessThan(6);
    expect(r.media).toBeLessThan(8);
    expect(r.malos).toBeLessThan(3);
  }
  await app.close();
});
