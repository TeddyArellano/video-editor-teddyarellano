// Línea de tiempo: posicionarse, zoom, dividir, recortar, deshacer, aplicar un re-corte real y mover elementos.
// Corre sobre la copia chica (REEL_FIXTURE2): cada recorte se verifica en plan.json, y el re-corte en cut.mp4 / data.json.
import {expect, test, type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {hasta, lanzar, limpiarCache} from './util';

const P = process.env.REEL_FIXTURE2 ?? '';
const j = (rel: string) => JSON.parse(fs.readFileSync(path.join(P, rel), 'utf8'));
const cuadro = async (page: Page) => Number((await page.getByTestId('tiempo').innerText()).match(/\d+:\d+\.\d+/)![0].split(/[:.]/).reduce((a, x, i) => (i === 0 ? Number(x) * 60 : i === 1 ? (a + Number(x)) * 30 : a + Number(x)), 0));
const ppc = async (page: Page) => Number(await page.getByTestId('timeline').getAttribute('data-ppc'));
const scrollX = (page: Page) => page.getByTestId('timeline').evaluate((e) => e.scrollLeft);
const irAlInicio = (page: Page) => page.keyboard.press('Home');
// x de pantalla del cuadro f en la línea de tiempo
const xDe = async (page: Page, f: number) => {
  const b = (await page.getByTestId('timeline').boundingBox())!;
  return b.x + 104 + f * (await ppc(page)) - (await scrollX(page));
};
const arrastrar = async (page: Page, x0: number, y: number, x1: number) => {
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(x0 + ((x1 - x0) * k) / 10, y);
  await page.mouse.up();
};
const yCorte = async (page: Page) => {
  const b = (await page.getByTestId('fila-corte').boundingBox())!;
  return b.y + b.height / 2;
};

test.beforeEach(() => test.skip(!P, 'falta REEL_FIXTURE2'));

test('posicionarse y hacer zoom', async () => {
  const {app, page} = await lanzar(P);
  await expect(page.getByTestId('fila-corte')).toBeVisible();
  await expect(page.locator('[data-testid^=corte-]').first()).toBeVisible();
  const yRegla = (await page.getByTestId('regla').boundingBox())!.y + 8;

  // clic en la regla
  await page.mouse.click(await xDe(page, 90), yRegla);
  await expect.poll(() => cuadro(page)).toBe(90);
  // arrastrar en la regla
  await arrastrar(page, await xDe(page, 90), yRegla, await xDe(page, 150));
  await expect.poll(() => cuadro(page)).toBe(150);
  // clic en una pista vacía (la fila de subtítulos no; el espacio bajo los bloques sí)
  const fondo = (await page.getByTestId('fila-secs').boundingBox())!;
  await page.mouse.click(await xDe(page, 40), fondo.y + fondo.height - 2);
  await expect.poll(() => cuadro(page)).toBe(40);
  // arrastrar el cabezal por su cabeza; la línea no debe tapar los bordes de un corte
  const yCab = (await page.getByTestId('regla').boundingBox())!.y + 4;
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(() => cuadro(page)).toBe(30);
  await arrastrar(page, await xDe(page, 30), yCab, await xDe(page, 60));
  await expect.poll(() => cuadro(page)).toBeGreaterThan(50);

  // navegar entre cortes
  await irAlInicio(page);
  await page.keyboard.press('ArrowDown');
  const corte = await cuadro(page);
  expect(corte).toBeGreaterThan(0);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => cuadro(page)).toBe(0);

  // zoom: teclado, botones, deslizador y rueda con ⌘; todo conserva el foco del teclado
  const z0 = await ppc(page);
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('=');
  await expect.poll(() => ppc(page)).toBeGreaterThan(z0);
  const z1 = await ppc(page);
  await page.getByTestId('zoom-mas').click();
  await expect.poll(() => ppc(page)).toBeGreaterThan(z1);
  await page.getByTestId('zoom-ajustar').click();
  await expect.poll(() => ppc(page)).toBeCloseTo(z0, 1);
  const bl = (await page.getByTestId('timeline').boundingBox())!;
  await page.mouse.move(bl.x + 300, bl.y + 80);
  await page.keyboard.down('Meta');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Meta');
  await expect.poll(() => ppc(page)).toBeGreaterThan(z0 * 1.4);
  // acercado: la rueda sin teclas desplaza en horizontal
  const antes = await scrollX(page);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => scrollX(page)).toBeGreaterThan(antes);
  // el zoom alto muestra las palabras
  for (let k = 0; k < 4; k++) await page.keyboard.press('=');
  await expect(page.getByTestId('fila-corte').locator('span').first()).toBeVisible();
  await page.keyboard.press('0');

  // reproducir no redibuja las pistas (lo que hacía sentir pesada la línea de tiempo)
  const mutaciones = await page.evaluate(
    () =>
      new Promise<number>((ok) => {
        const fila = document.querySelector('[data-testid=fila-corte]')!;
        let n = 0;
        const o = new MutationObserver((l) => (n += l.length));
        o.observe(fila, {subtree: true, childList: true, attributes: true, characterData: true});
        (document.querySelector('[data-testid=play]') as HTMLElement).click();
        setTimeout(() => {
          (document.querySelector('[data-testid=play]') as HTMLElement).click();
          o.disconnect();
          ok(n);
        }, 1200);
      }),
  );
  expect(mutaciones).toBe(0);

  // la altura se puede ajustar
  const h0 = (await page.getByTestId('panel-timeline').boundingBox())!.height;
  const asa = (await page.getByTestId('asa-timeline').boundingBox())!;
  await page.mouse.move(asa.x + 200, asa.y + 3);
  await page.mouse.down();
  await page.mouse.move(asa.x + 200, asa.y - 70, {steps: 4});
  await page.mouse.up();
  expect((await page.getByTestId('panel-timeline').boundingBox())!.height).toBeGreaterThan(h0 + 40);
  await page.screenshot({path: 'test-results/timeline-navegar.png'});
  await app.close();
});

