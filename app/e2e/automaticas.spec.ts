// Funciones automáticas desde la app (proyecto chico, REEL_FIXTURE2): texto a voz → pista de audio, quitar fondo de un
// video → superpuesto .webm con transparencia, y limpiar voz (proyecto.json → voz_limpia).
import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {hasta, lanzar} from './util';

const P = process.env.REEL_FIXTURE2 ?? '';
const leer = (rel: string) => JSON.parse(fs.readFileSync(path.join(P, rel), 'utf8'));

test('texto a voz, quitar fondo y limpiar voz', async () => {
  test.skip(!P, 'falta REEL_FIXTURE2');
  const ev0 = leer('edicion/eventos.json');
  delete ev0.audios;
  delete ev0.superpuestos;
  fs.writeFileSync(path.join(P, 'edicion/eventos.json'), JSON.stringify(ev0, null, 1));
  // un video corto con una persona (Vision la detecta): 1 s de "say" sobre un retrato sintético no sirve, así que se usa
  // un cuadro del propio clip si no hay otro; basta con que el comando produzca el .webm
  fs.mkdirSync(path.join(P, 'public/medios'), {recursive: true});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(P, 'public/cut.mp4'), '-t', '1', '-an', '-vf', 'scale=360:-2', path.join(P, 'public/medios/clip_e2e.mp4')]);
  for (const f of fs.readdirSync(path.join(P, 'public/medios'))) if (f.includes('sin fondo')) fs.rmSync(path.join(P, 'public/medios', f));
  const {app, page} = await lanzar(P);
  await expect(page.getByTestId('editor')).toBeVisible();

  // --- texto a voz
  await page.getByTestId('tab-medios').click();
  await page.getByTestId('abrir-tts').click();
  await expect(page.getByTestId('tts').locator('option').first()).not.toHaveText('cargando voces…', {timeout: 30_000});
  await page.getByTestId('tts-texto').fill('Prueba de voz en off.');
  await page.getByTestId('tts-generar').click();
  await hasta(() => String(leer('edicion/eventos.json').audios?.[0]?.src ?? '').startsWith('audio/voz prueba de voz'), 60_000);
  expect(leer('edicion/eventos.json').audios[0].dur).toBeGreaterThan(0.5);

  // --- quitar fondo
  await page.getByTestId('tab-medios').click();
  const tarjeta = page.getByTestId('medio-medios/clip_e2e.mp4');
  await tarjeta.getByTitle('Agregar como…').click();
  await page.getByTestId('sinfondo-medios/clip_e2e.mp4').click();
  await hasta(() => leer('edicion/eventos.json').superpuestos?.[0]?.src === 'medios/clip_e2e sin fondo.webm', 120_000);
  expect(fs.existsSync(path.join(P, 'public/medios/clip_e2e sin fondo.webm'))).toBe(true);

  // --- limpiar voz
  await page.getByTestId('tab-pipeline').click();
  await page.getByTestId('limpiar-voz-ya').click();
  await hasta(() => leer('edicion/proyecto.json').voz_limpia === 'media', 60_000);
  await expect(page.getByTestId('limpiar-voz')).toContainText('Activa', {timeout: 20_000});
  await page.screenshot({path: 'test-results/automaticas.png'});
  await app.close();
});
