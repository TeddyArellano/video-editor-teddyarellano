// Fases 5–7 (lo que faltaba): hojas de contacto del inventario, logos, QR, b-roll marcando entrada/salida en el visor del
// clip original, intro 3D, niveles, escuchar un corte, página de revisión, dividir, notas con `reel notas`, limpiar
// caché y probar el toolkit. Proyecto pequeño (el de `reel prueba`), copiado: REEL_FIXTURE2=<copia>/proyecto_remotion.
import {expect, test, type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {hasta, lanzar} from './util';

const P = process.env.REEL_FIXTURE2 ?? '';
const QR = process.env.REEL_FOTO_QR ?? '';
const PY = path.join(os.homedir(), '.reels-toolkit/venv/bin/python');
const REEL = path.join(__dirname, '../../skill/editar-reel/scripts/reel.py');
test.skip(!P, 'define REEL_FIXTURE2 (copia del proyecto de reel prueba)');

const trabajoOk = (page: Page, titulo: string, ms = 240_000) =>
  expect
    .poll(async () => (await page.evaluate(() => window.reel.trabajos())).find((t) => t.titulo === titulo)?.estado, {timeout: ms})
    .toBe('ok');

test('utilidades del pipeline, cortes y revisión', async () => {
  test.setTimeout(900_000);
  const {app, page} = await lanzar(P);
  await expect(page.getByTestId('editor')).toBeVisible();
  await page.getByTestId('tab-pipeline').click();

  // --- inventario → hojas de contacto visibles en la app (imágenes servidas por reel-media://…/__edicion/hojas)
  await page.getByTestId('pipeline').getByRole('button', {name: 'Correr'}).first().click();
  await trabajoOk(page, 'Inventario');
  await expect(page.getByTestId('inventario')).toContainText('CLIP01');
  const hoja = page.getByTestId('hojas').locator('img').first();
  await expect.poll(() => hoja.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(100);

  // --- logos (Wikidata/Wikimedia, red)
  await page.getByPlaceholder('Logos: Google, Coursera, …').fill('Google');
  await page.getByTestId('pipeline').getByRole('button', {name: 'Buscar'}).click();
  await trabajoOk(page, 'Logos');
  await hasta(() => fs.readdirSync(path.join(P, 'public/logos')).some((f) => /google/i.test(f)));

  // --- QR desde foto (el diálogo de archivo es nativo: se llama al mismo comando que usa el botón)
  if (QR) {
    await page.evaluate(([ruta, f]) => window.reel.abrir(ruta).then((s) => window.reel.correr(s.info.id, 'QR', ['qr', f, '--nombre', 'registro'])), [P, QR]);
    await trabajoOk(page, 'QR');
    expect(fs.existsSync(path.join(P, 'public/qr/registro.jpg'))).toBe(true);
  }

  // --- b-roll: entrada y salida marcadas en el visor del clip original
  await page.getByTestId('broll').locator('select').selectOption('CLIP01');
  const v = page.getByTestId('broll-video');
  await expect.poll(() => v.evaluate((e: HTMLVideoElement) => e.readyState)).toBeGreaterThanOrEqual(1);
  await v.evaluate((e: HTMLVideoElement) => (e.currentTime = 1.5));
  await expect.poll(() => v.evaluate((e: HTMLVideoElement) => !e.seeking && Math.abs(e.currentTime - 1.5) < 0.1)).toBe(true);
  await page.getByTestId('broll-entrada').click();
  await v.evaluate((e: HTMLVideoElement) => (e.currentTime = 3.5));
  await expect.poll(() => v.evaluate((e: HTMLVideoElement) => !e.seeking && Math.abs(e.currentTime - 3.5) < 0.1)).toBe(true);
  await page.getByTestId('broll-salida').click();
  await page.getByTestId('broll').getByPlaceholder('nombre').fill('apoyo');
  await page.getByTestId('broll-crear').click();
  await trabajoOk(page, 'B-roll');
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(P, 'public/broll/apoyo.mp4')]).toString());
  expect(dur).toBeGreaterThan(1.8);
  expect(dur).toBeLessThan(2.3);

  // --- intro 3D (el fixture trae intro_espacio): capa ProRes renderizada con las fuentes locales
  await page.getByTestId('pipeline').getByRole('button', {name: 'Renderizar'}).first().click();
  await trabajoOk(page, 'Intro 3D', 400_000);
  await hasta(() => fs.existsSync(path.join(P, 'public/capas')) && fs.readdirSync(path.join(P, 'public/capas')).some((f) => f.endsWith('.mov')));

  // --- dividir en partes
  await page.getByTestId('dividir-partes').fill('main');
  await page.getByTestId('dividir-nombres').fill('Parte A');
  await page.getByTestId('dividir-correr').click();
  await trabajoOk(page, 'Dividir');
  expect(fs.existsSync(path.join(path.dirname(P), 'proyecto_remotion_parte_a', 'edicion', 'plan.json'))).toBe(true);

  // --- cortes: niveles en tabla y escuchar el tramo original
  await page.getByTestId('tab-cortes').click();
  await page.getByRole('button', {name: 'Medir niveles'}).click();
  await expect(page.getByTestId('niveles')).toContainText('main', {timeout: 120_000});
  await page.getByTestId('cortes').locator('.cursor-pointer.items-start').first().click();
  await page.getByRole('button', {name: '▶ Escuchar'}).click();
  const esc = page.locator('[data-testid=escucha]');
  await expect(esc).toHaveAttribute('src', /__fuente\/CLIP01\.mov/);
  await expect.poll(() => esc.evaluate((e: HTMLVideoElement) => !e.paused && e.currentTime > 0)).toBe(true);

  // --- notas: la app escribe, `reel notas` (lo que usa Claude) las lista y marca; la app recarga
  await page.getByTestId('tab-notas').click();
  await page.getByTestId('nota-texto').fill('Más grande el título');
  await page.getByTestId('nota-agregar').click();
  await hasta(() => fs.existsSync(path.join(P, 'edicion/notas.json')) && JSON.parse(fs.readFileSync(path.join(P, 'edicion/notas.json'), 'utf8')).length === 1);
  const lista = execFileSync(PY, [REEL, 'notas', '-p', P]).toString();
  expect(lista).toContain('Más grande el título');
  const idNota = lista.match(/\[([0-9a-f]{8})\]/)![1];
  execFileSync(PY, [REEL, 'notas', '-p', P, '--marcar', idNota, '--respuesta', 'título a 120 px']);
  await expect(page.getByTestId('notas')).toContainText('título a 120 px');
  await expect(page.getByTestId('notas')).toContainText('aplicado');

  // --- página de revisión (prepararla; publicarla la hace Claude)
  await page.getByTestId('preparar-revision').click();
  await expect(page.getByTestId('estado-revision')).toContainText('lista', {timeout: 300_000});
  expect(fs.existsSync(path.join(P, 'edicion/revision/revision.html'))).toBe(true);
  expect(fs.existsSync(path.join(P, 'edicion/revision/borrador_web.mp4'))).toBe(true);

  // --- mantenimiento: limpiar caché y probar el toolkit
  await page.getByTestId('tab-pipeline').click();
  await page.getByRole('button', {name: 'Limpiar caché'}).click();
  await trabajoOk(page, 'Limpiar caché');
  await page.getByRole('button', {name: 'Probar toolkit'}).click();
  await trabajoOk(page, 'Probar toolkit', 240_000);
  const prueba = (await page.evaluate(() => window.reel.trabajos())).find((t) => t.titulo === 'Probar toolkit')!;
  expect(prueba.lineas.map((l) => l.msg).join('\n')).toContain('AUTOPRUEBA OK');
  await page.screenshot({path: 'test-results/utilidades.png'});
  await app.close();
});
