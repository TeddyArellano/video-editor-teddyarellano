// Fases 5–7 (lo que faltaba): hojas de contacto del inventario, logos, QR, b-roll marcando entrada/salida en el visor del
// clip original, intro 3D, niveles, escuchar un corte, página de revisión, dividir, notas con `reel notas`, limpiar
// caché y probar el toolkit. Proyecto pequeño (el de `reel prueba`), copiado: REEL_FIXTURE2=<copia>/proyecto_remotion.
import {expect, test, type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {hasta, lanzar, limpiarCache} from './util';

const P = process.env.REEL_FIXTURE2 ?? '';
const QR = process.env.REEL_FOTO_QR ?? '';
const MIC = process.env.REEL_MIC ?? '';
const PY = path.join(os.homedir(), '.reels-toolkit/venv/bin/python');
const REEL = path.join(__dirname, '../../skill/editar-reel/scripts/reel.py');
test.skip(!P || !QR || !MIC, 'prepara los fixtures con e2e/preparar.sh (REEL_FIXTURE2, REEL_FOTO_QR, REEL_MIC)');

// el diálogo nativo de archivos no se puede manejar desde Playwright: se reemplaza en el proceso principal para que
// "elija" el archivo indicado; así se prueba el botón real de punta a punta
const elegira = (app: import('@playwright/test').ElectronApplication, f: string) =>
  app.evaluate(({dialog}, archivo) => {
    dialog.showOpenDialog = (async () => ({canceled: false, filePaths: [archivo]})) as typeof dialog.showOpenDialog;
  }, f);
const plan = () => JSON.parse(fs.readFileSync(path.join(P, 'edicion/plan.json'), 'utf8'));

const trabajoOk = async (page: Page, titulo: string, ms = 240_000) => {
  try {
    await expect
      .poll(async () => (await page.evaluate(() => window.reel.trabajos())).find((t) => t.titulo === titulo)?.estado, {timeout: ms})
      .toBe('ok');
  } catch (e) {
    const t = (await page.evaluate(() => window.reel.trabajos())).find((x) => x.titulo === titulo);
    console.log(`DIAG trabajo "${titulo}": ${t?.estado} · ${t?.ultimo ?? ''}\n${(t?.lineas ?? []).slice(-6).map((l) => l.msg).join('\n')}`);
    throw e;
  }
};

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

  // --- QR desde foto: botón real + diálogo de archivo
  await elegira(app, QR);
  await page.getByRole('button', {name: 'QR desde foto…'}).click();
  await trabajoOk(page, 'QR');
  await hasta(() => fs.readdirSync(path.join(P, 'public/qr')).some((f) => f.endsWith('.jpg')));

  // --- micrófono externo: elegir el clip y el audio (diálogo) → reel audio sincroniza por correlación
  await page.getByTestId('pipeline').locator('select').filter({hasText: 'Micrófono externo para el clip…'}).selectOption('CLIP01');
  await elegira(app, MIC);
  await page.getByRole('button', {name: 'Elegir audio…'}).click();
  await trabajoOk(page, 'Audio externo CLIP01');
  const cfg = JSON.parse(fs.readFileSync(path.join(P, 'edicion/proyecto.json'), 'utf8'));
  expect(Math.abs(Math.abs(cfg.audio_externo.CLIP01.offset) - 0.7)).toBeLessThan(0.05); // el audio venía 0.7 s retrasado

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
  await page.getByTestId('dividir-partes').fill('uno\ndos');
  await page.getByTestId('dividir-nombres').fill('Parte A\nParte B');
  await page.getByTestId('dividir-correr').click();
  await trabajoOk(page, 'Dividir');
  for (const n of ['parte_a', 'parte_b']) expect(fs.existsSync(path.join(path.dirname(P), `proyecto_remotion_${n}`, 'edicion', 'plan.json'))).toBe(true);

  // --- cortes: niveles (la sección "dos" está a −9 dB) → tabla → Igualar escribe gain_db en plan.json
  await page.getByTestId('tab-cortes').click();
  await page.getByRole('button', {name: 'Medir niveles'}).click();
  await expect(page.getByTestId('niveles')).toContainText('dos', {timeout: 120_000});
  await expect(page.getByTestId('niveles').locator('tr', {hasText: 'dos'}).locator('.text-amber-300')).toBeVisible(); // diferencia ≥ 1.5 dB
  const g0 = plan().piezas[1].gain_db;
  await page.getByRole('button', {name: 'Igualar niveles'}).click();
  await trabajoOk(page, 'Igualar niveles');
  await hasta(() => Math.abs(plan().piezas[1].gain_db - g0) > 4); // sube hacia el nivel de "uno"
  // --- escuchar: reproduce el tramo ORIGINAL de la pieza (−0.4 s … +0.4 s) y se detiene al final
  const pal = JSON.parse(fs.readFileSync(path.join(P, 'edicion/palabras/CLIP01.json'), 'utf8'));
  const pz = plan().piezas[0];
  const ini = pal[pz.de][1] - 0.4;
  const fin = pal[pz.a][2] + 0.4;
  await page.getByTestId('cortes').locator('.cursor-pointer.items-start').first().click();
  await page.getByRole('button', {name: '▶ Escuchar'}).click();
  const esc = page.locator('[data-testid=escucha]');
  await expect(esc).toHaveAttribute('src', /__fuente\/CLIP01\.mov/);
  await expect.poll(() => esc.evaluate((e: HTMLVideoElement) => !e.paused)).toBe(true);
  expect(await esc.evaluate((e: HTMLVideoElement) => e.currentTime)).toBeGreaterThanOrEqual(ini - 0.05);
  await expect.poll(() => esc.evaluate((e: HTMLVideoElement) => e.paused), {timeout: 20_000}).toBe(true);
  const alto = await esc.evaluate((e: HTMLVideoElement) => e.currentTime);
  expect(alto).toBeGreaterThanOrEqual(fin - 0.05);
  expect(alto).toBeLessThan(fin + 0.4);

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
  expect(fs.readFileSync(path.join(P, 'edicion/revision/revision.html'), 'utf8')).toContain('comentarios'); // colección de notas
  // publicarla: se copia el pedido para Claude Code (el `claude -p` de la app no tiene la herramienta Artifact)
  await page.getByTestId('publicar-revision').click();
  const copiado = await app.evaluate(({clipboard}) => clipboard.readText());
  expect(copiado).toContain('/editar-reel Publica la página de revisión');
  expect(copiado).toContain(P);
  await expect(page.getByTestId('avisos')).toContainText('Pedido copiado');

  // --- mantenimiento: limpiar caché (también la de las partes de dividir) y probar el toolkit
  for (const n of ['parte_a', 'parte_b']) limpiarCache(path.join(path.dirname(P), `proyecto_remotion_${n}`));
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
