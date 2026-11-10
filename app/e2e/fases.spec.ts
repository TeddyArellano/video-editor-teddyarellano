// Fases 4–6: estilo, cortes (re-corte real con reel.py) y pipeline (proyecto nuevo + borrador) desde la interfaz.
import {expect, test} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FIXTURE, hasta, irA, lanzar, leer, limpiarCache} from './util';

test('estilo: cambiar la altura de las etiquetas se guarda y se ve', async () => {
  const {app, page} = await lanzar();
  await page.getByTestId('tab-estilo').click();
  await page.getByTestId('estilo').getByRole('button', {name: /^Etiquetas/}).click();
  const l = leer('src/data.json').labels[0];
  await irA(page, Math.floor((l.a + l.b) / 2));
  await page.waitForTimeout(800);
  const vista = page.locator('[data-testid=visor] > div').first();
  const antes = await vista.screenshot({path: 'test-results/estilo_antes.png'});
  const top0 = leer('src/estilo.json').etiqueta.top;
  const campo = page.getByTestId('estilo').locator('label', {hasText: 'Altura (top)'}).first().locator('input');
  await campo.fill(String(top0 + 250));
  await hasta(() => leer('src/estilo.json').etiqueta.top === top0 + 250);
  await page.waitForTimeout(800);
  const despues = await vista.screenshot({path: 'test-results/estilo_despues.png'});
  expect(Buffer.compare(antes, despues)).not.toBe(0);
  // deshacer devuelve el valor original
  await page.locator('body').click({position: {x: 5, y: 600}});
  await page.getByTestId('deshacer').click();
  await hasta(() => leer('src/estilo.json').etiqueta.top === top0);
  await app.close();
});

test('cortes: tachar una palabra y re-cortar con reel.py', async () => {
  test.setTimeout(600_000);
  const {app, page} = await lanzar();
  await page.getByTestId('tab-cortes').click();
  const plan0 = leer('edicion/plan.json');
  const n0 = leer('src/data.json').n;
  // abrir la primera pieza y quitar la última palabra (recorta el rango)
  await page.getByTestId('cortes').locator('.cursor-pointer.items-start').first().click();
  const pieza = plan0.piezas[0];
  await page.getByTestId('cortes').getByTitle(new RegExp(`^#${pieza.a} `)).first().click();
  await hasta(() => leer('edicion/plan.json').piezas[0].a === pieza.a - 1);
  await expect(page.getByText('recortes sin aplicar')).toBeVisible();
  await page.getByTestId('recortar').click();
  // edl → cortar --verificar → datos (tarda: reconstruye el master)
  await hasta(() => leer('src/data.json').n < n0, 540_000);
  await expect(page.getByText('Verificación del corte')).toBeVisible({timeout: 60_000});
  await expect(page.getByText('recortes sin aplicar')).toHaveCount(0);
  console.log(`corte: ${n0} → ${leer('src/data.json').n} cuadros`);
  await app.close();
  limpiarCache(FIXTURE);
});

test('pipeline: proyecto nuevo (inventario → SDR → transcribir) y borrador', async () => {
  test.setTimeout(600_000);
  // material de prueba: el clip sintético de `reel prueba`
  const mat = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-nuevo-'));
  fs.copyFileSync(path.join(os.homedir(), '.reels-toolkit/cache/autoprueba/material/CLIP01.mov'), path.join(mat, 'CLIP01.mov'));
  const {app, page} = await lanzar(false);
  await page.getByRole('button', {name: '+ Nuevo proyecto'}).click();
  await page.getByTestId('nuevo').locator('input').first().fill(mat);
  await page.getByTestId('nuevo').locator('label', {hasText: 'Nombre del video'}).locator('input').fill('Prueba Studio');
  await page.getByRole('button', {name: 'Crear'}).click();
  await expect(page.getByTestId('editor')).toBeVisible({timeout: 60_000});
  await hasta(() => fs.existsSync(path.join(mat, 'proyecto_remotion/edicion/palabras/CLIP01.json')), 300_000);
  // plan con todo el clip, re-cortar y borrador desde la interfaz
  const pal = JSON.parse(fs.readFileSync(path.join(mat, 'proyecto_remotion/edicion/palabras/CLIP01.json'), 'utf8'));
  fs.writeFileSync(path.join(mat, 'proyecto_remotion/edicion/plan.json'), JSON.stringify({piezas: [{src: 'CLIP01', de: 0, a: pal.length - 1, sec: 'main'}]}));
  await page.getByTestId('tab-pipeline').click();
  await page.getByRole('button', {name: 'Re-cortar'}).click();
  await hasta(() => JSON.parse(fs.readFileSync(path.join(mat, 'proyecto_remotion/src/data.json'), 'utf8')).words.length > 0, 120_000).catch(async (e) => {
    console.log('TRABAJOS', JSON.stringify((await page.evaluate(() => window.reel.trabajos())).map((t) => [t.titulo, t.estado, t.comando, t.ultimo])));
    throw e;
  });
  await expect(page.getByTestId('visor').locator('video').first()).toBeVisible({timeout: 30_000});
  await page.getByRole('button', {name: 'Borrador'}).first().click();
  await expect(page.getByTestId('barra-trabajo')).toBeVisible();
  await hasta(() => fs.existsSync(path.join(mat, 'proyecto_remotion/edicion/borrador.mp4')), 300_000);
  // el trabajo terminó bien y se vio progreso
  await page.getByTestId('tab-pipeline').click();
  await expect(page.getByTestId('trabajo').filter({hasText: 'Borrador'}).first()).toContainText('✓', {timeout: 60_000});
  await page.screenshot({path: 'test-results/pipeline.png'});
  await app.close();
  limpiarCache(path.join(mat, 'proyecto_remotion'));
  fs.rmSync(mat, {recursive: true, force: true});
  void FIXTURE;
});
