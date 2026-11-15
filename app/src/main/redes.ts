// Publicar directo con las APIs oficiales (sin abrir el navegador para subir):
//   - TikTok: Content Posting API, subida a la bandeja de entrada (el creador termina la publicación en la app de TikTok).
//     Requiere una app en developers.tiktok.com con el producto "Content Posting API" y el permiso video.upload.
//     Conexión con OAuth 2 + PKCE y redirección a 127.0.0.1 (la app abre el navegador una vez y guarda el token).
//   - Instagram: Graph API, Reels con subida resumible (rupload.facebook.com). Requiere una cuenta profesional ligada a
//     una app de Meta; se pegan el token de acceso y el id de la cuenta de Instagram.
// Las credenciales se guardan cifradas con safeStorage (llavero de macOS) en userData/redes.json, nunca en texto plano.
// Las URL de cada API se pueden cambiar con variables de entorno (las pruebas usan un servidor simulado).
import {app, safeStorage, shell} from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export type Red = 'tiktok' | 'instagram';
type Credenciales = {
  tiktok?: {clientKey: string; clientSecret: string; token?: string; refresh?: string; expira?: number; usuario?: string};
  instagram?: {token: string; cuenta: string};
};
export type EstadoRedes = {tiktok: {configurada: boolean; conectada: boolean; usuario?: string}; instagram: {configurada: boolean}};

const URL = {
  tiktokAuth: () => process.env.REEL_TIKTOK_AUTH || 'https://www.tiktok.com/v2/auth/authorize/',
  tiktokApi: () => process.env.REEL_TIKTOK_API || 'https://open.tiktokapis.com',
  igApi: () => process.env.REEL_IG_API || 'https://graph.facebook.com/v21.0',
  igUpload: () => process.env.REEL_IG_UPLOAD || 'https://rupload.facebook.com/ig-api-upload/v21.0',
};

// ---------------------------------------------------------------- credenciales cifradas
const archivo = () => path.join(app.getPath('userData'), 'redes.json');
const cifrar = (s: string) => (safeStorage.isEncryptionAvailable() ? 'c:' + safeStorage.encryptString(s).toString('base64') : 'p:' + Buffer.from(s).toString('base64'));
const descifrar = (s: string) => (s.startsWith('c:') ? safeStorage.decryptString(Buffer.from(s.slice(2), 'base64')) : Buffer.from(s.slice(2), 'base64').toString());
const leer = (): Credenciales => {
  try {
    return JSON.parse(descifrar(fs.readFileSync(archivo(), 'utf8')));
  } catch {
    return {};
  }
};
const escribir = (c: Credenciales) => {
  fs.mkdirSync(path.dirname(archivo()), {recursive: true});
  fs.writeFileSync(archivo(), cifrar(JSON.stringify(c)), {mode: 0o600});
};

export const estadoRedes = (): EstadoRedes => {
  const c = leer();
  return {
    tiktok: {configurada: !!c.tiktok?.clientKey, conectada: !!c.tiktok?.token, usuario: c.tiktok?.usuario},
    instagram: {configurada: !!(c.instagram?.token && c.instagram?.cuenta)},
  };
};
export const configurarRed = (red: Red, datos: Record<string, string> | null) => {
  const c = leer();
  if (!datos) delete c[red];
  else if (red === 'tiktok') c.tiktok = {clientKey: datos.clientKey?.trim() ?? '', clientSecret: datos.clientSecret?.trim() ?? ''};
  else c.instagram = {token: datos.token?.trim() ?? '', cuenta: datos.cuenta?.trim() ?? ''};
  escribir(c);
  return estadoRedes();
};

