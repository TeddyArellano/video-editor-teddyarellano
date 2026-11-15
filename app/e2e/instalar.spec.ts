// Primer arranque en una Mac sin el toolkit: la app empaquetada (.dmg) trae la skill y "Instalar / reparar" deja todo
// listo sin el repo. Se simula una Mac limpia con un HOME vacío (toolkit, modelo de Whisper, venv y Remotion se
// instalan ahí). Pesado (~2 GB de descargas): solo corre con REEL_PRUEBA_INSTALAR=1 y REEL_EJECUTABLE=<la app empaquetada>.
import {expect, test, _electron as electron} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EJ = process.env.REEL_EJECUTABLE ?? '';

test('mac sin toolkit: la app empaquetada instala todo con su skill incluida', async () => {
  test.skip(!process.env.REEL_PRUEBA_INSTALAR || !EJ, 'prueba pesada: REEL_PRUEBA_INSTALAR=1 y REEL_EJECUTABLE');
  test.setTimeout(45 * 60_000);
  const home = process.env.REEL_HOME_LIMPIO || fs.mkdtempSync(path.join(os.tmpdir(), 'reel-home-'));
  const env = {...process.env, HOME: home, REEL_USER_DATA: path.join(home, 'userData'), REEL_NO_ABRIR: '1'} as Record<string, string>;
  delete env.REEL_SKILL;
  delete env.REEL_ABRIR;
  const app = await electron.launch({executablePath: EJ, args: [], env});
  const page = await app.firstWindow();
  // la skill que usa es la que viene dentro de la app
  const herr = await page.evaluate(() => window.reel.herramientas());
  expect(herr.skill).toContain('.app/Contents/Resources/skill/editar-reel');
  expect(herr.toolkit).toBe(false);
  await expect(page.getByTestId('aviso-toolkit')).toBeVisible();
  await page.getByTestId('aviso-toolkit').getByRole('button', {name: 'Instalar / reparar toolkit'}).click();
  await expect
    .poll(async () => (await page.evaluate(() => window.reel.trabajos())).find((t) => t.titulo === 'Instalar / reparar toolkit')?.estado, {timeout: 40 * 60_000, intervals: [5000]})
    .not.toBe('corriendo');
  const t = (await page.evaluate(() => window.reel.trabajos())).find((x) => x.titulo === 'Instalar / reparar toolkit');
  if (t?.estado !== 'ok') console.log('DIAG instalar', t?.estado, (t?.lineas ?? []).slice(-15).map((l) => l.msg).join('\n'));
  expect(t?.estado).toBe('ok');
  expect((await page.evaluate(() => window.reel.herramientas())).toolkit).toBe(true);
  // Claude también tiene la skill (enlace a la copia de la app)
  expect(fs.realpathSync(path.join(home, '.claude/skills/editar-reel'))).toContain('Resources/skill/editar-reel');
  await app.close();
  // y el flujo completo corre con ese toolkit recién instalado
  const out = execFileSync(path.join(home, '.reels-toolkit/venv/bin/python'), [path.join(herr.skill, 'scripts/reel.py'), 'prueba'], {env, encoding: 'utf8', timeout: 15 * 60_000});
  expect(out).toContain('AUTOPRUEBA OK');
  // la app empaquetada sigue intacta (nada se escribió dentro del bundle firmado)
  execFileSync('codesign', ['--verify', '--deep', '--strict', EJ.replace(/\/Contents\/MacOS\/.*$/, '')]);
});
