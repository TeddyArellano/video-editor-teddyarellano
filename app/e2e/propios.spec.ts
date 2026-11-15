// Proyecto con componentes PROPIOS (src/components distintos a la plantilla, sin `reel actualizar`): la vista previa
// los compila al vuelo y debe coincidir con `remotion still` del proyecto, como el render.
import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {FIXTURE, irA, lanzar, leer} from './util';

const PY = path.join(os.homedir(), '.reels-toolkit/venv/bin/python');

test('vista previa con los componentes del proyecto = render', async () => {
  const d = leer('src/data.json');
  const frames = [Math.floor((d.hookEnd || 60) / 2), Math.floor(d.n * 0.35), Math.floor(d.n * 0.7)];
  const {app, page} = await lanzar();
  await expect(page.getByTestId('visor')).toBeVisible();
  await expect(page.getByTestId('insignia-propios')).toHaveText('componentes del proyecto', {timeout: 60_000}).catch(async (e) => {
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
    execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Reel', still, `--frame=${f}`, '--log=error'], {cwd: FIXTURE});
    const r = JSON.parse(execFileSync(PY, [path.join(__dirname, 'comparar.py'), prev, still]).toString());
    console.log(`cuadro ${f}:`, r);
    expect(Math.max(...r.brillo.map(Math.abs))).toBeLessThan(6);
    expect(r.media).toBeLessThan(8);
    expect(r.malos).toBeLessThan(3);
  }
  await app.close();
});
