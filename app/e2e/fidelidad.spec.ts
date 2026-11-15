// Requisito 2: la vista previa es fiel al render. Se captura el Player en varios cuadros y se compara con
// `npx remotion still` del mismo cuadro (misma plantilla, mismos datos).
import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {FIXTURE, irA, lanzar, leer} from './util';

const PY = path.join(os.homedir(), '.reels-toolkit/venv/bin/python');
const REEL = path.join(__dirname, '../../skill/editar-reel/scripts/reel.py');

test('vista previa = render (stills de Remotion)', async () => {
  execFileSync(PY, [REEL, 'actualizar', '-p', FIXTURE]); // el fixture usa la plantilla actual de la skill
  const d = leer('src/data.json');
  const mid = (x: {a: number; b: number}) => Math.floor((x.a + x.b) / 2);
  // lejos de los cortes: justo después de uno, el <video> de la vista previa busca con menos precisión (cambio de toma)
  const inicios = (leer('edicion/edl_final.json') as {start: number}[]).map((t) => t.start).filter((x) => x > 0);
  const lejos = (f: number) => {
    const c = inicios.find((x) => f >= x - 3 && f < x + 12);
    return c === undefined ? f : c + 12;
  };
  const frames = [Math.floor(d.hookEnd / 2), mid(d.labels[0]), mid(d.labels[2]), mid(d.images[0]), mid(d.calendario[0]), d.secs[2].a + 20].map(lejos);
  const {app, page} = await lanzar();
  await expect(page.getByTestId('visor')).toBeVisible();
  await expect(page.getByText('vista aproximada')).toHaveCount(0);
  await page.getByText('Ocultar guías').click();
  const reproductor = page.locator('[data-testid=visor] > div').first();
  for (const f of frames) {
    await irA(page, f);
    await expect(page.getByTestId('tiempo')).toContainText(`${Math.floor(f / 30 / 60)}:${String(Math.floor(f / 30) % 60).padStart(2, '0')}.${String(f % 30).padStart(2, '0')}`);
    // el <video> terminó de buscar el cuadro
    await expect.poll(() => page.locator('[data-testid=visor] video').first().evaluate((v: HTMLVideoElement) => !v.seeking && v.readyState >= 2)).toBe(true);
    await page.waitForTimeout(700);
    const prev = path.join(__dirname, '../test-results', `prev_${f}.png`);
    const still = path.join(__dirname, '../test-results', `still_${f}.png`);
    await reproductor.screenshot({path: prev});
    // el <video> de la vista previa puede quedar ±1 cuadro al buscar: se compara con f−1, f y f+1 y gana el más parecido
    const rs = [f - 1, f, f + 1].map((g) => {
      const st = still.replace(/\.png$/, `_${g}.png`);
      execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Reel', st, `--frame=${g}`, '--log=error'], {cwd: FIXTURE});
      return JSON.parse(execFileSync(PY, [path.join(__dirname, 'comparar.py'), prev, st]).toString()) as {brillo: number[]; media: number; malos: number};
    });
    const r = rs.reduce((m, x) => (x.media < m.media ? x : m));
    console.log(`cuadro ${f}:`, r);
    expect(Math.max(...r.brillo.map(Math.abs))).toBeLessThan(6); // con la gamma de la vista previa (Visor.tsx) el color coincide
    // el <video> de la vista previa puede quedar ±1 cuadro al buscar (el render es exacto): en tomas con mucho
    // movimiento eso sube la media; los gráficos (lo que se edita) coinciden igual
    expect(r.media).toBeLessThan(8);
    expect(r.malos).toBeLessThan(3);
  }
  await app.close();
});
