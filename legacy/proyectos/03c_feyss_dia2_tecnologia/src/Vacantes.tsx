import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import companies from './companies.json';
import pieces from './pieces.json';
import words from './words.json';
import {C, FPS, H, W, mont} from './theme';
import {AREA} from './variant';

type Company = {name: string; key: string; start: number; end: number; gain: number};
type Piece = {start: number; frames: number; company: number; src: string};
type Word = {piece: number; company: number; role: string; text: string; start: number; end: number};
const COMPANIES = companies as Company[];
const PIECES = pieces as Piece[];
const WORDS = words as Word[];
const CUT_FRAMES = COMPANIES[COMPANIES.length - 1].end;
const END_LEN = 75;
export const TOTAL_FRAMES = CUT_FRAMES + END_LEN;
const HOOK_END = 72;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Safe zone for TikTok / Reels UI (px on a 1080x1920 canvas)
const SAFE = {top: 260, bottom: 1500, left: 70, right: 150};

/* ---------- per-company assets ---------- */
const BROLL: Record<string, {file: string; dur: number}[]> = {
  jarritos: [{file: 'jarritos_1', dur: 2.6}, {file: 'jarritos_2', dur: 3.6}],
  pwc: [{file: 'pwc_1', dur: 2.6}, {file: 'pwc_2', dur: 3.4}],
  axtel: [{file: 'axtel_1', dur: 3.4}, {file: 'axtel_2', dur: 3.6}],
  inix: [{file: 'inix_1', dur: 2.0}, {file: 'inix_2', dur: 3.6}],
  sngular: [{file: 'sngular_1', dur: 3.2}, {file: 'sngular_2', dur: 3.4}],
  eglobal: [{file: 'eglobal_1', dur: 2.8}, {file: 'eglobal_2', dur: 2.8}],
  tcm: [{file: 'tcm_1', dur: 3.0}, {file: 'tcm_2', dur: 3.4}],
  als: [{file: 'als_1', dur: 2.8}, {file: 'als_2', dur: 3.6}],
  spin: [{file: 'spin_1', dur: 3.2}, {file: 'spin_2', dur: 3.4}],
};
const QR: Record<string, {title: string; sub?: string; email?: string}> = {
  jarritos: {title: 'ESCANEA Y MANDA TU CV', sub: 'POR WHATSAPP'},
  pwc: {title: 'ESCANEA PARA POSTULARTE'},
  axtel: {title: 'REGÍSTRATE AQUÍ', sub: 'BOLSA DE EMPLEO AXTEL'},
  inix: {title: 'MANDA TU CV', sub: 'FORMULARIO O WHATSAPP'},
  sngular: {title: 'ESCANEA Y POSTÚLATE'},
  eglobal: {title: 'MANDA TU CV A:', email: 'reclutamiento@eglobal.com.mx'},
  tcm: {title: 'ESCANEA PARA POSTULARTE'},
  als: {title: 'FORMULARIO DE RECLUTAMIENTO'},
  spin: {title: 'ESCANEA Y MANDA TU CV', sub: 'POR WHATSAPP'},
};
const QR_LEN = 6 * FPS;

const companyAt = (f: number) => {
  for (let i = COMPANIES.length - 1; i >= 0; i--) if (f >= COMPANIES[i].start) return i;
  return 0;
};
const pieceAt = (f: number) => {
  for (let i = PIECES.length - 1; i >= 0; i--) if (f >= PIECES[i].start) return i;
  return 0;
};

// Timeline of overlays per company (absolute frames)
const brollStart = (ci: number, n: number) => {
  const c = COMPANIES[ci];
  const len = c.end - c.start;
  return n === 0 ? c.start + (ci === 0 ? 140 : 66) : c.start + Math.round(len * 0.45);
};
const qrStart = (ci: number) => COMPANIES[ci].end - QR_LEN;

