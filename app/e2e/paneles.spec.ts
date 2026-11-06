// Regresión: abrir y cerrar cada panel no debe romper la interfaz (antes: "destroy_ is not a function" al salir de Claude).
import {expect, test} from '@playwright/test';
import {lanzar} from './util';

test('todos los paneles abren y cierran sin errores', async () => {
  const {app, page} = await lanzar();
  const errores: string[] = [];
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('Autofill') && errores.push(m.text()));
  for (const t of ['subtitulos', 'estilo', 'cortes', 'pipeline', 'notas', 'claude', 'inspector', 'claude', 'estilo']) {
    await page.getByTestId(`tab-${t}`).click();
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId('editor')).toBeVisible();
  expect(errores).toEqual([]);
  await app.close();
});
