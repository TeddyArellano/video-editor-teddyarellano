// Fase 0/1: la app abre un proyecto real y lo muestra en la vista previa (plantilla de la skill + medios del proyecto).
import {expect, test} from '@playwright/test';
import {lanzar} from './util';

test('abre el proyecto y reproduce la vista previa', async () => {
  const {app, page} = await lanzar();
  await expect(page.getByTestId('editor')).toBeVisible();
  await expect(page.getByTestId('visor')).toBeVisible();
  // el video del corte se sirve por reel-media:// y carga
  const video = page.locator('[data-testid=visor] video').first();
  await expect(video).toHaveAttribute('src', /^reel-media:\/\/p\/[0-9a-f]+\/cut(_proxy)?\.mp4(#t=.*)?$/);
  await expect.poll(async () => video.evaluate((v: HTMLVideoElement) => v.readyState), {timeout: 30_000}).toBeGreaterThanOrEqual(2);
  // línea de tiempo con bloques de eventos y subtítulos
  await expect(page.getByTestId('timeline')).toBeVisible();
  await expect(page.locator('[data-testid^=bloque-labels-]').first()).toBeVisible();
  // ir a un cuadro y comprobar el tiempo
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByTestId('tiempo')).toContainText('0:01.00');
  await page.waitForTimeout(1500);
  await page.screenshot({path: 'test-results/visor.png'});
  await app.close();
});