/* ---------- speaker ---------- */
const Speaker: React.FC = () => {
  const frame = useCurrentFrame();
  const f = Math.min(frame, CUT_FRAMES - 1);
  const pi = pieceAt(f);
  const p = PIECES[pi];
  // alternate framing on jump cuts, slow push inside every piece
  let alt = 0;
  for (let i = 1; i <= pi; i++) alt = PIECES[i].company !== PIECES[i - 1].company ? 0 : alt ^ 1;
  const local = f - p.start;
  const z = (alt ? 1.14 : 1.05) * (1 + 0.025 * (local / Math.max(1, p.frames)));
  const ci = companyAt(f);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile('cut.mp4')}
        volume={(vf) => COMPANIES[companyAt(Math.min(vf, CUT_FRAMES - 1))].gain}
        style={{width: W, height: H, transform: `scale(${z})`, transformOrigin: '50% 38%'}}
      />
      <AbsoluteFill style={{background: 'transparent'}} data-company={ci} />
    </AbsoluteFill>
  );
};

/* ---------- stand b-roll cutaways ---------- */
const BRoll: React.FC<{file: string; len: number}> = ({file, len}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], clamp);
  const z = interpolate(frame, [0, len], [1.1, 1.0]);
  return (
    <AbsoluteFill style={{opacity: k}}>
      <OffthreadVideo src={staticFile(`broll/${file}.mp4`)} muted style={{width: W, height: H, transform: `scale(${z})`}} />
    </AbsoluteFill>
  );
};

/* ---------- captions ---------- */
const KEY = new Set(
  (
    'INGENIEROS INGENIERÍA INGENIERÍAS MECATRÓNICOS MECATRÓNICA ALIMENTOS BIOTECNÓLOGOS QUÍMICOS QUÍMICA CONTROL AUTOMATIZACIÓN ' +
    'MECÁNICOS MECÁNICA CONTABILIDAD ADMINISTRACIÓN JARRITOS ECONÓMICO ADMINISTRATIVO FINANCIERO NEGOCIOS TECNOLOGÍA INTELIGENCIA ' +
    'ARTIFICIAL DATOS INTERNS FUTURE READY SEMESTRE EGRESADOS TELECOMUNICACIONES TI CIBERSEGURIDAD NUBE SISTEMAS COMPUTACIONALES ' +
    'ELECTRÓNICA COMUNICACIONES CARRERAS DESECHABLES STARBUCKS INIX INTERNACIONALES PSICOLOGÍA RECURSOS HUMANOS CONTADORES SNGULAR ' +
    'INFORMACIÓN INFORMÁTICA ANALISTAS E-GLOBAL COMPUTACIÓN BECARIOS TCM ECONOMÍA FINANZAS MATEMÁTICAS FÍSICA ALS MEDICAMENTOS QFI QFB ' +
    'IQS LABORATORIO SPIN AGUAS PRODUCCIÓN CALIDAD VENTAS CONSULTORÍA CONSULTORA MEXICANA BEBIDA PAGO COMPENSACIÓN'
  ).split(' '),
);
const clean = (t: string) => t.replace(/[.,¿?¡!…]/g, '').toUpperCase();