test('recortes: dividir, quitar, recuperar, bordes, deshacer y aplicar', async () => {
  const {app, page} = await lanzar(P);
  await expect(page.locator('[data-testid^=corte-]').first()).toBeVisible();
  const original = JSON.stringify(j('edicion/plan.json').piezas);
  const piezas = () => j('edicion/plan.json').piezas as {de: number; a: number; quitar?: number[]; pegada?: boolean}[];
  const guardado = async () => {
    await expect(page.getByTestId('estado-guardado')).toHaveText('guardado');
    await page.waitForTimeout(600);
  };
  const y = await yCorte(page);
  await page.getByTestId('zoom-ajustar').click();
  await expect(page.getByTestId('aplicar-recortes')).toHaveCount(0);

  // --- dividir con S en medio del primer tramo: dos piezas, sin recorte pendiente audible
  await irAlInicio(page);
  for (let k = 0; k < 40; k++) await page.keyboard.press('ArrowRight');
  await expect.poll(() => cuadro(page)).toBe(40);
  const n0 = piezas().length;
  await page.keyboard.press('s');
  await hasta(() => piezas().length === n0 + 1);
  expect(piezas()[1].pegada).toBe(true);
  await page.getByTestId('timeline-deshacer').click();
  await hasta(() => piezas().length === n0);

  // --- cuchilla: un clic divide
  await page.keyboard.press('b');
  await page.mouse.click(await xDe(page, 50), y);
  await hasta(() => piezas().length === n0 + 1);
  await page.keyboard.press('v');
  await page.getByTestId('timeline-deshacer').click();
  await hasta(() => piezas().length === n0);
  await guardado();

  // --- arrastrar sobre el corte selecciona palabras; X las quita y aparece tachado
  await arrastrar(page, await xDe(page, 30), y, await xDe(page, 62));
  const rango = page.getByTestId('rango');
  await expect(rango).toBeVisible();
  const a = Number(await rango.getAttribute('data-a'));
  const b = Number(await rango.getAttribute('data-b'));
  expect(b).toBeGreaterThan(a);
  await page.keyboard.press('x');
  await expect(page.locator('[data-quitada]').first()).toBeVisible();
  await expect(page.getByTestId('aplicar-recortes')).toBeVisible();
  await hasta(() => JSON.stringify(piezas()) !== original);
  await page.screenshot({path: 'test-results/timeline-recorte.png'});

  // --- la vista previa se salta lo quitado sin re-cortar
  await irAlInicio(page);
  for (let k = 0; k < Math.max(0, a - 12); k++) await page.keyboard.press('ArrowRight');
  await page.evaluate(([x, y2]) => {
    const w = window as unknown as {dentro: number; vistos: number};
    w.dentro = 0;
    w.vistos = 0;
    const el = document.querySelector('[data-testid=tiempo]')!;
    const mo = new MutationObserver(() => {
      const t = el.textContent!.match(/(\d+):(\d+)\.(\d+)/)!;
      const f = (Number(t[1]) * 60 + Number(t[2])) * 30 + Number(t[3]);
      w.vistos = Math.max(w.vistos, f);
      if (f > x + 2 && f < y2 - 2) w.dentro++;
    });
    mo.observe(el, {subtree: true, childList: true, characterData: true});
  }, [a, b]);
  await page.keyboard.press(' ');
  await expect.poll(() => page.evaluate(() => (window as unknown as {vistos: number}).vistos), {timeout: 60_000}).toBeGreaterThan(b + 3);
  await page.keyboard.press(' ');
  expect(await page.evaluate(() => (window as unknown as {dentro: number}).dentro)).toBe(0);

  // --- recuperar lo tachado (clic en el bloque tachado + R)
  const tachado = page.locator('[data-quitada]').first();
  const tb = (await tachado.boundingBox())!;
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.keyboard.press('r');
  await expect(page.locator('[data-quitada]')).toHaveCount(0);
  await expect(page.getByTestId('aplicar-recortes')).toHaveCount(0);

  // --- recortar arrastrando el borde del tramo (por palabras) y con Q / W
  const borde = page.getByTestId('corte-borde-ini-0');
  const bb = (await borde.boundingBox())!;
  await arrastrar(page, bb.x + 2, bb.y + bb.height / 2, bb.x + 2 + 45 * (await ppc(page)));
  await expect(page.locator('[data-quitada]').first()).toBeVisible();
  await page.getByTestId('timeline-deshacer').click();
  await expect(page.locator('[data-quitada]')).toHaveCount(0);
  await irAlInicio(page);
  for (let k = 0; k < 30; k++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('q');
  await expect(page.locator('[data-quitada]').first()).toBeVisible();
  await page.getByTestId('timeline-deshacer').click();
  await expect(page.locator('[data-quitada]')).toHaveCount(0);
  await guardado();

  // --- aplicar de verdad: Enter regenera cut.mp4 y data.json; deja anclas válidas y nada pendiente
  const framesAntes = (() => {
    const e = j('edicion/edl_final.json');
    return e[e.length - 1].start + e[e.length - 1].frames;
  })();
  await arrastrar(page, await xDe(page, 30), y, await xDe(page, 62));
  await page.keyboard.press('x');
  await expect(page.getByTestId('aplicar-recortes')).toBeVisible();
  const m0 = fs.statSync(path.join(P, 'public/cut.mp4')).mtimeMs;
  await guardado();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('avisos')).toContainText('Recortes aplicados', {timeout: 120_000});
  expect(fs.statSync(path.join(P, 'public/cut.mp4')).mtimeMs).toBeGreaterThan(m0);
  const e = j('edicion/edl_final.json');
  const framesDespues = e[e.length - 1].start + e[e.length - 1].frames;
  expect(framesDespues).toBeLessThan(framesAntes);
  expect(j('src/data.json').words.length).toBeGreaterThan(0);
  expect(JSON.stringify(j('edicion/plan_cortado.json').piezas)).toBe(JSON.stringify(j('edicion/plan.json').piezas));
  await expect(page.getByTestId('aplicar-recortes')).toHaveCount(0);
  await expect(page.locator('[data-quitada]')).toHaveCount(0);
  // el reproductor ya usa el video nuevo y dura lo nuevo
  await expect.poll(() => page.getByTestId('tiempo').innerText()).toContain(`${Math.floor((framesDespues - 1) / 30)}.`);
  expect(await page.locator('video').first().evaluate((v: HTMLVideoElement) => v.currentSrc)).toMatch(/__v\d+/);

  // --- deshacer después de aplicar: vuelve a estar pendiente y `reel datos` no truena con anclas viejas
  await page.getByTestId('timeline-deshacer').click();
  await expect(page.getByTestId('aplicar-recortes')).toBeVisible();
  await guardado();
  await page.keyboard.press('Enter');
  await expect.poll(async () => {
    const x = j('edicion/edl_final.json');
    return x[x.length - 1].start + x[x.length - 1].frames;
  }, {timeout: 120_000}).toBe(framesAntes);
  await expect(page.getByTestId('aplicar-recortes')).toHaveCount(0, {timeout: 60_000});
  await expect(page.getByTestId('avisos')).not.toContainText('reel datos:');
  await page.screenshot({path: 'test-results/timeline-aplicado.png'});
  await app.close();
});

