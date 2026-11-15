// Módulos que la app comparte con el código compilado de un proyecto (main/compilar.ts → window.__reelDeps):
// el componente del proyecto usa el MISMO React y Remotion que el Player de la app.
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as JSX from 'react/jsx-runtime';
import * as Remotion from 'remotion';
import * as Player from '@remotion/player';
import * as RThree from '@remotion/three';
import * as THREE from 'three';
import {useEffect, useState} from 'react';
import type {ProyectoInfo} from '@shared/tipos';
import {cargarFuentes} from '@plantilla/theme';

// @remotion/google-fonts/LilitaOne → "Lilita One" con las fuentes locales de la plantilla (sin internet)
let baseFuentes: string | null = null;
const googleFonts = (modulo: string) => {
  const familia = modulo.replace(/([a-z])([A-Z])/g, '$1 $2');
  const cargar = () => {
    cargarFuentes(baseFuentes);
    return {fontFamily: familia, fonts: {}, unicodeRanges: {}, waitUntilDone: () => Promise.resolve()};
  };
  return {loadFont: cargar, getInfo: () => ({fontFamily: familia})};
};

declare global {
  interface Window {
    __reelDeps?: Record<string, unknown>;
    __reelProyecto?: {Reel?: React.FC<Record<string, unknown>>};
  }
}
// los proyectos viejos leen getInputProps() al cargar (p. ej. {proxy}); en el Player eso lanza error: aquí devuelve {}
// staticFile() de Remotion antepone "/" aunque haya base: aquí apunta directo a public/ del proyecto abierto
const RemotionProyecto = {
  ...Remotion,
  getInputProps: () => ({}),
  staticFile: (p: string) => `${window.remotion_staticBase ?? ''}/${p.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`,
};
window.__reelDeps = {react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': JSX, 'react/jsx-dev-runtime': JSX, remotion: RemotionProyecto, '@remotion/player': Player, '@remotion/three': RThree, three: THREE, '@remotion/google-fonts': googleFonts};

// carga un script compilado y devuelve su componente Reel
const cargar = (codigo: string) =>
  new Promise<React.FC<Record<string, unknown>>>((ok, mal) => {
    // los errores al ejecutar el código del proyecto (un import que falta, etc.) se guardan para mostrarlos
    (window as {__reelError?: string}).__reelError = undefined;
    const url = URL.createObjectURL(new Blob(['try {\n', codigo, '\n;window.__reelProyecto = __reelProyecto;\n} catch (e) { window.__reelProyecto = undefined; window.__reelError = String(e && e.stack || e); }'], {type: 'text/javascript'}));
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => {
      URL.revokeObjectURL(url);
      s.remove();
      const c = window.__reelProyecto?.Reel;
      if (c) ok(c);
      else mal(new Error((window as {__reelError?: string}).__reelError?.split('\n').slice(0, 3).join('\n') ?? 'el proyecto no exporta Reel'));
    };
    s.onerror = () => (URL.revokeObjectURL(url), s.remove(), mal(new Error('no se pudo cargar el código del proyecto')));
    document.head.appendChild(s);
  });

export type EstadoPropios = {estado: 'sin' | 'compilando' | 'listo' | 'error'; Reel?: React.FC<Record<string, unknown>>; error?: string; ms?: number; editable?: boolean};

// compila los componentes propios del proyecto (si tiene) y vuelve a compilar cuando cambia `version`
export const useComponentesPropios = (info: ProyectoInfo | null, version: unknown): EstadoPropios => {
  const [e, setE] = useState<EstadoPropios>({estado: 'sin'});
  const propios = !!info?.estado.componentesPropios.length;
  useEffect(() => {
    if (!info || !propios) return setE({estado: 'sin'});
    let vivo = true;
    // staticFile() de los componentes viejos del proyecto apunta a public/ del proyecto abierto
    window.remotion_staticBase = info.base.replace(/\/$/, '');
    baseFuentes = `${info.base}__plantilla/fonts/`;
    setE((x) => (x.Reel ? x : {estado: 'compilando'}));
    const t = setTimeout(async () => {
      const r = await window.reel.compilarProyecto(info.id);
      if (!vivo) return;
      if (!r.ok) return setE({estado: 'error', error: r.error});
      try {
        const Reel = await cargar(r.codigo);
        if (vivo) setE({estado: 'listo', Reel, ms: r.ms, editable: r.editable});
      } catch (err) {
        if (vivo) setE({estado: 'error', error: String((err as Error).message ?? err)});
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [info?.id, propios, version]);
  return e;
};