// ---------------------------------------------------------------- utilidades HTTP
const json = async (r: Response) => {
  const t = await r.text();
  let j: Record<string, any> = {};
  try {
    j = JSON.parse(t);
  } catch {
    /* respuesta sin JSON */
  }
  if (!r.ok || (j.error && j.error.code && j.error.code !== 'ok') || (j.error && typeof j.error === 'string')) {
    const msg = j.error?.message || j.error_description || j.error || t.slice(0, 200);
    throw new Error(`${r.status} ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return j;
};
const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
export type Progreso = (texto: string, fraccion?: number) => void;

// ---------------------------------------------------------------- TikTok: OAuth 2 con PKCE (app de escritorio)
// TikTok pide code_challenge = SHA256(code_verifier) en hexadecimal para apps de escritorio
const pkce = () => {
  const verifier = crypto.randomBytes(48).toString('base64url');
  return {verifier, challenge: crypto.createHash('sha256').update(verifier).digest('hex')};
};

export const conectarTiktok = async (): Promise<EstadoRedes> => {
  const c = leer();
  if (!c.tiktok?.clientKey || !c.tiktok.clientSecret) throw new Error('Primero pega el Client key y el Client secret de tu app de TikTok.');
  const {verifier, challenge} = pkce();
  const estado = crypto.randomBytes(16).toString('hex');
  const servidor = http.createServer();
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  const puerto = (servidor.address() as {port: number}).port;
  const redirect = `http://127.0.0.1:${puerto}/callback/`;
  const codigo = new Promise<string>((ok, mal) => {
    const t = setTimeout(() => mal(new Error('Se agotó el tiempo para autorizar en TikTok (5 min).')), 5 * 60_000);
    servidor.on('request', (req, res) => {
      const u = new globalThis.URL(req.url ?? '/', redirect);
      if (!u.pathname.startsWith('/callback')) return res.writeHead(404).end();
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}).end('<meta charset="utf-8"><body style="font-family:sans-serif;padding:40px">Listo: ya puedes volver a Reel Studio.</body>');
      clearTimeout(t);
      if (u.searchParams.get('state') !== estado) return mal(new Error('La respuesta de TikTok no coincide (state).'));
      const code = u.searchParams.get('code');
      code ? ok(code) : mal(new Error(u.searchParams.get('error_description') || u.searchParams.get('error') || 'TikTok no devolvió el código.'));
    });
  });
  const q = new URLSearchParams({client_key: c.tiktok.clientKey, scope: 'user.info.basic,video.upload', response_type: 'code', redirect_uri: redirect, state: estado, code_challenge: challenge, code_challenge_method: 'S256'});
  const url = `${URL.tiktokAuth()}?${q}`;
  try {
    // en pruebas no se abre el navegador: se sigue la redirección del servidor simulado
    if (process.env.REEL_NO_ABRIR) fetch(url, {redirect: 'follow'}).catch(() => {});
    else shell.openExternal(url);
    const code = await codigo;
    const tok = await json(
      await fetch(`${URL.tiktokApi()}/v2/oauth/token/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({client_key: c.tiktok.clientKey, client_secret: c.tiktok.clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirect, code_verifier: verifier}),
      }),
    );
    c.tiktok = {...c.tiktok, token: tok.access_token, refresh: tok.refresh_token, expira: Date.now() + (tok.expires_in ?? 86400) * 1000};
    try {
      const yo = await json(await fetch(`${URL.tiktokApi()}/v2/user/info/?fields=display_name`, {headers: {Authorization: `Bearer ${tok.access_token}`}}));
      c.tiktok.usuario = yo.data?.user?.display_name;
    } catch {
      /* el nombre es solo informativo */
    }
    escribir(c);
    return estadoRedes();
  } finally {
    servidor.close();
  }
};

// el token de TikTok dura 24 h: se renueva con el refresh token
const tokenTiktok = async (): Promise<string> => {
  const c = leer();
  const t = c.tiktok;
  if (!t?.token) throw new Error('Conecta tu cuenta de TikTok en Preferencias → Redes.');
  if (!t.expira || t.expira - Date.now() > 5 * 60_000 || !t.refresh) return t.token;
  const tok = await json(
    await fetch(`${URL.tiktokApi()}/v2/oauth/token/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({client_key: t.clientKey, client_secret: t.clientSecret, grant_type: 'refresh_token', refresh_token: t.refresh}),
    }),
  );
  c.tiktok = {...t, token: tok.access_token, refresh: tok.refresh_token ?? t.refresh, expira: Date.now() + (tok.expires_in ?? 86400) * 1000};
  escribir(c);
  return c.tiktok.token!;
};

// trozos según las reglas de TikTok: hasta 64 MB va en uno; si no, trozos de 10 MB (el último absorbe el resto)
export const trozosTiktok = (tam: number) => {
  if (tam <= 64 * 1024 * 1024) return {chunk: tam, total: 1};
  const chunk = 10 * 1024 * 1024;
  return {chunk, total: Math.floor(tam / chunk)};
};

