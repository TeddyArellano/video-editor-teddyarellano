// Asistente "Nuevo proyecto": carpeta con los clips + estilo + nombre (+ marca) → reel nuevo, y luego
// inventario → SDR → transcribir en la cola. El plan y los eventos los propone Claude o se arman en Cortes.
import React, {useEffect, useState} from 'react';
import {useEditor} from '@/store';
import {Boton, Etiqueta, inputCls} from '@/ui';

export const NuevoProyecto: React.FC<{cerrar: () => void; abrir: (ruta: string) => void}> = ({cerrar, abrir}) => {
  const [carpeta, setCarpeta] = useState('');
  const [estilo, setEstilo] = useState('');
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [prompt, setPrompt] = useState('');
  const [preparar, setPreparar] = useState(true);
  const [cat, setCat] = useState<{estilos: {id: string; nombre: string; descripcion?: string}[]; marcas: {id: string; nombre: string}[]}>({estilos: [], marcas: []});
  const [trabajando, setTrabajando] = useState('');
  useEffect(() => {
    window.reel.estilos().then((c) => {
      setCat(c);
      setEstilo(c.estilos[0]?.id ?? '');
    });
  }, []);

  const crear = async () => {
    setTrabajando('Creando el proyecto…');
    const id = await window.reel.correr('', 'Nuevo proyecto', ['nuevo', carpeta, '--estilo', estilo, ...(nombre ? ['--nombre', nombre] : []), ...(marca ? ['--marca', marca] : [])]);
    // espera a que termine
    const t = await new Promise<string>((ok) => {
      const quitar = window.reel.onTrabajo((x) => {
        if (x.id === id && ['ok', 'error', 'cancelado'].includes(x.estado)) {
          quitar();
          ok(x.estado === 'ok' ? '' : x.ultimo ?? 'error');
        }
      });
    });
    if (t) {
      setTrabajando('');
      return useEditor.getState().avisar('error', `No se pudo crear: ${t}`);
    }
    abrir(carpeta);
    cerrar();
    if (preparar) {
      // espera a que el proyecto esté abierto para encolar los pasos del material
      setTimeout(async () => {
        const info = useEditor.getState().info;
        if (!info) return;
        await window.reel.cadena(info.id, [
          {titulo: 'Inventario', comando: ['inventario']},
          {titulo: 'SDR', comando: ['sdr']},
          {titulo: 'Transcribir', comando: ['transcribir', ...(prompt ? ['--prompt', prompt] : [])]},
        ]);
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" data-testid="nuevo">
      <div className="w-[520px] space-y-3 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h2 className="text-base font-semibold">Nuevo proyecto</h2>
        <Etiqueta n="Carpeta con los clips crudos">
          <div className="flex gap-1">
            <input className={inputCls} value={carpeta} onChange={(e) => setCarpeta(e.target.value)} placeholder="/Users/…/Content Creator/Mi video" />
            <Boton
              onClick={async () => {
                const r = await window.reel.elegirCarpeta('Carpeta con el material');
                if (r) {
                  setCarpeta(r);
                  if (!nombre) setNombre(r.split('/').pop() ?? '');
                }
              }}
            >
              Elegir…
            </Boton>
          </div>
        </Etiqueta>
        <Etiqueta n="Estilo">
          <select className={inputCls} value={estilo} onChange={(e) => setEstilo(e.target.value)}>
            {cat.estilos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} — {e.descripcion?.slice(0, 70)}
              </option>
            ))}
          </select>
        </Etiqueta>
        <div className="grid grid-cols-2 gap-2">
          <Etiqueta n="Nombre del video">
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Etiqueta>
          <Etiqueta n="Marca (opcional)">
            <select className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)}>
              <option value="">Ninguna</option>
              {cat.marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Etiqueta>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={preparar} onChange={(e) => setPreparar(e.target.checked)} className="accent-sky-500" />
          Preparar el material al crear (inventario → SDR → transcribir)
        </label>
        {preparar && (
          <Etiqueta n="Nombres propios para Whisper (opcional)">
            <input className={inputCls} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="IPN, ESCOM, Coursera…" />
          </Etiqueta>
        )}
        <div className="flex justify-end gap-2 pt-2">
          {trabajando && <span className="mr-auto self-center text-xs text-zinc-400">{trabajando}</span>}
          <Boton v="fantasma" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton v="primario" disabled={!carpeta || !estilo || !!trabajando} onClick={crear}>
            Crear
          </Boton>
        </div>
      </div>
    </div>
  );
};
