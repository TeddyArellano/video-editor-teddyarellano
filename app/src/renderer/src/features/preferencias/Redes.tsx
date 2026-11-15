// Preferencias → Redes: credenciales para publicar directo (se guardan cifradas en el llavero, ver main/redes.ts).
// TikTok: Client key + Client secret de una app con "Content Posting API" (redirect URI: http://127.0.0.1/callback/)
// y luego "Conectar" (autorización en el navegador). Instagram: token de acceso de larga duración + id de la cuenta
// profesional (de una app de Meta con instagram_content_publish).
import React, {useEffect, useState} from 'react';
import type {EstadoRedes} from '@shared/tipos';
import {Boton, Etiqueta, inputCls} from '@/ui';

export const Redes: React.FC = () => {
  const [e, setE] = useState<EstadoRedes | null>(null);
  const [tk, setTk] = useState({clientKey: '', clientSecret: ''});
  const [ig, setIg] = useState({token: '', cuenta: ''});
  const [msg, setMsg] = useState('');
  const [conectando, setConectando] = useState(false);
  useEffect(() => {
    window.reel.estadoRedes().then(setE);
  }, []);
  if (!e) return null;
  return (
    <div className="flex flex-col gap-3 text-xs" data-testid="redes">
      <div className="rounded-md border border-zinc-800 p-2">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-medium">TikTok</span>
          <span className={`text-[10px] ${e.tiktok.conectada ? 'text-emerald-400' : 'text-zinc-500'}`} data-testid="estado-tiktok">
            {e.tiktok.conectada ? `conectada${e.tiktok.usuario ? ` · ${e.tiktok.usuario}` : ''}` : e.tiktok.configurada ? 'falta conectar' : 'sin configurar'}
          </span>
          <div className="flex-1" />
          {e.tiktok.configurada && (
            <Boton onClick={async () => setE(await window.reel.configurarRed('tiktok', null))} title="Borrar credenciales">
              Quitar
            </Boton>
          )}
        </div>
        {!e.tiktok.configurada ? (
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] text-zinc-500">
              App en developers.tiktok.com con “Content Posting API” (permiso video.upload) y redirect URI http://127.0.0.1/callback/.
            </div>
            <Etiqueta n="Client key">
              <input className={inputCls} data-testid="tiktok-key" value={tk.clientKey} onChange={(x) => setTk({...tk, clientKey: x.target.value})} />
            </Etiqueta>
            <Etiqueta n="Client secret">
              <input className={inputCls} type="password" data-testid="tiktok-secret" value={tk.clientSecret} onChange={(x) => setTk({...tk, clientSecret: x.target.value})} />
            </Etiqueta>
            <Boton disabled={!tk.clientKey || !tk.clientSecret} onClick={async () => setE(await window.reel.configurarRed('tiktok', tk))} data-testid="tiktok-guardar">
              Guardar
            </Boton>
          </div>
        ) : (
          <Boton
            v={e.tiktok.conectada ? 'normal' : 'primario'}
            disabled={conectando}
            data-testid="tiktok-conectar"
            onClick={async () => {
              setConectando(true);
              setMsg('Autoriza en el navegador que se abrió…');
              const r = await window.reel.conectarTiktok();
              setConectando(false);
              if (r.ok) (setE(r.estado), setMsg(''));
              else setMsg(r.error);
            }}
          >
            {e.tiktok.conectada ? 'Volver a conectar' : 'Conectar cuenta de TikTok'}
          </Boton>
        )}
      </div>

      <div className="rounded-md border border-zinc-800 p-2">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-medium">Instagram</span>
          <span className={`text-[10px] ${e.instagram.configurada ? 'text-emerald-400' : 'text-zinc-500'}`} data-testid="estado-instagram">
            {e.instagram.configurada ? 'configurada' : 'sin configurar'}
          </span>
          <div className="flex-1" />
          {e.instagram.configurada && (
            <Boton onClick={async () => setE(await window.reel.configurarRed('instagram', null))} title="Borrar credenciales">
              Quitar
            </Boton>
          )}
        </div>
        {!e.instagram.configurada && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] text-zinc-500">Cuenta profesional ligada a una app de Meta con instagram_content_publish: token de acceso de larga duración e id de la cuenta de Instagram.</div>
            <Etiqueta n="Token de acceso">
              <input className={inputCls} type="password" data-testid="ig-token" value={ig.token} onChange={(x) => setIg({...ig, token: x.target.value})} />
            </Etiqueta>
            <Etiqueta n="Id de la cuenta de Instagram">
              <input className={inputCls} data-testid="ig-cuenta" value={ig.cuenta} onChange={(x) => setIg({...ig, cuenta: x.target.value})} />
            </Etiqueta>
            <Boton disabled={!ig.token || !ig.cuenta} onClick={async () => setE(await window.reel.configurarRed('instagram', ig))} data-testid="ig-guardar">
              Guardar
            </Boton>
          </div>
        )}
      </div>
      {msg && <div className="text-[11px] text-amber-300" data-testid="redes-aviso">{msg}</div>}
      <div className="text-[10px] text-zinc-500">Las credenciales se guardan cifradas en el llavero de macOS. Sin ellas, Exportar → Publicar abre la página de subida de cada red.</div>
    </div>
  );
};
