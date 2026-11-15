// Clip sin conexión (se movió el original): Cortes lo avisa, Re-cortar no corre a ciegas y "Localizar…" lo vuelve a
// enlazar. Usa el proyecto chico (REEL_FIXTURE2), cuyo material vive junto a la copia de prueba.
import {expect, test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {lanzar} from './util';

const P = process.env.REEL_FIXTURE2 ?? '';

test('clip sin conexión: aviso, no re-corta y se localiza', async () => {
  test.skip(!P, 'falta REEL_FIXTURE2');
  const fuentes = JSON.parse(fs.readFileSync(path.join(P, 'edicion/proyecto.json'), 'utf8')).fuentes as string;
  const clip = path.join(fuentes, 'CLIP01.mov');
  const movido = path.join(fuentes, 'movido', 'otro nombre.mov');
  fs.mkdirSync(path.dirname(movido), {recursive: true});
  fs.renameSync(clip, movido);
  try {
    const {app, page} = await lanzar(P);
    await expect(page.getByTestId('editor')).toBeVisible();
    await page.getByTestId('tab-cortes').click();
    await expect(page.getByTestId('sin-conexion')).toContainText('CLIP01');
    // Re-cortar avisa en vez de lanzar reel.py
    await page.getByTestId('recortar').click();
    await expect(page.getByTestId('avisos')).toContainText('Falta el clip original CLIP01');
    // Localizar…: el diálogo de archivos del proceso principal se sustituye para devolver el clip movido
    await app.evaluate(({dialog}, f) => {
      dialog.showOpenDialog = (async () => ({canceled: false, filePaths: [f]})) as unknown as typeof dialog.showOpenDialog;
    }, movido);
    await page.getByTestId('localizar-CLIP01').click();
    await expect.poll(() => fs.lstatSync(clip, {throwIfNoEntry: false})?.isSymbolicLink() ?? false).toBe(true);
    await expect(page.getByTestId('sin-conexion')).toHaveCount(0);
    await app.close();
  } finally {
    if (fs.lstatSync(clip, {throwIfNoEntry: false})) fs.rmSync(clip);
    fs.renameSync(movido, clip);
    fs.rmSync(path.dirname(movido), {recursive: true, force: true});
  }
});
