// Fases 2–3 y 7 (notas): edición real sobre un proyecto copiado. Cada cambio se verifica en los ARCHIVOS del proyecto
// (eventos.json, data.json regenerado por `reel datos`, notas.json): la fuente de verdad que comparte con la skill.
import {expect, test, type Page} from '@playwright/test';
import {escribir, hasta, lanzar, leer} from './util';

const etiquetaDe = (i: number) => {
  const d = leer('src/data.json');
  return {data: d.labels[i], ev: leer('edicion/eventos.json').etiquetas[d.labels[i].ev ?? i]};
};
const arrastrar = async (page: Page, sel: string, dx: number, dy: number) => {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  const b = (await page.locator(sel).first().boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(b.x + b.width / 2 + (dx * k) / 8, b.y + b.height / 2 + (dy * k) / 8);
  await page.mouse.up();
};

test('editar elementos, subtítulos y notas', async () => {
  const {app, page} = await lanzar();
  await expect(page.getByTestId('editor')).toBeVisible();

  // --- seleccionar la primera etiqueta desde la línea de tiempo y verla en el lienzo
  await page.getByTestId('bloque-labels-0').dispatchEvent('pointerdown', {button: 0, clientX: 0});
  await page.mouse.up();
  await expect(page.getByTestId('inspector')).toBeVisible();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByTestId('seleccion')).toBeVisible();
  await page.screenshot({path: 'test-results/seleccion.png'});

  // --- arrastrar en el lienzo → dy en eventos.json → reel datos lo pasa a data.json
  const dy0 = etiquetaDe(0).ev.dy ?? 0;
  await arrastrar(page, '[data-testid=seleccion] > div', 0, -120);
  await hasta(() => (etiquetaDe(0).ev.dy ?? 0) < dy0 - 100);
  const dy = etiquetaDe(0).ev.dy;
  await hasta(() => etiquetaDe(0).data.dy === dy, 40_000).catch(async (e) => {
    console.log('DIAG2 dy', dy, 'data', JSON.stringify(etiquetaDe(0).data));
    console.log('DIAG2 trabajos', JSON.stringify((await page.evaluate(() => window.reel.trabajos())).map((t) => [t.titulo, t.estado, t.ultimo])));
    console.log('DIAG2 avisos', await page.getByTestId('avisos').innerText(), '|', await page.getByTestId('estado-guardado').innerText());
    throw e;
  });
  await expect(page.getByTestId('estado-guardado')).toHaveText('guardado');
  await page.screenshot({path: 'test-results/movida.png'});

  // --- inspector: cambiar el texto
  const caja = page.getByTestId('inspector').locator('textarea').first();
  const original = etiquetaDe(0).ev.texto;
  await caja.fill('TEXTO DE PRUEBA');
  await hasta(() => etiquetaDe(0).ev.texto === 'TEXTO DE PRUEBA');

  // --- deshacer (⌘Z) vuelve al texto original
  await page.locator('body').click({position: {x: 5, y: 600}});
  await page.getByTestId('deshacer').click();
  await hasta(() => etiquetaDe(0).ev.texto !== 'TEXTO DE PRUEBA');
  await page.getByTestId('deshacer').click();
  await hasta(() => etiquetaDe(0).ev.texto === original, 10_000);

  // --- línea de tiempo: mover la segunda etiqueta → nueva ancla pegada a una palabra
  const en0 = JSON.stringify(etiquetaDe(1).ev.en);
  const caja1 = await page.getByTestId('bloque-labels-1').boundingBox();
  await arrastrar(page, '[data-testid=bloque-labels-1]', 70, 0);
  await hasta(() => JSON.stringify(etiquetaDe(1).ev.en) !== en0).catch(async (e) => {
    console.log('DIAG en0', en0, 'ahora', JSON.stringify(etiquetaDe(1).ev.en), 'data', JSON.stringify(etiquetaDe(1).data), 'caja', JSON.stringify(caja1));
    console.log('DIAG avisos', await page.getByTestId('avisos').innerText(), 'guardado', await page.getByTestId('estado-guardado').innerText());
    console.log('DIAG sel', await page.getByTestId('inspector').locator('h3').first().innerText().catch(() => '-'));
    throw e;
  });
  expect(typeof etiquetaDe(1).ev.en).toBe('string');
  await hasta(() => Math.abs(etiquetaDe(1).data.a - etiquetaDe(1).data.a) === 0 && leer('src/data.json').labels[1].a > 0, 40_000);

  // --- cambio externo (como Claude): la app recarga eventos.json
  await page.waitForTimeout(1200);
  const e = leer('edicion/eventos.json');
  e.etiquetas[etiquetaDe(0).data.ev ?? 0].texto = 'CAMBIO EXTERNO';
  escribir('edicion/eventos.json', e);
  await expect(page.getByTestId('avisos')).toContainText('cambió fuera de la app');
  await page.getByTestId('bloque-labels-0').dispatchEvent('pointerdown', {button: 0});
  await page.mouse.up();
  await expect(page.getByTestId('inspector').locator('textarea').first()).toHaveValue('CAMBIO EXTERNO');

  // --- agregar una etiqueta desde la paleta y borrarla con Supr
  const n0 = leer('edicion/eventos.json').etiquetas.length;
  await page.keyboard.press('Escape');
  await page.getByTestId('agregar-labels').click();
  await hasta(() => leer('edicion/eventos.json').etiquetas.length === n0 + 1);
  await page.locator('body').click({position: {x: 5, y: 600}});
  await page.getByTestId('eliminar').click();
  await hasta(() => leer('edicion/eventos.json').etiquetas.length === n0);

  // --- subtítulos: corregir una palabra → eventos.fix
  await page.getByTestId('tab-subtitulos').click();
  await page.locator('[data-testid=subtitulos] [data-w="5"]').click();
  await page.getByRole('button', {name: 'Corregir'}).click();
  await page.getByTestId('corregir-input').fill('PRUEBAFIX');
  await page.getByTestId('corregir-input').press('Enter');
  await hasta(() => Object.values(leer('edicion/eventos.json').fix ?? {}).includes('PRUEBAFIX'));
  await hasta(() => leer('src/data.json').words[5].text.includes('PRUEBAFIX'), 40_000);

  // --- notas locales
  await page.getByTestId('tab-notas').click();
  await page.getByTestId('nota-texto').fill('Subir la etiqueta 20 px');
  await page.getByTestId('nota-agregar').click();
  await hasta(() => (leer('edicion/notas.json') as {texto: string}[]).some((n) => n.texto === 'Subir la etiqueta 20 px'));
  await page.screenshot({path: 'test-results/notas.png'});

  // sin errores de reel datos en toda la sesión
  await expect(page.getByTestId('avisos')).not.toContainText('reel datos:');
  await app.close();
});
