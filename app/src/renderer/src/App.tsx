// Raíz: biblioteca ↔ editor, y la conexión con el proceso principal (cambios en disco y trabajos de reel.py).
import React, {useEffect} from 'react';
import {aceptarDataExterna, ARCHIVO_DE, conPausa, docDeArchivo, useEditor, type Doc} from './store';
import {Biblioteca} from './features/biblioteca/Biblioteca';
import {Editor} from './features/editor/Editor';

export const App: React.FC = () => {
  const info = useEditor((s) => s.info);

  const abrir = async (ruta: string) => {
    try {
      const s = await window.reel.abrir(ruta);
      useEditor.getState().cargar(s);
    } catch (e) {
      useEditor.getState().avisar('error', String((e as Error).message ?? e).replace(/^Error invoking remote method 'abrir': (Error: )?/, ''));
    }
  };

  useEffect(() => {
    const quitarCambio = window.reel.onCambio(async (c) => {
      const s = useEditor.getState();
      if (!s.info || c.proyecto !== s.info.id) return;
      if (c.archivo === 'public/cut.mp4') {
        useEditor.setState({info: await window.reel.info(s.info.id)});
        return;
      }
      const doc = docDeArchivo(c.archivo);
      if (!doc) return;
      if (s.hashes[doc] === c.hash) return;
      if (doc === 'data') {
        if (aceptarDataExterna()) await s.recargar('data');
        return;
      }
      if (s.sucios.includes(doc)) return; // la app tiene cambios propios sin guardar: al guardar se detecta el conflicto
      await s.recargar(doc);
      if (doc !== 'edl' && doc !== 'proyecto') s.avisar('info', `${ARCHIVO_DE[doc as Doc]} cambió fuera de la app; se recargó.`);
    });
    const quitarTrabajo = window.reel.onTrabajo(async (t) => {
      const s = useEditor.getState();
      const trabajos = [t, ...s.trabajos.filter((x) => x.id !== t.id)].slice(0, 60);
      useEditor.setState({trabajos});
      if (!s.info || t.proyecto !== s.info.id) return;
      if (t.estado === 'ok' || t.estado === 'error') {
        if (t.comando[0] === 'datos') {
          if (t.estado === 'error') s.avisar('error', `reel datos: ${t.ultimo ?? 'error'}`);
          else if (aceptarDataExterna()) await s.recargar('data');
        } else {
          s.avisar(t.estado === 'ok' ? 'ok' : 'error', `${t.titulo}: ${t.estado === 'ok' ? 'listo' : t.ultimo ?? 'error'}`);
          const info = await window.reel.info(s.info.id);
          useEditor.setState({info});
          for (const d of ['data', 'edl', 'plan', 'eventos', 'estilo', 'proyecto', 'vlog'] as Doc[]) await s.recargar(d);
          if (['cortar', 'datos'].includes(t.comando[0]) && t.estado === 'ok') conPausa(() => useEditor.setState({corteDesactualizado: false}));
        }
      }
    });
    window.reel.trabajos().then((l) => useEditor.setState({trabajos: l}));
    const quitarAbrir = window.reel.onAbrir((r) => abrir(r));
    return () => {
      quitarAbrir();
      quitarCambio();
      quitarTrabajo();
    };
  }, []);

  return (
    <div className="h-full">
      {info ? <Editor /> : <Biblioteca abrir={abrir} />}
      <Avisos />
    </div>
  );
};

const Avisos: React.FC = () => {
  const avisos = useEditor((s) => s.avisos);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-96 flex-col gap-2" data-testid="avisos">
      {avisos.map((a) => (
        <div
          key={a.id}
          className={`pointer-events-auto rounded-md border px-3 py-2 text-xs shadow-xl ${
            a.tipo === 'error' ? 'border-rose-700 bg-rose-950 text-rose-100' : a.tipo === 'ok' ? 'border-emerald-700 bg-emerald-950 text-emerald-100' : 'border-zinc-700 bg-zinc-900 text-zinc-200'
          }`}
        >
          {a.texto}
        </div>
      ))}
    </div>
  );
};