type Chunk = {words: Word[]; from: number; to: number};
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({words: cur, from: 0, to: 0});
    cur = [];
  };
  WORDS.forEach((w, i) => {
    const prev = WORDS[i - 1];
    if (prev && (prev.company !== w.company || prev.role !== w.role)) flush();
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (cur.length >= 3 || chars + w.text.length > 16) flush();
    cur.push(w);
    if (/[.,?]$/.test(w.text)) flush();
  });
  flush();
  out.forEach((c) => (c.from = Math.round(c.words[0].start * FPS) - 2));
  out.forEach((c, i) => {
    const natural = Math.round(c.words[c.words.length - 1].end * FPS) + 6;
    const next = out[i + 1];
    c.to = next ? Math.min(next.from, natural + 24) : natural;
  });
  return out;
})();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < HOOK_END || frame >= CUT_FRAMES) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const ci = companyAt(frame);
  const onQr = frame >= qrStart(ci);
  const pop = spring({frame: frame - chunk.from, fps, config: {damping: 14, stiffness: 260, mass: 0.5}});
  return (
    <AbsoluteFill style={{top: onQr ? 290 : 1150, left: SAFE.left, right: SAFE.right - 60, alignItems: 'center'}}>
      <div
        style={{
          width: 900,
          textAlign: 'center',
          fontFamily: mont,
          fontWeight: 800,
          fontSize: 72,
          lineHeight: 1.04,
          transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
        }}
      >
        {chunk.words.map((w, i) => (
          <span
            key={i}
            style={{
              color: KEY.has(clean(w.text)) ? C.yellow : C.white,
              WebkitTextStroke: '11px #000',
              paintOrder: 'stroke fill',
              textShadow: '0 6px 16px rgba(0,0,0,0.5)',
            }}
          >
            {w.text.toUpperCase().replace(/[.,…]+$/, '')}
            {i < chunk.words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- hook (safe zone, over the torso so faces stay clear) ---------- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame >= HOOK_END + 6) return null;
  const out = interpolate(frame, [HOOK_END - 2, HOOK_END + 6], [1, 0], clamp);
  const line = (text: string, at: number, align: 'left' | 'right', color: string, size: number) => {
    const p = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
    return (
      <div
        style={{
          alignSelf: align === 'left' ? 'flex-start' : 'flex-end',
          fontFamily: mont,
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: size,
          lineHeight: 1.02,
          whiteSpace: 'nowrap',
          color,
          textShadow: '7px 7px 0 #000, 0 10px 30px rgba(0,0,0,0.5)',
          opacity: frame < at ? 0 : Math.min(1, p * 2),
          transform: `translateX(${(1 - p) * (align === 'left' ? -120 : 120)}px) scale(${0.85 + 0.15 * p})`,
        }}
      >
        {text}
      </div>
    );
  };
  const pill = spring({frame: frame - 26, fps, config: {damping: 12, stiffness: 220}});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', top: 860, left: 90, width: 1080 - 90 - SAFE.right, display: 'flex', flexDirection: 'column', gap: 4}}>
      {line('¿QUÉ CARRERAS', 2, 'left', C.white, 90)}
      {line('BUSCAN LAS', 12, 'right', C.white, 90)}
      {line('EMPRESAS?', 20, 'left', C.yellow, 112)}
      <div
        style={{
          alignSelf: 'flex-start',
          marginTop: 18,
          fontFamily: mont,
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: 44,
          color: C.white,
          background: C.guinda,
          border: `4px solid ${C.white}`,
          padding: '8px 22px',
          borderRadius: 14,
          transform: `scale(${frame < 22 ? 0 : spring({frame: frame - 22, fps, config: {damping: 12, stiffness: 220}})})`,
          transformOrigin: 'left center',
        }}
      >
        {AREA}
      </div>
      <div
        style={{
          alignSelf: 'flex-start',
          marginTop: 12,
          fontFamily: mont,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: 1,
          color: C.ink,
          background: C.yellow,
          padding: '10px 20px',
          borderRadius: 999,
          transform: `scale(${frame < 26 ? 0 : pill})`,
          transformOrigin: 'left center',
        }}
      >
        FERIA DEL EMPLEO Y SERVICIO SOCIAL 2026
      </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- company name card ---------- */
const CompanyTitle: React.FC<{name: string; index: number}> = ({name, index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 13, stiffness: 220, mass: 0.6}});
  const out = interpolate(frame, [70, 80], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: 880, left: 90, right: SAFE.right, opacity: out}}>
      <div
        style={{
          alignSelf: 'flex-start',
          fontFamily: mont,
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: 3,
          color: C.ink,
          background: C.yellow,
          padding: '8px 18px',
          borderRadius: 10,
          transform: `translateX(${(1 - p) * -80}px)`,
          opacity: Math.min(1, p * 2),
        }}
      >
        EMPRESA {index + 1} DE {COMPANIES.length}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: mont,
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: 112,
          lineHeight: 1,
          color: C.white,
          textShadow: '7px 7px 0 #000, 0 10px 30px rgba(0,0,0,0.5)',
          transform: `translateX(${(1 - p) * -140}px)`,
          opacity: Math.min(1, p * 2),
        }}
      >
        {name}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- QR / registration card ---------- */