test('elementos: mover con imán, estirar, empujar, duplicar y recortar al cabezal', async () => {
  const {app, page} = await lanzar(P);
  const ev = () => j('edicion/eventos.json').etiquetas as Record<string, unknown>[];
  const bloque = page.getByTestId('bloque-labels-0');
  await expect(bloque).toBeVisible();

  // mover: guía del imán visible y queda anclado a una palabra
  const en0 = JSON.stringify(ev()[0].en);
  const b0 = (await bloque.boundingBox())!;
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
  await page.mouse.down();
  await page.mouse.move(b0.x + b0.width / 2 + 60, b0.y + b0.height / 2, {steps: 8});
  await expect(page.getByTestId('guia-iman')).toBeVisible();
  await page.mouse.up();
  await hasta(() => JSON.stringify(ev()[0].en) !== en0);

  // estirar por el borde final
  const dur0 = Number(ev()[0].dur);
  const fin = (await page.getByTestId('borde-fin-labels-0').boundingBox())!;
  await arrastrar(page, fin.x + 3, fin.y + fin.height / 2, fin.x + 3 + 25);
  await hasta(() => Number(ev()[0].dur) > dur0);

  // duplicar y borrar
  await bloque.click();
  const n = ev().length;
  await page.keyboard.press('Meta+d');
  await hasta(() => ev().length === n + 1);
  await page.keyboard.press('x');
  await hasta(() => ev().length === n);

  // empujar un cuadro y recortar el final al cabezal
  await bloque.click();
  await page.getByTestId('timeline').click({position: {x: 300, y: 12}, force: true}).catch(() => {});
  await bloque.click();
  const antes = JSON.stringify(ev()[0]);
  await page.keyboard.press('.');
  await hasta(() => JSON.stringify(ev()[0]) !== antes);
  const durE = Number(ev()[0].dur);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('w');
  await hasta(() => Number(ev()[0].dur) < durE);
  await expect(page.getByTestId('avisos')).not.toContainText('reel datos:');
  await app.close();
  limpiarCache(P);
});

