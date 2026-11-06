// Fase 8: preferencias (persisten), tema claro, atajos, buscar actualizaciones y aviso del toolkit en el primer arranque.
import {expect, test} from '@playwright/test';
import {lanzar} from './util';

test('preferencias: tema, atajos, toolkit y actualizaciones', async () => {
  const a = await lanzar(false);
  await a.page.getByTestId('abrir-preferencias').click();
  await expect(a.page.getByTestId('preferencias')).toBeVisible();
  await expect(a.page.getByTestId('pref-atajos')).toContainText('Deshacer / rehacer');
  await expect(a.page.getByTestId('pref-toolkit')).toContainText('Toolkit completo');
  // buscar actualizaciones contra el repo (git fetch)
  await a.page.getByTestId('buscar-actualizaciones').click();
  await expect(a.page.getByTestId('estado-actualizacion')).toBeVisible({timeout: 60_000});
  // tema claro: se aplica al momento y persiste al reiniciar
  await a.page.getByTestId('pref-tema').selectOption('claro');
  await expect.poll(() => a.page.evaluate(() => document.documentElement.dataset.tema)).toBe('claro');
  await a.page.screenshot({path: 'test-results/tema-claro.png'});
  await a.app.close();
  const b = await lanzar(false, a.userData);
  await expect.poll(() => b.page.evaluate(() => document.documentElement.dataset.tema)).toBe('claro');
  // primer arranque sin toolkit: con un Python inexistente aparece el aviso con "Instalar / reparar"
  await b.page.evaluate(() => window.reel.guardarPreferencias({python: '/no/existe/python'}));
  await b.page.reload();
  await expect(b.page.getByTestId('aviso-toolkit')).toBeVisible();
  await expect(b.page.getByTestId('aviso-toolkit')).toContainText('Python del toolkit');
  await expect(b.page.getByTestId('aviso-toolkit').getByRole('button', {name: 'Instalar / reparar toolkit'})).toBeEnabled();
  // volver a lo normal
  await b.page.evaluate(() => window.reel.guardarPreferencias({python: '', tema: 'oscuro'}));
  await b.page.reload();
  await expect(b.page.getByTestId('aviso-toolkit')).toHaveCount(0);
  await b.app.close();
});
