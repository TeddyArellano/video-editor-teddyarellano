// Fase 7: Claude integrado (Claude Code headless con la sesión del usuario). Usa tokens: solo corre con REEL_E2E_CLAUDE=1.
import {expect, test} from '@playwright/test';
import {hasta, lanzar, leer} from './util';

test.skip(!process.env.REEL_E2E_CLAUDE, 'define REEL_E2E_CLAUDE=1 para probar con Claude real');

test('pedir un cambio a Claude, verlo aplicado y revertirlo', async () => {
  test.setTimeout(400_000);
  const {app, page} = await lanzar();
  const original = leer('edicion/eventos.json').etiquetas[1].texto;
  await page.getByTestId('tab-claude').click();
  await page.getByTestId('claude').locator('textarea').fill(
    'En edicion/eventos.json cambia SOLO el campo "texto" de etiquetas[1] a "HOLA DESDE CLAUDE". No toques nada más y no corras ningún comando.',
  );
  await page.getByTestId('claude').getByRole('button', {name: 'Enviar'}).click();
  await hasta(() => leer('edicion/eventos.json').etiquetas[1].texto === 'HOLA DESDE CLAUDE', 300_000);
  await expect(page.getByTestId('claude').getByRole('button', {name: 'Revertir'})).toBeVisible({timeout: 120_000});
  await page.screenshot({path: 'test-results/claude.png'});
  await page.getByTestId('claude').getByRole('button', {name: 'Revertir'}).click();
  await hasta(() => leer('edicion/eventos.json').etiquetas[1].texto === original);
  await app.close();
});
