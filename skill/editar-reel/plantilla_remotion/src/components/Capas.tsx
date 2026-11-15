// Capas libres estilo CapCut (nacieron con Reel Studio): textos, formas, superpuestos (video o imagen encima, PiP),
// pistas de audio con fundidos y ducking, ajustes de color y transiciones en los cortes.
// Todo sale de data.json (eventos.json → "textos", "formas", "superpuestos", "audios", "ajustes", "transiciones_corte");
// sin esas listas no se dibuja nada y el reel queda idéntico.
import React from 'react';
import {AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame} from 'remotion';
import {Camera} from './Camera';
import {Pos} from './Pos';
import {Anim, CUT, D, FPS, H, W, asset, clamp, derivado, font, stroke, type Ajuste, type Libre, type TransCorte} from '../theme';

// ---------------------------------------------------------------- animaciones (entrada / salida / bucle)
export const ENTRADAS = ['ninguna', 'fundido', 'pop', 'rebote', 'zoom', 'deslizar-arriba', 'deslizar-abajo', 'deslizar-izq', 'deslizar-der', 'girar', 'desenfoque', 'maquina'];
export const SALIDAS = ['ninguna', 'fundido', 'pop', 'zoom', 'deslizar-arriba', 'deslizar-abajo', 'deslizar-izq', 'deslizar-der', 'desenfoque'];
export const BUCLES = ['ninguno', 'flotar', 'latido', 'temblor', 'balanceo', 'parpadeo', 'girar'];

type Efecto = {opacity: number; transform: string; filter?: string; letras?: number};
// t = cuadros desde que aparece; len = cuadros que dura. Devuelve opacidad, transform y (máquina de escribir) cuántas letras.
export const animar = (t: number, len: number, x: Anim, defEntrada = 'pop', defSalida = 'fundido'): Efecto => {
  const en = x.entrada ?? defEntrada;
  const sa = x.salida ?? defSalida;
  const de = Math.max(1, Math.round((x.dur_entrada ?? (en === 'maquina' ? 0.8 : 0.35)) * FPS));
  const ds = Math.max(1, Math.round((x.dur_salida ?? 0.25) * FPS));
  const tr: string[] = [];
  let op = 1;
  let blur = 0;
  let letras: number | undefined;
  // entrada
  const pe = interpolate(t, [0, de], [0, 1], clamp);
  const sp = spring({frame: t, fps: FPS, config: {damping: 11, stiffness: 200, mass: 0.6}, durationInFrames: de + 8});
  if (en === 'fundido') op *= pe;
  else if (en === 'pop') (tr.push(`scale(${interpolate(sp, [0, 1], [0.3, 1])})`), (op *= Math.min(1, pe * 2)));
  else if (en === 'rebote') (tr.push(`scale(${interpolate(spring({frame: t, fps: FPS, config: {damping: 6, stiffness: 220, mass: 0.7}}), [0, 1], [0, 1])})`), (op *= Math.min(1, pe * 3)));
  else if (en === 'zoom') (tr.push(`scale(${interpolate(pe, [0, 1], [2.2, 1])})`), (op *= pe));
  else if (en === 'deslizar-arriba') (tr.push(`translateY(${interpolate(sp, [0, 1], [160, 0])}px)`), (op *= pe));
  else if (en === 'deslizar-abajo') (tr.push(`translateY(${interpolate(sp, [0, 1], [-160, 0])}px)`), (op *= pe));
  else if (en === 'deslizar-izq') (tr.push(`translateX(${interpolate(sp, [0, 1], [220, 0])}px)`), (op *= pe));
  else if (en === 'deslizar-der') (tr.push(`translateX(${interpolate(sp, [0, 1], [-220, 0])}px)`), (op *= pe));
  else if (en === 'girar') (tr.push(`rotate(${interpolate(sp, [0, 1], [-180, 0])}deg) scale(${interpolate(sp, [0, 1], [0.2, 1])})`), (op *= pe));
  else if (en === 'desenfoque') ((blur += interpolate(pe, [0, 1], [24, 0])), (op *= pe));
  else if (en === 'maquina') letras = interpolate(t, [0, de], [0, 1], clamp);
  // salida
  const ps = interpolate(t, [len - ds, len], [0, 1], clamp);
  if (ps > 0) {
    if (sa === 'fundido') op *= 1 - ps;
    else if (sa === 'pop') tr.push(`scale(${interpolate(ps, [0, 0.35, 1], [1, 1.12, 0])})`);
    else if (sa === 'zoom') (tr.push(`scale(${interpolate(ps, [0, 1], [1, 2])})`), (op *= 1 - ps));
    else if (sa === 'deslizar-arriba') (tr.push(`translateY(${-160 * ps}px)`), (op *= 1 - ps));
    else if (sa === 'deslizar-abajo') (tr.push(`translateY(${160 * ps}px)`), (op *= 1 - ps));
    else if (sa === 'deslizar-izq') (tr.push(`translateX(${-220 * ps}px)`), (op *= 1 - ps));
    else if (sa === 'deslizar-der') (tr.push(`translateX(${220 * ps}px)`), (op *= 1 - ps));
    else if (sa === 'desenfoque') ((blur += 24 * ps), (op *= 1 - ps));
  }
  // bucle
  const b = x.bucle ?? 'ninguno';
  if (b === 'flotar') tr.push(`translateY(${Math.sin(t / 12) * 10}px)`);
  else if (b === 'latido') tr.push(`scale(${1 + 0.06 * Math.max(0, Math.sin(t / 4.5)) ** 4})`);
  else if (b === 'temblor') tr.push(`translate(${Math.sin(t * 2.7) * 3}px, ${Math.cos(t * 3.1) * 3}px)`);
  else if (b === 'balanceo') tr.push(`rotate(${Math.sin(t / 10) * 5}deg)`);
  else if (b === 'parpadeo') op *= Math.floor(t / 8) % 2 === 0 ? 1 : 0.35;
  else if (b === 'girar') tr.push(`rotate(${(t * 4) % 360}deg)`);
  return {opacity: op, transform: tr.join(' ') || 'none', filter: blur > 0.1 ? `blur(${blur}px)` : undefined, letras};
};