const subirTiktok = async (video: string, avance: Progreso) => {
  const token = await tokenTiktok();
  const tam = fs.statSync(video).size;
  const {chunk, total} = trozosTiktok(tam);
  avance('TikTok: preparando la subida…', 0);
  const ini = await json(
    await fetch(`${URL.tiktokApi()}/v2/post/publish/inbox/video/init/`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8'},
      body: JSON.stringify({source_info: {source: 'FILE_UPLOAD', video_size: tam, chunk_size: chunk, total_chunk_count: total}}),
    }),
  );
  const {upload_url: subida, publish_id: id} = ini.data ?? {};
  if (!subida || !id) throw new Error('TikTok no devolvió la URL de subida.');
  const fd = fs.openSync(video, 'r');
  try {
    for (let k = 0; k < total; k++) {
      const a = k * chunk;
      const b = k === total - 1 ? tam - 1 : a + chunk - 1;
      const buf = Buffer.alloc(b - a + 1);
      fs.readSync(fd, buf, 0, buf.length, a);
      const r = await fetch(subida, {method: 'PUT', headers: {'Content-Type': 'video/mp4', 'Content-Length': String(buf.length), 'Content-Range': `bytes ${a}-${b}/${tam}`}, body: buf});
      if (!r.ok) throw new Error(`TikTok rechazó el trozo ${k + 1}/${total}: ${r.status}`);
      avance(`TikTok: subiendo ${k + 1}/${total}`, (k + 1) / total);
    }
  } finally {
    fs.closeSync(fd);
  }
  // estado: SEND_TO_USER_INBOX = ya está en la bandeja de TikTok para terminar de publicar
  for (let i = 0; i < 60; i++) {
    const st = await json(await fetch(`${URL.tiktokApi()}/v2/post/publish/status/fetch/`, {method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8'}, body: JSON.stringify({publish_id: id})}));
    const s = st.data?.status;
    if (s === 'SEND_TO_USER_INBOX' || s === 'PUBLISH_COMPLETE') return {id, mensaje: 'Listo: abre TikTok y termina la publicación desde tu bandeja de entrada (notificaciones).'};
    if (s === 'FAILED') throw new Error(`TikTok no pudo procesar el video: ${st.data?.fail_reason ?? 'sin motivo'}`);
    avance('TikTok: procesando…', 1);
    await espera(process.env.REEL_NO_ABRIR ? 50 : 3000);
  }
  return {id, mensaje: 'Subido; TikTok sigue procesándolo. Revisa tu bandeja de entrada en unos minutos.'};
};

// ---------------------------------------------------------------- Instagram: Reels con subida resumible
const subirInstagram = async (video: string, texto: string, avance: Progreso) => {
  const c = leer().instagram;
  if (!c?.token || !c.cuenta) throw new Error('Configura Instagram en Preferencias → Redes (token y id de la cuenta).');
  const q = (o: Record<string, string>) => new URLSearchParams({...o, access_token: c.token});
  avance('Instagram: creando el contenedor…', 0);
  const cont = await json(await fetch(`${URL.igApi()}/${c.cuenta}/media?${q({media_type: 'REELS', upload_type: 'resumable', caption: texto, share_to_feed: 'true'})}`, {method: 'POST'}));
  if (!cont.id) throw new Error('Instagram no devolvió el contenedor.');
  const tam = fs.statSync(video).size;
  avance('Instagram: subiendo el video…', 0.1);
  await json(await fetch(cont.uri || `${URL.igUpload()}/${cont.id}`, {method: 'POST', headers: {Authorization: `OAuth ${c.token}`, offset: '0', file_size: String(tam)}, body: fs.readFileSync(video)}));
  for (let i = 0; i < 120; i++) {
    const st = await json(await fetch(`${URL.igApi()}/${cont.id}?${q({fields: 'status_code,status'})}`));
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`Instagram no pudo procesar el video: ${st.status ?? st.status_code}`);
    if (i === 119) throw new Error('Instagram tardó demasiado en procesar el video.');
    avance('Instagram: procesando…', 0.6);
    await espera(process.env.REEL_NO_ABRIR ? 50 : 5000);
  }
  const pub = await json(await fetch(`${URL.igApi()}/${c.cuenta}/media_publish?${q({creation_id: cont.id})}`, {method: 'POST'}));
  return {id: pub.id as string, mensaje: 'Publicado en Instagram como Reel.'};
};

export const subirA = async (red: Red, video: string, post: string | undefined, avance: Progreso) => {
  if (!fs.existsSync(video)) throw new Error(`No existe el video: ${video}`);
  const texto = post && fs.existsSync(post) ? fs.readFileSync(post, 'utf8').trim().slice(0, 2200) : '';
  return red === 'tiktok' ? subirTiktok(video, avance) : subirInstagram(video, texto, avance);
};
