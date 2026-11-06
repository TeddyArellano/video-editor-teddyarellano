// Requisito 2: la vista previa es fiel al render. Se captura el Player en varios cuadros y se compara con
// `npx remotion still` del mismo cuadro (misma plantilla, mismos datos).
import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {FIXTURE, lanzar, leer} from './util';

const PY = path.join(os.homedir(), '.reels-toolkit/venv/bin/python');
const REEL = path.join(__dirname, '../../skill/editar-reel/scripts/reel.py');

test('vista previa = render (stills de Remotion)', async () => {
  execFileSync(PY, [REEL, 'actualizar', '-p', FIXTURE]); // el fixture usa la plantilla actual de la skill
  const d = leer('src/data.json');
  const mid = (x: {a: number; b: number}) => Math.floor((x.a + x.b) / 2);
  const frames = [Math.floor(d.hookEnd / 2), mid(d.labels[0]), mid(d.labels[2]), mid(d.images[0]), mid(d.calendario[0]), d.secs[2].a + 20];
  const {app, page} = await lanzar();
  await expect(page.getByTestId('visor')).toBeVisible();
  await expect(page.getByText('vista aproximada')).toHaveCount(0);
  await page.getByText('Ocultar guías').click();
  const reproductor = page.locator('[data-testid=visor] > div').first();
  for (const f of frames) {
    await page.keyboard.press('Home');
    for (let k = 0; k < Math.floor(f / 30); k++) await page.keyboard.press('Shift+ArrowRight');
    for (let k = 0; k < f % 30; k++) await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('tiempo')).toContainText(`${Math.floor(f / 30 / 60)}:${String(Math.floor(f / 30) % 60).padStart(2, '0')}.${String(f % 30).padStart(2, '0')}`);
    // el <video> terminó de buscar el cuadro
    await expect.poll(() => page.locator('[data-testid=visor] video').first().evaluate((v: HTMLVideoElement) => !v.seeking && v.readyState >= 2)).toBe(true);
    await page.waitForTimeout(700);
    const prev = path.join(__dirname, '../test-results', `prev_${f}.png`);
    const still = path.join(__dirname, '../test-results', `still_${f}.png`);
    await reproductor.screenshot({path: prev});
    execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Reel', still, `--frame=${f}`, '--log=error'], {cwd: FIXTURE});
    const r = JSON.parse(execFileSync(PY, [path.join(__dirname, 'comparar.py'), prev, still]).toString());
    console.log(`cuadro ${f}:`, r);
    expect(Math.max(...r.brillo.map(Math.abs))).toBeLessThan(16);
    expect(r.media).toBeLessThan(6);
    expect(r.malos).toBeLessThan(3);
  }
  await app.close();
});
