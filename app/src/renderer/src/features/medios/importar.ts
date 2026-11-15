// Medios del proyecto (public/): importar archivos y agregarlos como capas en un cuadro.
// Lo usan el panel Medios, la línea de tiempo (soltar) y la vista previa (soltar).
import {agregarEvento, type Lista, type Obj} from '@shared/elementos';
import {FPS} from '@shared/anclas';
import {useEditor} from '@/store';

export type TipoMedio = 'video' | 'imagen' | 'audio';
export const tipoDe = (f: string): TipoMedio | null =>
  /\.(mp4|mov|m4v|webm)$/i.test(f) ? 'video' : /\.(png|jpe?g|svg|webp|gif)$/i.test(f) ? 'imagen' : /\.(wav|mp3|m4a|aac|aiff?)$/i.test(f) ? 'audio' : null;
export const EXTENSIONES = ['mp4', 'mov', 'm4v', 'webm', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'wav', 'mp3', 'm4a', 'aac', 'aif', 'aiff'];
// carpeta de public/ donde se guarda cada tipo al importar
const CARPETA: Record<TipoMedio, string> = {video: 'medios', imagen: 'img', audio: 'audio'};

// copia archivos del disco a public/<carpeta>/ y devuelve sus rutas relativas a public/
export const importar = async (rutas: string[]): Promise<string[]> => {
  const info = useEditor.getState().info;
  if (!info) return [];
  const out: string[] = [];
  for (const r of rutas) {
    const nombre = r.split('/').pop()!;
    const t = tipoDe(nombre);
    if (!t) continue;
    out.push(await window.reel.copiarAPublic(info.id, r, `${CARPETA[t]}/${nombre}`));
  }
  if (out.length) useEditor.getState().avisar('ok', `${out.length} archivo${out.length === 1 ? '' : 's'} importado${out.length === 1 ? '' : 's'} a public/`);
  return out;
};

// en qué lista entra cada tipo de archivo (por defecto: video/imagen = superpuesto, audio = pista de audio)
export type Como = 'superpuestos' | 'audios' | 'broll' | 'images' | 'completo';
export const comoPorDefecto = (rel: string): Como => (tipoDe(rel) === 'audio' ? 'audios' : 'superpuestos');

// agrega el medio rel (ruta en public/) en el cuadro f
export const agregarMedio = async (rel: string, f: number, como: Como = comoPorDefecto(rel)) => {
  const s = useEditor.getState();
  if (!s.data || !s.info) return;
  const t = tipoDe(rel);
  const n: number = s.data.n ?? 0;
  const lista: Lista = como === 'completo' ? 'superpuestos' : como;
  const extra: Obj = {src: rel};
  if (como === 'completo') Object.assign(extra, {completo: true, entrada: 'ninguna', salida: 'ninguna'});
  if (como === 'images') Object.assign(extra, {pos: 'centro', ancho: 760, tarjeta: false});
  // duración: la del archivo (video/audio) sin pasarse del final del corte
  if (t === 'video' || t === 'audio') {
    const d = await window.reel.duracionMedio(s.info.id, rel);
    const resto = Math.max(0.5, (n - f) / FPS);
    if (d) extra.dur = +Math.min(d, resto).toFixed(2);
    else if (t === 'audio') extra.dur = +resto.toFixed(2);
  }
  const s2 = useEditor.getState();
  const r = agregarEvento(s2.data!, s2.eventos ?? {}, lista, f, extra);
  // la aproximación de data usa la duración por defecto de la lista: se corrige con la del archivo
  const it = r.data[lista]?.[r.sel.i];
  if (it && extra.dur) it.b = it.a + Math.round(extra.dur * FPS);
  s2.editar({data: r.data, eventos: r.eventos});
  s2.seleccionar(r.sel);
  s2.set({panel: 'inspector'});
};

// arrastrar un medio desde el panel: tipo MIME propio con la ruta en public/
export const MIME_MEDIO = 'application/x-reel-medio';

// maneja un "drop" (medio del panel o archivos de Finder) en el cuadro f
export const soltarEn = async (e: DragEvent | React.DragEvent, f: number) => {
  const dt = e.dataTransfer;
  if (!dt) return;
  const rel = dt.getData(MIME_MEDIO);
  if (rel) return agregarMedio(rel, f);
  const rutas = [...dt.files].map((x) => window.reel.rutaDeArchivo(x)).filter(Boolean);
  if (!rutas.length) return;
  const rels = await importar(rutas);
  let g = f;
  for (const r of rels) {
    await agregarMedio(r, g);
    const s = useEditor.getState();
    const sel = s.sel;
    const it = sel ? s.data?.[sel.lista]?.[sel.i] : null;
    if (it && tipoDe(r) !== 'audio') g = it.b; // varios clips seguidos, uno después de otro
  }
};
export const aceptaSoltar = (e: React.DragEvent) => e.dataTransfer.types.includes(MIME_MEDIO) || e.dataTransfer.types.includes('Files');