// contenedor centrado en (x, y) del lienzo; el contenido se mueve con <Pos> (dx/dy/escala/rot/opacidad/claves)
const Lugar: React.FC<{k: string; o: Libre; x?: number; y?: number; children: React.ReactNode}> = ({k, o, x = W / 2, y = H / 2, children}) => (
  <div style={{position: 'absolute', left: x - W, top: y, width: 2 * W, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
    <Pos k={k} o={o}>
      {children}
    </Pos>
  </div>
);

// ---------------------------------------------------------------- textos libres
export const Textos: React.FC = () => {
  const f = useCurrentFrame();
  const l = D.textos ?? [];
  if (!l.length) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {l.map((x, i) => {
        if (f < x.a || f >= x.b) return null;
        const fx = animar(f - x.a, x.b - x.a, x);
        const size = x.size ?? 96;
        let texto = x.mayus ? x.texto.toUpperCase() : x.texto;
        if (fx.letras !== undefined) texto = texto.slice(0, Math.round(texto.length * fx.letras));
        const partes = x.resaltar ? texto.split(new RegExp(`(${x.resaltar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i')) : [texto];
        const cont = x.contorno ?? (x.bg ? 0 : 10);
        return (
          <Lugar key={i} k={`textos:${i}`} o={x} x={x.x} y={x.y}>
            <div style={{opacity: fx.opacity, transform: fx.transform, filter: fx.filter}}>
              <div
                style={{
                  maxWidth: x.ancho ?? 900,
                  fontFamily: font(x.fuente ?? 'Montserrat'),
                  fontWeight: x.peso ?? 900,
                  fontStyle: x.italic ? 'italic' : 'normal',
                  fontSize: size,
                  lineHeight: 1.08,
                  color: x.color ?? '#fff',
                  textAlign: x.align ?? 'center',
                  whiteSpace: 'pre-wrap',
                  ...(cont ? stroke(cont, x.contorno_color ?? '#000') : {}),
                  ...(x.bg ? {background: x.bg, padding: `${size * 0.12}px ${size * 0.3}px`, borderRadius: size * 0.22} : {}),
                  ...(x.sombra ? {textShadow: `${size * 0.06}px ${size * 0.06}px 0 rgba(0,0,0,0.85)`} : {}),
                }}
              >
                {partes.map((p, j) => (j % 2 === 1 ? <span key={j} style={{color: '#FFD600'}}>{p}</span> : <React.Fragment key={j}>{p}</React.Fragment>))}
              </div>
            </div>
          </Lugar>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- formas (flechas, círculos, subrayados…)
export const FORMAS = ['flecha', 'circulo', 'rect', 'subrayado', 'estrella', 'corazon', 'check', 'equis', 'burbuja'];
const trazo = (forma: string, w: number, h: number): {d: string; cerrada: boolean} => {
  if (forma === 'flecha') return {d: `M ${w * 0.05} ${h * 0.5} L ${w * 0.8} ${h * 0.5} M ${w * 0.6} ${h * 0.18} L ${w * 0.92} ${h * 0.5} L ${w * 0.6} ${h * 0.82}`, cerrada: false};
  if (forma === 'circulo') return {d: `M ${w / 2} ${h * 0.06} A ${w * 0.44} ${h * 0.44} 0 1 1 ${w / 2 - 0.1} ${h * 0.06}`, cerrada: true};
  if (forma === 'rect') return {d: `M ${w * 0.05} ${h * 0.08} H ${w * 0.95} V ${h * 0.92} H ${w * 0.05} Z`, cerrada: true};
  if (forma === 'subrayado') return {d: `M ${w * 0.03} ${h * 0.6} C ${w * 0.3} ${h * 0.35}, ${w * 0.6} ${h * 0.75}, ${w * 0.97} ${h * 0.45}`, cerrada: false};
  if (forma === 'check') return {d: `M ${w * 0.1} ${h * 0.55} L ${w * 0.4} ${h * 0.85} L ${w * 0.92} ${h * 0.15}`, cerrada: false};
  if (forma === 'equis') return {d: `M ${w * 0.12} ${h * 0.12} L ${w * 0.88} ${h * 0.88} M ${w * 0.88} ${h * 0.12} L ${w * 0.12} ${h * 0.88}`, cerrada: false};
  if (forma === 'corazon')
    return {d: `M ${w / 2} ${h * 0.9} C ${w * -0.15} ${h * 0.45}, ${w * 0.2} ${h * -0.1}, ${w / 2} ${h * 0.28} C ${w * 0.8} ${h * -0.1}, ${w * 1.15} ${h * 0.45}, ${w / 2} ${h * 0.9} Z`, cerrada: true};
  if (forma === 'burbuja') return {d: `M ${w * 0.08} ${h * 0.08} H ${w * 0.92} V ${h * 0.7} H ${w * 0.4} L ${w * 0.18} ${h * 0.95} L ${w * 0.24} ${h * 0.7} H ${w * 0.08} Z`, cerrada: true};
  // estrella de 5 picos
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.2 : 0.47;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${w / 2 + Math.cos(a) * w * r} ${h / 2 + Math.sin(a) * h * r}`);
  }
  return {d: `M ${pts.join(' L ')} Z`, cerrada: true};
};

export const Formas: React.FC = () => {
  const f = useCurrentFrame();
  const l = D.formas ?? [];
  if (!l.length) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {l.map((x, i) => {
        if (f < x.a || f >= x.b) return null;
        const t = f - x.a;
        // "dibujar" es la entrada natural de una forma: el trazo se pinta solo
        const dibujar = (x.entrada ?? 'dibujar') === 'dibujar';
        const fx = animar(t, x.b - x.a, {...x, entrada: dibujar ? 'ninguna' : x.entrada});
        const w = x.ancho ?? 360;
        const h = x.alto ?? (x.forma === 'subrayado' ? w * 0.22 : x.forma === 'flecha' ? w * 0.5 : w);
        const g = x.grosor ?? 14;
        const {d, cerrada} = trazo(x.forma, w, h);
        const largo = 4 * (w + h);
        const k = dibujar ? interpolate(t, [0, Math.round((x.dur_entrada ?? 0.45) * FPS)], [0, 1], clamp) : 1;
        const color = x.color ?? '#FFD600';
        return (
          <Lugar key={i} k={`formas:${i}`} o={x} x={x.x} y={x.y}>
            <div style={{opacity: fx.opacity, transform: fx.transform, filter: fx.filter}}>
              <svg width={w} height={h} viewBox={`${-g} ${-g} ${w + 2 * g} ${h + 2 * g}`} style={{overflow: 'visible', display: 'block', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))'}}>
                <path
                  d={d}
                  fill={x.relleno && cerrada ? color : 'none'}
                  fillOpacity={x.relleno ? k : 0}
                  stroke={color}
                  strokeWidth={g}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={largo}
                  strokeDashoffset={largo * (1 - k)}
                />
              </svg>
            </div>
          </Lugar>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- superpuestos (video o imagen encima: PiP, pantalla completa)
const esVideo = (src: string) => /\.(mp4|mov|m4v|webm)$/i.test(src);
export const Superpuestos: React.FC = () => {
  const f = useCurrentFrame();
  const l = D.superpuestos ?? [];
  if (!l.length) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {l.map((x, i) => {
        if (f < x.a || f >= x.b) return null;
        const fx = animar(f - x.a, x.b - x.a, x, 'pop', 'fundido');
        const completo = !!x.completo;
        const w = completo ? W : x.ancho ?? 560;
        const circulo = x.recorte === 'circulo';
        const h = completo ? H : circulo ? w : x.alto;
        const estilo: React.CSSProperties = {
          width: w,
          height: h,
          display: 'block',
          objectFit: x.ajuste === 'contener' ? 'contain' : 'cover',
          borderRadius: circulo ? '50%' : completo ? 0 : x.radio ?? 28,
          border: x.borde ? `${x.borde}px solid ${x.borde_color ?? '#fff'}` : undefined,
          boxShadow: x.sombra === false || completo ? undefined : '0 18px 50px rgba(0,0,0,0.55)',
          boxSizing: 'border-box',
          background: '#000',
        };
        const medio = esVideo(x.src) ? (
          <Sequence from={x.a} durationInFrames={x.b - x.a} layout="none">
            <OffthreadVideo src={asset(x.src)} startFrom={Math.round((x.desde ?? 0) * FPS)} volume={x.vol ?? 0} muted={!x.vol} playbackRate={x.velocidad ?? 1} style={estilo} />
          </Sequence>
        ) : (
          <Img src={asset(x.src)} style={estilo} />
        );
        return completo ? (
          <AbsoluteFill key={i} style={{opacity: fx.opacity, filter: fx.filter}}>
            <div data-reel={`superpuestos:${i}`} style={{width: W, height: H}}>{medio}</div>
          </AbsoluteFill>
        ) : (
          <Lugar key={i} k={`superpuestos:${i}`} o={x} x={x.x} y={x.y}>
            <div style={{opacity: fx.opacity, transform: fx.transform, filter: fx.filter}}>{medio}</div>
          </Lugar>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- pistas de audio (música, voz, ambiente)
// ducking (0–1): cuánto baja la pista mientras alguien habla (0.7 = queda al 30 %). Se suaviza para que no "bombee".
const HABLA = derivado(() => {
  const n = CUT;
  const v = new Float32Array(Math.max(1, n));
  for (const w of D.words) {
    const a = Math.max(0, Math.floor(w.start * FPS) - 2);
    const b = Math.min(n, Math.ceil(w.end * FPS) + 4);
    for (let k = a; k < b; k++) v[k] = 1;
  }
  // ataque rápido (4 cuadros), relajación lenta (12)
  const s = new Float32Array(v.length);
  let y = 0;
  for (let k = 0; k < v.length; k++) {
    y += (v[k] - y) * (v[k] > y ? 0.35 : 0.09);
    s[k] = y;
  }
  return s;
});
export const volumenPista = (x: {a: number; b: number; vol?: number; fade_in?: number; fade_out?: number; ducking?: number}, f: number) => {
  const fi = Math.round((x.fade_in ?? 0) * FPS);
  const fo = Math.round((x.fade_out ?? 0) * FPS);
  let v = x.vol ?? 0.5;
  if (fi > 0) v *= interpolate(f, [x.a, x.a + fi], [0, 1], clamp);
  if (fo > 0) v *= interpolate(f, [x.b - fo, x.b], [1, 0], clamp);
  if (x.ducking) v *= 1 - x.ducking * (HABLA()[Math.min(f, CUT - 1)] ?? 0);
  return Math.max(0, v);
};
export const Audios: React.FC = () => (
  <>
    {(D.audios ?? []).map((x, i) => (
      <Sequence key={i} from={x.a} durationInFrames={Math.max(1, x.b - x.a)} layout="none">
        <Audio src={asset(x.src)} startFrom={Math.round((x.desde ?? 0) * FPS)} playbackRate={x.velocidad ?? 1} volume={(fr) => volumenPista(x, x.a + fr)} />
      </Sequence>
    ))}
  </>
);

// ---------------------------------------------------------------- ajustes de color (afectan al video y al b-roll)
export const FILTROS = ['ninguno', 'bn', 'calido', 'frio', 'vintage', 'cine', 'vivo', 'suave', 'noche', 'drama'];
const PRESET: Record<string, Partial<Ajuste>> = {
  bn: {saturacion: -100, contraste: 12},
  calido: {temperatura: 35, saturacion: 8},
  frio: {temperatura: -35, saturacion: 4},
  vintage: {saturacion: -30, contraste: 10, temperatura: 25, vineta: 35, brillo: 3},
  cine: {contraste: 18, saturacion: -12, temperatura: 10, vineta: 30},
  vivo: {saturacion: 40, contraste: 8},
  suave: {contraste: -12, brillo: 6, saturacion: -6},
  noche: {brillo: -18, temperatura: -40, saturacion: -20, vineta: 30},
  drama: {contraste: 35, saturacion: -25, vineta: 45, brillo: -4},
};
// valores efectivos de un ajuste: el filtro (por intensidad) + los manuales encima
const valores = (x: Ajuste) => {
  const p = PRESET[x.filtro ?? ''] ?? {};
  const k = x.intensidad ?? 1;
  const g = (c: keyof Ajuste) => ((p[c] as number | undefined) ?? 0) * k + ((x[c] as number | undefined) ?? 0);
  return {brillo: g('brillo'), contraste: g('contraste'), saturacion: g('saturacion'), temperatura: g('temperatura'), tono: g('tono'), vineta: g('vineta'), desenfoque: g('desenfoque')};
};
type Valores = ReturnType<typeof valores>;
// peso de un ajuste en el cuadro f: entra y sale en 4 cuadros (salvo en los bordes del video)
const pesoAjuste = (x: Ajuste, f: number) => (f < x.a || f >= x.b ? 0 : Math.min(x.a <= 0 ? 1 : interpolate(f, [x.a, x.a + 4], [0, 1], clamp), interpolate(f, [x.b - 4, x.b], [1, 0], clamp)));
export const ajusteEn = (f: number): Valores | null => {
  const l = D.ajustes ?? [];
  if (!l.length) return null;
  const r: Valores = {brillo: 0, contraste: 0, saturacion: 0, temperatura: 0, tono: 0, vineta: 0, desenfoque: 0};
  let alguno = false;
  for (const x of l) {
    const w = pesoAjuste(x, f);
    if (w <= 0) continue;
    alguno = true;
    const v = valores(x);
    for (const k of Object.keys(r) as (keyof Valores)[]) r[k] += v[k] * w;
  }
  return alguno ? r : null;
};
const filtroCss = (v: Valores) =>
  [
    v.brillo ? `brightness(${1 + v.brillo / 100})` : '',
    v.contraste ? `contrast(${1 + v.contraste / 100})` : '',
    v.saturacion ? `saturate(${Math.max(0, 1 + v.saturacion / 100)})` : '',
    v.tono ? `hue-rotate(${v.tono}deg)` : '',
    v.desenfoque ? `blur(${v.desenfoque / 4}px)` : '',
  ]
    .filter(Boolean)
    .join(' ');

// ---------------------------------------------------------------- transiciones en los cortes
export const TRANSICIONES = ['fundido', 'negro', 'blanco', 'zoom', 'barrido', 'destello', 'glitch', 'giro', 'deslizar', 'desenfoque'];
// k = −1…1 alrededor del centro del corte (0 = el corte)
const centro = (x: TransCorte) => (x.a + x.b) / 2;
const tramoTrans = (f: number) => {
  for (const x of D.tcortes ?? []) if (f >= x.a && f < x.b) return {x, k: (f - centro(x)) / Math.max(1, (x.b - x.a) / 2)};
  return null;
};
const transformTrans = (f: number): {transform?: string; filter?: string} => {
  const r = tramoTrans(f);
  if (!r) return {};
  const {x, k} = r;
  const m = 1 - Math.abs(k); // 0 en los bordes, 1 en el corte
  if (x.tipo === 'zoom') return {transform: `scale(${1 + 0.35 * m})`, filter: `blur(${6 * m}px)`};
  // antes del corte la imagen se va a la izquierda; después llega desde la derecha (con desenfoque de movimiento)
  if (x.tipo === 'barrido') return {transform: `translateX(${(k < 0 ? -1 : 1) * m * W * 0.5}px)`, filter: `blur(${18 * m}px)`};
  if (x.tipo === 'giro') return {transform: `rotate(${(k < 0 ? 1 : -1) * m * 30}deg) scale(${1 + 0.4 * m})`, filter: `blur(${5 * m}px)`};
  if (x.tipo === 'glitch') {
    const j = Math.round(f * 7.3) % 5;
    return m > 0.15 ? {transform: `translate(${(j - 2) * 14 * m}px, ${((j * 3) % 5 - 2) * 6 * m}px)`, filter: `hue-rotate(${j * 60}deg) saturate(${1 + m})`} : {};
  }
  if (x.tipo === 'destello') return {filter: `brightness(${1 + 1.6 * m * m})`};
  if (x.tipo === 'desenfoque') return {filter: `blur(${22 * m}px)`};
  return {};
};

// envoltorio del video base (cámara + b-roll): aplica los ajustes de color y las transiciones de corte
export const VideoBase: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const aj = ajusteEn(f);
  const tt = transformTrans(f);
  const filtro = [aj ? filtroCss(aj) : '', tt.filter ?? ''].filter(Boolean).join(' ') || undefined;
  return (
    <AbsoluteFill style={{filter: filtro, transform: tt.transform}}>
      {children}
      {aj && aj.temperatura !== 0 && (
        <AbsoluteFill style={{background: aj.temperatura > 0 ? '#ff9a3c' : '#3c8cff', opacity: Math.min(0.35, Math.abs(aj.temperatura) / 100 * 0.3), mixBlendMode: 'soft-light'}} />
      )}
      {aj && aj.vineta > 0 && <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${Math.min(0.85, aj.vineta / 100)}) 100%)`}} />}
    </AbsoluteFill>
  );
};

// capas de las transiciones que se dibujan ENCIMA del video (fundidos a color, disolver y deslizar con el último cuadro)
export const TransicionesCorte: React.FC = () => {
  const f = useCurrentFrame();
  const r = tramoTrans(f);
  if (!r) return null;
  const {x, k} = r;
  const m = 1 - Math.abs(k);
  const c = Math.round(centro(x));
  if (x.tipo === 'negro' || x.tipo === 'blanco') return <AbsoluteFill style={{background: x.tipo === 'negro' ? '#000' : '#fff', opacity: Math.min(1, m * 1.4)}} />;
  if (x.tipo === 'destello') return <AbsoluteFill style={{background: '#fff', opacity: Math.max(0, m * m * 0.9)}} />;
  // disolver / deslizar: el último cuadro antes del corte, congelado, se desvanece o se va hacia arriba
  if ((x.tipo === 'fundido' || x.tipo === 'deslizar') && f >= c) {
    const p = interpolate(f, [c, x.b], [0, 1], clamp);
    const ultimo = Math.max(0, c - 1);
    return (
      <AbsoluteFill style={x.tipo === 'fundido' ? {opacity: 1 - p} : {transform: `translateY(${-H * p * p}px)`, boxShadow: '0 30px 60px rgba(0,0,0,0.6)'}}>
        <Freeze frame={ultimo}>
          <Camera />
        </Freeze>
      </AbsoluteFill>
    );
  }
  return null;
};
