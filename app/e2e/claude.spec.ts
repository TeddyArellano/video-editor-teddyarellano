// Fase 7: Claude integrado (Claude Code headless con la sesión del usuario). Usa tokens: solo corre con REEL_E2E_CLAUDE=1.
import {expect, test} from '@playwright/test';
import {hasta, lanzar, leer} from './util';

test.skip(!process.env.REEL_E2E_CLAUDE, 'define REEL_E2E_CLAUDE=1 para probar con Claude real');

test('pedir un cambio a Claude, revisar el diff y aplicarlo', async () => {
  test.setTimeout(400_000);
  const {app, page} = await lanzar();
  const original = leer('edicion/eventos.json').etiquetas[1].texto;
  await page.getByTestId('tab-claude').click();
  await page.getByTestId('claude').locator('textarea').fill(
    'En edicion/eventos.json cambia SOLO el campo "texto" de etiquetas[1] a "HOLA DESDE CLAUDE". No toques nada más y no corras ningún comando.',
  );
  await page.getByTestId('claude').getByRole('button', {name: 'Enviar'}).click();
  // modo "revisar antes de aplicar" (por defecto): al terminar, el archivo sigue igual y se ve el diff
  await expect(page.getByTestId('propuesta')).toBeVisible({timeout: 300_000});
  await expect(page.getByTestId('diff-eventos')).toContainText('etiquetas[1].texto');
  await expect(page.getByTestId('diff-eventos')).toContainText('HOLA DESDE CLAUDE');
  await hasta(() => leer('edicion/eventos.json').etiquetas[1].texto === original);
  await page.screenshot({path: 'test-results/claude.png'});
  // Aplicar escribe la propuesta
  await page.getByTestId('propuesta').getByRole('button', {name: 'Aplicar'}).click();
  await hasta(() => leer('edicion/eventos.json').etiquetas[1].texto === 'HOLA DESDE CLAUDE');
  await expect(page.getByTestId('propuesta')).toHaveCount(0);
  await app.close();
});
