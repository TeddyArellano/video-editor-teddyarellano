// Fase 8: "Buscar actualizaciones" → "Actualizar ahora" de punta a punta, sobre un CLON del repo atrasado un commit
// (REEL_E2E_CLON=<clon>, preparado por el que corre la prueba) e instalando en una carpeta temporal.
import {expect, test} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {lanzar} from './util';

const CLON = process.env.REEL_E2E_CLON;
test.skip(!CLON, 'define REEL_E2E_CLON=<clon del repo atrasado> para probar la actualización');

test('actualizar la app desde un repo atrasado', async () => {
  test.setTimeout(900_000);
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-destino-'));
  process.env.REEL_DESTINO_APP = destino;
  const {app, page} = await lanzar(false);
  await page.evaluate((c) => window.reel.guardarPreferencias({skill: `${c}/skill/editar-reel`}), CLON!);
  await page.getByTestId('abrir-preferencias').click();
  await page.getByTestId('buscar-actualizaciones').click();
  await expect(page.getByTestId('estado-actualizacion')).toContainText('Hay 1 cambio nuevo', {timeout: 60_000});
  await page.getByRole('button', {name: 'Actualizar ahora'}).click();
  // termina bien (botón Reiniciar) o falla rápido mostrando el error
  await expect(page.getByRole('button', {name: 'Reiniciar Reel Studio'}).or(page.getByText(/^✗/))).toBeVisible({timeout: 840_000});
  await expect(page.getByRole('button', {name: 'Reiniciar Reel Studio'})).toBeVisible();
  expect(fs.existsSync(path.join(destino, 'Reel Studio.app', 'Contents', 'MacOS', 'Reel Studio'))).toBe(true);
  await page.getByTestId('buscar-actualizaciones').click();
  await expect(page.getByTestId('estado-actualizacion')).toContainText('Al día', {timeout: 60_000});
  await page.evaluate(() => window.reel.guardarPreferencias({skill: ''}));
  await app.close();
});
