// Capas estilo CapCut: panel Medios (superpuesto y pista de audio con "+"), texto libre con fotogramas clave,
// transición de corte y ajuste de color. Todo se verifica en eventos.json y en el data.json que regenera `reel datos`.
import {expect, test, type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {FIXTURE, hasta, lanzar, leer} from './util';

const ev = () => leer('edicion/eventos.json');
const data = () => leer('src/data.json');
const arrastrar = async (page: Page, sel: string, dx: number, dy: number) => {
  const b = (await page.locator(sel).first().boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(b.x + b.width / 2 + (dx * k) / 8, b.y + b.height / 2 + (dy * k) / 8);
  await page.mouse.up();
};

test('capas: medios, texto con claves, transición y ajuste', async () => {
  // medios de prueba en public/ (como si se hubieran importado)
  const pub = path.join(FIXTURE, 'public');
  fs.mkdirSync(path.join(pub, 'img'), {recursive: true});
  fs.mkdirSync(path.join(pub, 'audio'), {recursive: true});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x2F80ED:s=480x320', '-frames:v', '1', path.join(pub, 'img', 'capa_e2e.png')]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=440:d=4', path.join(pub, 'audio', 'tono_e2e.wav')]);
  const previo = ev();
  for (const k of ['textos', 'superpuestos', 'audios', 'ajustes', 'transiciones_corte']) delete previo[k];
  fs.writeFileSync(path.join(FIXTURE, 'edicion/eventos.json'), JSON.stringify(previo, null, 1));

  const {app, page} = await lanzar();
  await expect(page.getByTestId('editor')).toBeVisible();

  // --- Medios: imagen como superpuesto y audio como pista, en el cabezal
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.getByTestId('tab-medios').click();
  await expect(page.getByTestId('medio-img/capa_e2e.png')).toBeVisible();
  await page.getByTestId('agregar-medio-img/capa_e2e.png').click();
  await hasta(() => ev().superpuestos?.[0]?.src === 'img/capa_e2e.png');
  await page.getByTestId('tab-medios').click();
  await page.getByTestId('agregar-medio-audio/tono_e2e.wav').click();
  await hasta(() => ev().audios?.[0]?.src === 'audio/tono_e2e.wav');
  expect(ev().audios[0].dur).toBeCloseTo(4, 1); // la duración del archivo
  await hasta(() => data().superpuestos?.length === 1 && data().audios?.length === 1, 40_000);
  await expect(page.getByTestId('bloque-superpuestos-0')).toBeVisible();
  await expect(page.getByTestId('bloque-audios-0')).toBeVisible();

  // --- texto libre: agregar, escribir, clave en 2 s, otra clave 1 s después moviéndolo en el lienzo
  await page.getByTestId('tab-inspector').click();
  await page.locator('body').click({position: {x: 5, y: 300}});
  await page.keyboard.press('Escape');
  await page.getByTestId('agregar-textos').click();
  await page.getByTestId('inspector').locator('textarea').first().fill('HOLA CAPCUT');
  await hasta(() => ev().textos?.[0]?.texto === 'HOLA CAPCUT');
  await page.getByTestId('agregar-clave').click();
  await hasta(() => (ev().textos[0].claves ?? []).length >= 1);
  await page.locator('body').click({position: {x: 5, y: 300}});
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByTestId('seleccion')).toBeVisible().catch(async (e) => {
    console.log('DIAG capas', await page.evaluate(() => ({reels: [...document.querySelectorAll('[data-testid=visor] [data-reel]')].map((x) => x.getAttribute('data-reel')), tiempo: document.querySelector('[data-testid=tiempo]')?.textContent, insp: document.querySelector('[data-testid=inspector] h3')?.textContent})));
    throw e;
  });
  await arrastrar(page, '[data-testid=seleccion] > div', 80, 0);
  await hasta(() => (ev().textos[0].claves ?? []).length >= 2 && ev().textos[0].claves.some((c: {dx?: number}) => (c.dx ?? 0) > 60));
  expect(ev().textos[0].dx).toBeUndefined(); // con claves, mover edita la clave (no la posición fija)
  await hasta(() => (data().textos?.[0]?.claves ?? []).length >= 2, 40_000);
  await page.screenshot({path: 'test-results/capas-texto.png'});

  // --- transición en el corte más cercano y ajuste de color con filtro
  await page.locator('body').click({position: {x: 5, y: 300}});
  await page.keyboard.press('Escape');
  await page.getByTestId('agregar-tcortes').click();
  await hasta(() => ev().transiciones_corte?.length === 1);
  await page.getByTestId('inspector').locator('select').first().selectOption('negro');
  await hasta(() => ev().transiciones_corte[0].tipo === 'negro');
  await page.keyboard.press('Escape');
  await page.getByTestId('agregar-ajustes').click();
  await hasta(() => ev().ajustes?.length === 1);
  await page.getByTestId('num-saturacion').fill('-60');
  await hasta(() => ev().ajustes[0].saturacion === -60);
  await hasta(() => data().tcortes?.length === 1 && data().ajustes?.[0]?.saturacion === -60, 40_000);
  // la transición quedó centrada en un corte entre tramos
  const edl = leer('edicion/edl_final.json') as {start: number}[];
  const t = data().tcortes[0];
  expect(edl.slice(1).some((p) => Math.abs(p.start - (t.a + t.b) / 2) <= 1)).toBe(true);
  await page.screenshot({path: 'test-results/capas-timeline.png'});
  await app.close();
});