const QrCard: React.FC<{k: string; name: string}> = ({k, name}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 13, stiffness: 190}});
  const out = interpolate(frame, [QR_LEN - 6, QR_LEN], [1, 0], clamp);
  const info = QR[k];
  return (
    <AbsoluteFill style={{top: 770, alignItems: 'center', opacity: out}}>
      <div
        style={{
          width: 700,
          background: C.white,
          borderRadius: 36,
          padding: '22px 26px 26px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          transform: `translateY(${(1 - p) * 140}px) scale(${interpolate(p, [0, 1], [0.85, 1], clamp)})`,
          opacity: Math.min(1, p * 2),
        }}
      >
        <div style={{fontFamily: mont, fontWeight: 800, fontSize: 28, letterSpacing: 4, color: '#666'}}>{name}</div>
        <div style={{fontFamily: mont, fontWeight: 900, fontSize: 44, color: C.ink, textAlign: 'center', lineHeight: 1.1}}>
          {info.title}
        </div>
        {info.email ? (
          <div
            style={{
              marginTop: 8,
              fontFamily: mont,
              fontWeight: 900,
              fontSize: 36,
              color: C.ink,
              background: C.yellow,
              padding: '8px 18px',
              borderRadius: 12,
            }}
          >
            {info.email}
          </div>
        ) : null}
        {info.sub ? (
          <div style={{fontFamily: mont, fontWeight: 800, fontSize: 30, color: C.guinda, letterSpacing: 2, marginTop: 2}}>
            {info.sub}
          </div>
        ) : null}
        <Img
          src={staticFile(`qr/${k}.jpg`)}
          style={{marginTop: 14, maxWidth: 520, maxHeight: info.email ? 380 : 520, objectFit: 'contain', borderRadius: 14}}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- end card ---------- */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 12, stiffness: 200}});
  const p2 = spring({frame: frame - 12, fps, config: {damping: 10, stiffness: 220}});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(16px) brightness(0.5)', transform: 'scale(1.1)'}}>
        <Freeze frame={CUT_FRAMES - 1}>
          <OffthreadVideo src={staticFile('cut.mp4')} muted style={{width: W, height: H}} />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34}}>
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 108,
            lineHeight: 1.05,
            textAlign: 'center',
            color: C.white,
            textShadow: '7px 7px 0 #000',
            transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
            opacity: Math.min(1, p * 2),
          }}
        >
          ¿CUÁL TE
          <br />
          <span style={{color: C.yellow}}>INTERESÓ</span>
          <br />
          MÁS?
        </div>
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontSize: 52,
            color: C.ink,
            background: C.yellow,
            padding: '14px 36px',
            borderRadius: 999,
            transform: `scale(${frame < 12 ? 0 : p2})`,
          }}
        >
          GUÁRDALO Y COMPÁRTELO
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- sound ---------- */
const SFX: {f: number; src: string; v: number}[] = [
  {f: 0, src: 'whoosh', v: 0.4},
  ...COMPANIES.slice(1).map((c) => ({f: c.start - 3, src: 'whoosh2', v: 0.35})),
  ...COMPANIES.map((c, i) => ({f: qrStart(i), src: 'pop', v: 0.45})),
  {f: CUT_FRAMES, src: 'whoosh', v: 0.4},
];

export const Vacantes: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT_FRAMES}>
      <Speaker />
    </Sequence>
    {COMPANIES.map((c, ci) =>
      BROLL[c.key].map((b, n) => {
        const from = brollStart(ci, n);
        const len = Math.round(b.dur * FPS);
        return (
          <Sequence key={`${c.key}${n}`} from={from} durationInFrames={Math.min(len, qrStart(ci) - from)}>
            <BRoll file={b.file} len={Math.min(len, qrStart(ci) - from)} />
          </Sequence>
        );
      }),
    )}
    {COMPANIES.map((c, ci) => (
      <Sequence key={`t${c.key}`} from={ci === 0 ? HOOK_END + 4 : c.start} durationInFrames={80}>
        <CompanyTitle name={c.name} index={ci} />
      </Sequence>
    ))}
    {COMPANIES.map((c, ci) => (
      <Sequence key={`q${c.key}`} from={qrStart(ci)} durationInFrames={QR_LEN}>
        <QrCard k={c.key} name={c.name} />
      </Sequence>
    ))}
    <Hook />
    <Captions />
    <Sequence from={CUT_FRAMES}>
      <EndCard />
    </Sequence>
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.max(0, s.f)} durationInFrames={45}>
        <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={s.v} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
