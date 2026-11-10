// Fase 8: "Buscar actualizaciones" → "Actualizar ahora" de punta a punta. La prueba arma su propio CLON del repo
// (desde el repo local, sin red), lo deja atrasado un commit, apunta la app a ese clon y reinstala en una carpeta
// temporal. Al final borra el clon y la app instalada de prueba.
import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {lanzar} from './util';

const REPO = path.resolve(__dirname, '..', '..');

test('actualizar la app desde un repo atrasado', async () => {
  test.setTimeout(900_000);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-actualizar-'));
  const clon = path.join(tmp, 'repo');
  const destino = path.join(tmp, 'Aplicaciones');
  fs.mkdirSync(destino);
  const rama = execFileSync('git', ['-C', REPO, 'rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
  execFileSync('git', ['clone', '-q', '--branch', rama, REPO, clon]);
  execFileSync('git', ['-C', clon, 'reset', '-q', '--hard', 'HEAD~1']);
  process.env.REEL_DESTINO_APP = destino;
  const {app, page} = await lanzar(false);
  try {
    await page.evaluate((c) => window.reel.guardarPreferencias({skill: `${c}/skill/editar-reel`}), clon);
    await page.getByTestId('abrir-preferencias').click();
    await page.getByTestId('buscar-actualizaciones').click();
    await expect(page.getByTestId('estado-actualizacion')).toContainText(/Hay \d+ cambios? nuevos?/, {timeout: 60_000});
    await page.getByRole('button', {name: 'Actualizar ahora'}).click();
    await expect(page.getByRole('button', {name: 'Reiniciar Reel Studio'}).or(page.getByText(/^✗/))).toBeVisible({timeout: 840_000});
    await expect(page.getByRole('button', {name: 'Reiniciar Reel Studio'})).toBeVisible();
    expect(fs.existsSync(path.join(destino, 'Reel Studio.app', 'Contents', 'MacOS', 'Reel Studio'))).toBe(true);
    await page.getByTestId('buscar-actualizaciones').click();
    await expect(page.getByTestId('estado-actualizacion')).toContainText('Al día', {timeout: 60_000});
    expect(execFileSync('git', ['-C', clon, 'rev-parse', 'HEAD']).toString()).toBe(execFileSync('git', ['-C', REPO, 'rev-parse', 'HEAD']).toString());
  } finally {
    await page.evaluate(() => window.reel.guardarPreferencias({skill: ''})).catch(() => {});
    await app.close();
    delete process.env.REEL_DESTINO_APP;
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});
