// Publicar directo (Preferencias → Redes + Exportar → Publicar) contra un servidor que simula las APIs de TikTok
// (OAuth con PKCE, Content Posting API con subida por trozos) e Instagram (Graph API, Reels con subida resumible).
// Verifica el flujo completo: credenciales, autorización, subida byte a byte, texto del post y publicación.
import {expect, test} from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {lanzar} from './util';

const P = process.env.REEL_FIXTURE2 ?? '';

type Registro = {verifier?: string; challenge?: string; tiktokBytes: number; tiktokTam?: number; igBytes: number; caption?: string; publicado: boolean; tokenIg?: string};
const simulador = async () => {
  const reg: Registro = {tiktokBytes: 0, igBytes: 0, publicado: false};
  let estadoTk = 0;
  let estadoIg = 0;
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url ?? '/', 'http://x');
    const cuerpo = await new Promise<Buffer>((ok) => {
      const b: Buffer[] = [];
      req.on('data', (c) => b.push(c));
      req.on('end', () => ok(Buffer.concat(b)));
    });
    const responder = (o: unknown, code = 200) => res.writeHead(code, {'Content-Type': 'application/json'}).end(JSON.stringify(o));
    const r = `${req.method} ${u.pathname}`;
    // --- TikTok
    if (r === 'GET /tiktok/auth') {
      reg.challenge = u.searchParams.get('code_challenge') ?? '';
      const dst = new URL(u.searchParams.get('redirect_uri')!);
      dst.searchParams.set('code', 'codigo-prueba');
      dst.searchParams.set('state', u.searchParams.get('state')!);
      return res.writeHead(302, {Location: dst.toString()}).end();
    }
    if (r === 'POST /tiktok/v2/oauth/token/') {
      const f = new URLSearchParams(cuerpo.toString());
      reg.verifier = f.get('code_verifier') ?? '';
      if (f.get('code') !== 'codigo-prueba' || f.get('client_secret') !== 'secreto') return responder({error: 'invalid_grant', error_description: 'código o secreto incorrecto'}, 400);
      return responder({access_token: 'token-tiktok', refresh_token: 'refresh', expires_in: 86400, open_id: 'u1', scope: 'video.upload'});
    }
    if (r === 'GET /tiktok/v2/user/info/') return responder({data: {user: {display_name: 'Creador de prueba'}}, error: {code: 'ok'}});
    if (r === 'POST /tiktok/v2/post/publish/inbox/video/init/') {
      if (req.headers.authorization !== 'Bearer token-tiktok') return responder({error: {code: 'access_token_invalid', message: 'token'}}, 401);
      const b = JSON.parse(cuerpo.toString());
      reg.tiktokTam = b.source_info.video_size;
      return responder({data: {publish_id: 'p1', upload_url: `http://127.0.0.1:${puerto}/tiktok/subir`}, error: {code: 'ok'}});
    }
    if (r === 'PUT /tiktok/subir') {
      reg.tiktokBytes += cuerpo.length;
      return res.writeHead(201).end();
    }
    if (r === 'POST /tiktok/v2/post/publish/status/fetch/') return responder({data: {status: estadoTk++ < 1 ? 'PROCESSING_UPLOAD' : 'SEND_TO_USER_INBOX'}, error: {code: 'ok'}});
    // --- Instagram
    if (r === 'POST /ig/17841400000/media') {
      reg.caption = u.searchParams.get('caption') ?? '';
      reg.tokenIg = u.searchParams.get('access_token') ?? '';
      if (u.searchParams.get('media_type') !== 'REELS' || u.searchParams.get('upload_type') !== 'resumable') return responder({error: {message: 'tipo'}}, 400);
      return responder({id: 'c1', uri: `http://127.0.0.1:${puerto}/igup/c1`});
    }
    if (r === 'POST /igup/c1') {
      if (req.headers.authorization !== 'OAuth token-ig' || Number(req.headers.file_size) !== cuerpo.length) return responder({error: {message: 'subida'}}, 400);
      reg.igBytes = cuerpo.length;
      return responder({success: true});
    }
    if (r === 'GET /ig/c1') return responder({status_code: estadoIg++ < 1 ? 'IN_PROGRESS' : 'FINISHED'});
    if (r === 'POST /ig/17841400000/media_publish') {
      reg.publicado = u.searchParams.get('creation_id') === 'c1';
      return responder({id: 'm1'});
    }
    responder({error: {message: `no simulado: ${r}`}}, 404);
  });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  const puerto = (srv.address() as {port: number}).port;
  return {reg, srv, base: `http://127.0.0.1:${puerto}`};
};