test('recientes: lo editado con la skill aparece solo', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-registro-'));
  const registro = path.join(tmp, 'proyectos.json');
  process.env.REEL_REGISTRO = registro;
  try {
    const {app, page} = await lanzar(false);
    await expect(page.getByTestId('biblioteca')).toBeVisible();
    await expect(page.getByTestId('reciente')).toHaveCount(0);

    // la skill toca un proyecto con la app abierta (sin haberlo abierto nunca aquí)
    const reel = path.join(__dirname, '../../skill/editar-reel/scripts/reel.py');
    const py = path.join(os.homedir(), '.reels-toolkit/venv/bin/python');
    const env = {...process.env, REEL_REGISTRO: registro};
    execFileSync(py, [reel, 'datos', '-p', P], {env});
    await expect(page.getByTestId('reciente')).toHaveCount(1, {timeout: 10_000});
    await expect(page.getByTestId('reciente').first()).toHaveAttribute('data-ruta', fs.realpathSync(P));
    await expect(page.getByTestId('reciente').first()).toContainText('skill');
    await expect(page.getByTestId('reciente').first().locator('img')).toBeVisible({timeout: 20_000});

    // buscar en la lista
    await page.getByTestId('buscar-reciente').fill('no-existe-zzz');
    await expect(page.getByTestId('reciente')).toHaveCount(0);
    await page.getByTestId('buscar-reciente').fill('');

    // reel proyectos --buscar no duplica
    execFileSync(py, [reel, 'proyectos', '--buscar', path.dirname(P)], {env});
    await page.waitForTimeout(500);
    await expect(page.getByTestId('reciente')).toHaveCount(1);

    // un clic y entra directo al editor
    await page.getByTestId('reciente').first().click();
    await expect(page.getByTestId('editor')).toBeVisible();
    await page.getByTestId('volver').click();
    await expect(page.getByTestId('reciente').first()).not.toContainText('skill');
    await page.screenshot({path: 'test-results/biblioteca.png'});
    await app.close();
  } finally {
    delete process.env.REEL_REGISTRO;
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});
