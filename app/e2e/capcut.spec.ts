// Edición tipo CapCut sobre el proyecto chico (REEL_FIXTURE2, 2 piezas): reordenar un tramo arrastrándolo, verlo al
// instante con la vista del plan, atajo propio (Preferencias) y Exportar con formato extra.
import {expect, test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {hasta, lanzar} from './util';

const P = process.env.REEL_FIXTURE2 ?? '';
const leer = (rel: string) => JSON.parse(fs.readFileSync(path.join(P, rel), 'utf8'));

test('reordenar, vista del plan, atajo propio y exportar', async () => {
  test.skip(!P, 'falta REEL_FIXTURE2');
  const ev0 = leer('edicion/eventos.json');
  delete ev0.textos;
  fs.writeFileSync(path.join(P, 'edicion/eventos.json'), JSON.stringify(ev0, null, 1));
  const orden0 = leer('edicion/plan.json').piezas.map((p: {sec: string}) => p.sec);
  expect(orden0).toEqual(['uno', 'dos']);
  const {app, page, userData} = await lanzar(P);
  await expect(page.getByTestId('editor')).toBeVisible();
  await expect(page.locator('[data-testid^=corte-asa-]').first()).toBeAttached();

  // --- arrastrar el último tramo (pieza "dos") al principio por su asa
  const asas = page.locator('[data-testid^=corte-asa-]');
  const ultima = asas.nth((await asas.count()) - 1);
  const b = (await ultima.boundingBox())!;
  const tl = (await page.getByTestId('fila-corte').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + 4);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(b.x + b.width / 2 + ((tl.x + 110 - (b.x + b.width / 2)) * k) / 12, b.y + 4);
  await expect(page.getByTestId('guia-mover-tramo')).toBeVisible();
  await page.mouse.up();
  await hasta(() => leer('edicion/plan.json').piezas[0].sec === 'dos');

  // --- vista del plan: el orden nuevo se reproduce sin re-cortar
  await page.getByTestId('ver-plan').click();
  await expect(page.getByTestId('vista-plan')).toBeVisible();
  expect(Number(await page.getByTestId('vista-plan').getAttribute('data-tramos'))).toBeGreaterThanOrEqual(2);
  // el clip original se reproduce de verdad (no un cuadro negro): el <video> carga y avanza
  await page.getByTestId('vista-plan').locator('video').first().evaluate((v: HTMLVideoElement) => v.play());
  await expect.poll(() => page.getByTestId('vista-plan').locator('video').first().evaluate((v: HTMLVideoElement) => v.readyState >= 2 && !v.error), {timeout: 15_000}).toBe(true);
  await page.waitForTimeout(800);
  await expect(page.getByTestId('subtitulo-plan')).toBeVisible(); // subtítulos sincronizados por palabra
  await page.screenshot({path: 'test-results/vista-plan.png'});
  await page.getByTestId('ver-plan').click();

  // --- deshacer regresa el orden original
  await page.locator('body').click({position: {x: 5, y: 300}});
  await page.getByTestId('deshacer').click();
  await hasta(() => leer('edicion/plan.json').piezas[0].sec === 'uno');

  // --- atajo propio: "Agregar texto" = Y
  await page.getByTitle('Preferencias').click();
  await page.getByTestId('atajo-texto').click();
  await page.keyboard.press('y');
  await expect(page.getByTestId('atajo-texto')).toHaveText('Y');
  await hasta(() => JSON.parse(fs.readFileSync(path.join(userData, 'preferencias.json'), 'utf8')).atajos?.texto?.[0] === 'y');
  await page.getByTestId('preferencias').getByText('Cerrar').click();
  await page.keyboard.press('y');
  await hasta(() => (leer('edicion/eventos.json').textos ?? []).length === 1);

  // --- exportar: borrador + versión 1:1 (sin abrir Finder)
  await page.keyboard.press('Escape');
  await page.keyboard.press('Meta+e');
  await expect(page.getByTestId('exportar')).toBeVisible();
  await page.getByTestId('calidad-borrador').click();
  await page.getByTestId('formato-1:1').check();
  await page.getByText('Mostrar en Finder al terminar').click();
  for (const f of ['borrador.mp4', 'borrador 1x1.mp4']) fs.rmSync(path.join(P, 'edicion', f), {force: true});
  await page.getByTestId('exportar-ya').click();
  await expect(page.getByTestId('compartir')).toBeVisible({timeout: 180_000});
  expect(fs.existsSync(path.join(P, 'edicion', 'borrador 1x1.mp4'))).toBe(true);
  // publicar: abre la subida (en pruebas no se abre nada) y avisa qué hacer
  await page.getByTestId('publicar-tiktok').click();
  await expect(page.getByTestId('aviso-publicar')).toContainText('TikTok');
  await page.screenshot({path: 'test-results/exportar.png'});
  await app.close();
});