test('publicar directo en TikTok e Instagram (APIs simuladas)', async () => {
  test.skip(!P, 'falta REEL_FIXTURE2');
  test.setTimeout(240_000);
  const {reg, srv, base} = await simulador();
  Object.assign(process.env, {REEL_TIKTOK_AUTH: `${base}/tiktok/auth`, REEL_TIKTOK_API: `${base}/tiktok`, REEL_IG_API: `${base}/ig`, REEL_IG_UPLOAD: `${base}/igup`});
  const cfg = JSON.parse(fs.readFileSync(path.join(P, 'edicion/proyecto.json'), 'utf8'));
  const postTxt = path.join(cfg.fuentes, `${cfg.nombre} - post.txt`);
  fs.writeFileSync(postTxt, 'Lo que traigo en la mochila 🎒 #mochila #prueba');
  try {
    const {app, page, userData} = await lanzar(P);
    await expect(page.getByTestId('editor')).toBeVisible();

    // --- Preferencias → Redes: credenciales (cifradas) y conexión OAuth con PKCE
    await page.getByTitle('Preferencias').click();
    await page.getByTestId('tiktok-key').fill('clave-app');
    await page.getByTestId('tiktok-secret').fill('secreto');
    await page.getByTestId('tiktok-guardar').click();
    await expect(page.getByTestId('estado-tiktok')).toHaveText('falta conectar');
    await page.getByTestId('tiktok-conectar').click();
    await expect(page.getByTestId('estado-tiktok')).toContainText('Creador de prueba');
    expect(reg.challenge).toBe(crypto.createHash('sha256').update(reg.verifier!).digest('hex'));
    await page.getByTestId('ig-token').fill('token-ig');
    await page.getByTestId('ig-cuenta').fill('17841400000');
    await page.getByTestId('ig-guardar').click();
    await expect(page.getByTestId('estado-instagram')).toHaveText('configurada');
    // nada en texto plano en disco
    const guardado = fs.readFileSync(path.join(userData, 'redes.json'), 'utf8');
    expect(guardado).not.toContain('secreto');
    expect(guardado).not.toContain('token-ig');
    await page.getByTestId('preferencias').getByText('Cerrar').click();

    // --- exportar un borrador y subirlo directo
    await page.keyboard.press('Meta+e');
    await page.getByTestId('calidad-borrador').click();
    for (const f of ['16:9', '1:1', '4:5']) await page.getByTestId(`formato-${f}`).uncheck();
    await page.getByRole('checkbox', {name: 'Mostrar en Finder al terminar'}).uncheck();
    await page.getByTestId('exportar-ya').click();
    await expect(page.getByTestId('publicar-tiktok')).toHaveText('↑ TikTok', {timeout: 180_000});
    const video = path.join(P, 'edicion', 'borrador.mp4');
    const tam = fs.statSync(video).size;

    await page.getByTestId('publicar-tiktok').click();
    await expect(page.getByTestId('aviso-publicar')).toContainText('bandeja de entrada', {timeout: 30_000});
    expect(reg.tiktokTam).toBe(tam);
    expect(reg.tiktokBytes).toBe(tam);

    await page.getByTestId('publicar-instagram').click();
    await expect(page.getByTestId('aviso-publicar')).toContainText('Publicado en Instagram', {timeout: 30_000});
    expect(reg.igBytes).toBe(tam);
    expect(reg.caption).toBe('Lo que traigo en la mochila 🎒 #mochila #prueba');
    expect(reg.publicado).toBe(true);
    await page.screenshot({path: 'test-results/redes.png'});
    await app.close();
  } finally {
    srv.close();
    fs.rmSync(postTxt, {force: true});
    for (const k of ['REEL_TIKTOK_AUTH', 'REEL_TIKTOK_API', 'REEL_IG_API', 'REEL_IG_UPLOAD']) delete process.env[k];
  }
});
