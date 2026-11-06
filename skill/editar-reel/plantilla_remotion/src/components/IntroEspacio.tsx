// Intro espacial 3D (three.js vía @remotion/three) sobre la intro del creador — Rocket Revolution (Semana Mundial del Espacio).
// Se activa con eventos.json → "intro_espacio" (ver referencia/eventos.md). Todo sale de data.intro3d:
//  - nebulosa + estrellas con profundidad, planeta procedural con atmósfera/anillo/luna, cohete con fuego y humo de partículas
//  - título en 2 líneas (letras con giro 3D, la 2a dorada con brillo) + marco HUD, cada uno entra en su ancla (t[0], t[1], t[2])
//  - monedas 3D con $ que salen por los lados (no tapan la cara) en el ancla "monedas" (+ cash/coin en sfx)
//  - al final: salto a hipervelocidad + destello que entra al gancho (la pregunta)
// Todo vive en la franja de arriba (máscara al 29%) para no teñir ni tapar la cara (un velo azul sobre lentes los "pinta").
// RENDIMIENTO: `reel capas` lo pre-renderiza UNA vez a public/capas/*.mov (ProRes 4444 con alfa) y Reel.tsx usa ese video
// mientras no cambie este archivo ni los datos de la intro; así el 3D no se vuelve a calcular en cada render.
import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {D, HOOK_START, H, W, clamp, font} from '../theme';

const I3 = D.intro3d;
const FIN = I3?.fin ?? HOOK_START;
export const INTRO3D_LEN = I3 ? I3.fin + 12 : 1;
const WARP = 24; // cuadros de salto a hipervelocidad antes de la pregunta

const luz = <M extends THREE.Material>(m: M): M => {
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.SrcAlphaFactor;
  m.blendDst = THREE.OneFactor;
  m.blendSrcAlpha = THREE.ZeroFactor;
  m.blendDstAlpha = THREE.OneFactor;
  m.transparent = true;
  m.depthWrite = false;
  return m;
};

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------------- planeta procedural ---------------- */
const NOISE = `
float h(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(h(i+vec3(0,0,0)),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<6;i++){v+=a*n(p);p*=2.03;a*=0.5;}return v;}
`;
const planetVS = `varying vec3 vP; varying vec3 vN; varying vec3 vW;
void main(){vP=position; vN=normalize(normalMatrix*normal); vec4 w=modelViewMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*w;}`;
const planetFS = `uniform float uRot; varying vec3 vP; varying vec3 vN; varying vec3 vW;
${NOISE}
void main(){
  float c=cos(uRot), s=sin(uRot);
  vec3 p=normalize(vP); p=vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z);
  float e=fbm(p*2.2+3.0);
  vec3 ocean=mix(vec3(0.02,0.10,0.35),vec3(0.05,0.35,0.70),smoothstep(0.30,0.52,e));
  vec3 land=mix(vec3(0.10,0.45,0.15),vec3(0.55,0.45,0.25),smoothstep(0.58,0.75,e));
  vec3 col=e>0.53?land:ocean;
  float cl=smoothstep(0.55,0.8,fbm(p*3.5+vec3(uRot*0.6,0.0,1.7)));
  col=mix(col,vec3(1.0),cl*0.85);
  float ice=smoothstep(0.78,0.92,abs(p.y)); col=mix(col,vec3(0.95),ice);
  vec3 L=normalize(vec3(-0.6,0.5,0.7));
  float d=max(dot(vN,L),0.0);
  vec3 V=normalize(-vW);
  float rim=pow(1.0-max(dot(vN,V),0.0),3.0);
  col=col*(0.12+1.1*d)+vec3(0.3,0.6,1.0)*rim*0.9;
  gl_FragColor=vec4(col,1.0);
}`;
const atmoFS = `varying vec3 vN; varying vec3 vW;
void main(){vec3 V=normalize(-vW); float r=pow(1.0-abs(dot(vN,V)),2.5); gl_FragColor=vec4(vec3(0.35,0.65,1.0)*r*1.6, r);}`;
const atmoVS = `varying vec3 vN; varying vec3 vW; void main(){vN=normalize(normalMatrix*normal); vec4 w=modelViewMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*w;}`;

const Planeta: React.FC<{f: number}> = ({f}) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({vertexShader: planetVS, fragmentShader: planetFS, uniforms: {uRot: {value: 0}}}), []);
  const atmo = useMemo(
    () => luz(new THREE.ShaderMaterial({vertexShader: atmoVS, fragmentShader: atmoFS, side: THREE.BackSide})),
    [],
  );
  mat.uniforms.uRot.value = f * 0.012;
  const ent = interpolate(f, [0, 30], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const luna = f * 0.045;
  return (
    <group position={[2.55 + (1 - ent) * 3, 4.9 + (1 - ent) * 1.5, -4]} rotation={[0.15, 0, -0.35]} scale={0.85}>
      <mesh material={mat}>
        <sphereGeometry args={[1.75, 96, 96]} />
      </mesh>
      <mesh material={atmo} scale={1.16}>
        <sphereGeometry args={[1.75, 64, 64]} />
      </mesh>
      <mesh rotation={[1.25, 0, 0]}>
        <ringGeometry args={[2.3, 3.0, 128]} />
        <meshBasicMaterial color="#FFD60A" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[1.25, 0, 0]}>
        <ringGeometry args={[3.1, 3.18, 128]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[Math.cos(luna) * 3.6, Math.sin(luna) * 0.9, Math.sin(luna) * 3.6]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color="#cfcfd6" roughness={1} />
      </mesh>
    </group>
  );
};

/* ---------------- cohete ---------------- */
const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3.4, 0.6, 0.5), new THREE.Vector3(-0.4, 2.6, 0.8), new THREE.Vector3(3.8, 6.4, -1.5));
const T0 = 4, T1 = 78; // vuelo del cohete (cuadros)
const progreso = (f: number) => interpolate(f, [T0, T1], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});

const Cohete: React.FC<{f: number}> = ({f}) => {
  const q = progreso(f);
  if (f < T0 || q >= 1) return null;
  const pos = curva.getPoint(q);
  const tan = curva.getTangent(q);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan.clone().normalize());
  return (
    <group position={pos} quaternion={quat} scale={0.75}>
      <group rotation={[0, f * 0.15, 0]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.38, 1.9, 32]} />
          <meshStandardMaterial color="#f4f4f6" metalness={0.3} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <coneGeometry args={[0.35, 0.8, 32]} />
          <meshStandardMaterial color="#e63946" metalness={0.2} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.45, 0.33]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial color="#5ec8ff" emissive="#1e6fa8" emissiveIntensity={0.6} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.36, 0.36, 0.12, 32]} />
          <meshStandardMaterial color="#FFD60A" />
        </mesh>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} position={[Math.cos((k * Math.PI) / 2) * 0.45, -0.75, Math.sin((k * Math.PI) / 2) * 0.45]} rotation={[0, (-k * Math.PI) / 2, 0]}>
            <boxGeometry args={[0.32, 0.55, 0.05]} />
            <meshStandardMaterial color="#e63946" />
          </mesh>
        ))}
        <mesh position={[0, -1.05, 0]}>
          <cylinderGeometry args={[0.22, 0.3, 0.25, 24]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -1.55 - Math.sin(f * 1.7) * 0.06, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.24, 0.9 + Math.sin(f * 2.3) * 0.15, 24]} />
          <meshBasicMaterial color="#FFB020" transparent opacity={0.95} />
        </mesh>
        <mesh position={[0, -1.4, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.13, 0.55, 24]} />
          <meshBasicMaterial color="#fff6d0" />
        </mesh>
      </group>
      <pointLight color="#ffa040" intensity={6} distance={6} position={[0, -1.8, 0]} />
    </group>
  );
};

/* humo y fuego: cada partícula nace en la posición del cohete en su cuadro y se dispersa (determinista) */
const NP = 420;
const Humo: React.FC<{f: number}> = ({f}) => {
  const {geo, mat} = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d')!;
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    const m = luz(new THREE.PointsMaterial({size: 0.42, map: new THREE.CanvasTexture(c), vertexColors: true}));
    return {geo: g, mat: m};
  }, []);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const col = geo.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < NP; i++) {
    const nace = T0 + (i / NP) * (T1 - T0);
    const edad = f - nace;
    const q = progreso(nace);
    if (edad < 0 || q >= 1) {
      pos.setXYZ(i, 0, 0, -999);
      col.setXYZ(i, 0, 0, 0);
      continue;
    }
    const p = curva.getPoint(q);
    const t = curva.getTangent(q).normalize();
    const back = p.clone().addScaledVector(t, -0.9);
    const dx = (rnd(i) - 0.5) * 0.06 * edad, dy = (rnd(i + 7) - 0.5) * 0.06 * edad, dz = (rnd(i + 13) - 0.5) * 0.04 * edad;
    pos.setXYZ(i, back.x - t.x * 0.04 * edad + dx, back.y - t.y * 0.04 * edad + dy - 0.004 * edad, back.z + dz);
    const fuego = Math.max(0, 1 - edad / 6);
    const k = Math.max(0, 1 - edad / 45) * 0.55;
    col.setXYZ(i, k + fuego, k + fuego * 0.55, k + fuego * 0.1);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  return <points geometry={geo} material={mat} />;
};

/* ---------------- estrellas + salto a hipervelocidad ---------------- */
const NS = 1400;
const Estrellas: React.FC<{f: number}> = ({f}) => {
  const {geo, mat, pmat, base} = useMemo(() => {
    const b = Array.from({length: NS}, (_, i) => [(rnd(i) - 0.5) * 22, (rnd(i + 500) - 0.3) * 26, -rnd(i + 900) * 60]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NS * 6), 3));
    const m = luz(new THREE.LineBasicMaterial({vertexColors: true}));
    const pm = luz(new THREE.PointsMaterial({size: 0.07, vertexColors: true}));
    return {geo: g, mat: m, pmat: pm, base: b};
  }, []);
  const w = I3?.warp ? interpolate(f, [FIN - WARP, FIN], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
  const avance = f * 0.05 + w * w * 40;
  const largo = 0.06 + w * 9;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const col = geo.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < NS; i++) {
    const [x, y, z0] = base[i];
    const z = ((((z0 + avance + 60) % 62) + 62) % 62) - 60;
    pos.setXYZ(i * 2, x, y, z);
    pos.setXYZ(i * 2 + 1, x, y, z - largo);
    const b = (0.4 + 0.6 * (1 + z / 60)) * (0.45 + 0.55 * Math.abs(Math.sin(f / 8 + i)));
    col.setXYZ(i * 2, b * (rnd(i + 77) > 0.85 ? 1 : 0.85), b * 0.9, b);
    col.setXYZ(i * 2 + 1, b * 0.2, b * 0.25, b * 0.5);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  return (
    <>
      <lineSegments geometry={geo} material={mat} />
      <points geometry={geo} material={pmat} />
    </>
  );
};

/* ---------------- título ---------------- */
const Letras: React.FC<{t: string; desde: number; size: number; color: string; dorado?: boolean}> = ({t, desde, size, color, dorado}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const brillo = interpolate(frame, [desde + 8, desde + 30], [-30, 130], clamp);
  return (
    <div style={{display: 'flex', perspective: 900, whiteSpace: 'pre'}}>
      {[...t].map((ch, i) => {
        const d = desde + i * 1.2;
        const p = spring({frame: frame - d, fps, config: {damping: 12, stiffness: 180, mass: 0.6}});
        return (
          <span key={i} style={{display: 'inline-block', fontFamily: font('Anton'), fontSize: size, lineHeight: 1.05, color,
            transform: `rotateX(${(1 - p) * -95}deg) translateY(${(1 - p) * -40}px)`, opacity: frame < d ? 0 : Math.min(1, p * 1.6),
            textShadow: '0 0 26px rgba(120,180,255,0.65), 6px 8px 0 #0a0a1a',
            ...(dorado ? {backgroundImage: `linear-gradient(100deg, transparent ${brillo - 15}%, #fff ${brillo}%, transparent ${brillo + 15}%), linear-gradient(180deg, #FFF2A8, #FFD60A 45%, #F09A00)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: 'none', filter: 'drop-shadow(6px 8px 0 #0a0a1a) drop-shadow(0 0 20px rgba(255,200,0,0.55))'} : {})}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

const HUD: React.FC<{p: number; children: React.ReactNode}> = ({p, children}) => {
  const frame = useCurrentFrame();
  const esq = (r: number): React.CSSProperties => ({position: 'absolute', width: 34, height: 34, borderColor: '#5ec8ff', borderStyle: 'solid', borderWidth: 0,
    ...(r === 0 ? {left: 0, top: 0, borderLeftWidth: 5, borderTopWidth: 5} : r === 1 ? {right: 0, top: 0, borderRightWidth: 5, borderTopWidth: 5}
      : r === 2 ? {left: 0, bottom: 0, borderLeftWidth: 5, borderBottomWidth: 5} : {right: 0, bottom: 0, borderRightWidth: 5, borderBottomWidth: 5})});
  const scan = ((frame * 4) % 120) - 10;
  return (
    <div style={{position: 'relative', padding: '10px 34px', opacity: p, transform: `scaleX(${interpolate(p, [0, 1], [0.2, 1])})`,
      background: 'linear-gradient(90deg, rgba(10,30,80,0.15), rgba(20,60,140,0.6), rgba(10,30,80,0.15))', overflow: 'hidden'}}>
      {[0, 1, 2, 3].map((r) => <div key={r} style={esq(r)} />)}
      <div style={{position: 'absolute', left: 0, right: 0, top: `${scan}%`, height: 3, background: 'rgba(94,200,255,0.7)', boxShadow: '0 0 12px #5ec8ff'}} />
      {children}
    </div>
  );
};

/* ---------------- "dinero": explosión de monedas 3D con $ (sin máscara, sobre toda la pantalla) ---------------- */
const NM = 46;
const Monedas: React.FC<{f: number; t0: number}> = ({f, t0}) => {
  const {cara, canto} = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(110, 100, 10, 128, 128, 128);
    g.addColorStop(0, '#FFF3A0');
    g.addColorStop(0.6, '#FFC300');
    g.addColorStop(1, '#C07A00');
    x.fillStyle = g;
    x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#A86400'; x.lineWidth = 14;
    x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#8A5200'; x.font = 'bold 170px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('$', 128, 138);
    const tex = new THREE.CanvasTexture(c);
    return {
      cara: new THREE.MeshStandardMaterial({map: tex, metalness: 0.75, roughness: 0.25, emissive: new THREE.Color('#5a3a00'), emissiveIntensity: 0.4}),
      canto: new THREE.MeshStandardMaterial({color: '#E0A000', metalness: 0.9, roughness: 0.2}),
    };
  }, []);
  const k = f - t0;
  if (k < 0 || k > 60) return null;
  return (
    <>
      {Array.from({length: NM}, (_, i) => {
        const d = k - (i % 6) * 0.6;
        if (d < 0) return null;
        const lado = i % 2 ? 1 : -1;
        const vx = lado * (0.015 + rnd(i + 41) * 0.045);
        const vy = 0.34 + rnd(i + 45) * 0.12;
        const x = lado * (1.45 + rnd(i + 40) * 0.6) + vx * d;
        const y = -3.2 + vy * d - 0.0085 * d * d;
        const z = (rnd(i + 42) - 0.5) * 2.5;
        const s = interpolate(d, [0, 5], [0.2, 0.36 + rnd(i + 43) * 0.2], clamp) * interpolate(k, [48, 60], [1, 0], clamp);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[d * (0.2 + rnd(i) * 0.3) + 1.2, d * 0.15 * (i % 2 ? 1 : -1), rnd(i + 44) * 3]} scale={s}
            material={[canto, cara, cara]}>
            <cylinderGeometry args={[1, 1, 0.16, 40]} />
          </mesh>
        );
      })}
    </>
  );
};

export const IntroEspacio: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!I3 || frame >= FIN + 10 || FIN <= 0) return null;
  const tS = I3.t[0] ?? 30;
  const tE = I3.t[1] ?? tS + 20;
  const tV = I3.t[2] ?? tE + 25;
  const tD = I3.monedas ?? -999;
  const oro = interpolate(frame, [tD - 1, tD + 2, tD + 14], [0, 0.55, 0], clamp);
  const w = I3.warp ? interpolate(frame, [FIN - WARP, FIN], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
  const fade = interpolate(frame, [0, 5, FIN, FIN + 10], [0, 1, 1, 0], clamp);
  // la máscara deja el espacio arriba; en el salto se abre a toda la pantalla
  const corte = interpolate(w, [0, 1], [29, 140]);
  const mask = `linear-gradient(180deg, #000 0%, #000 ${corte - 14}%, transparent ${corte}%)`;
  const pHud = spring({frame: frame - (tV - 2), fps, config: {damping: 14, stiffness: 180}});
  const tituloSale = interpolate(w, [0, 0.6], [1, 0], clamp);
  const flash = I3.warp ? interpolate(frame, [FIN - 4, FIN, FIN + 10], [0, 1, 0], clamp) : 0;
  return (
    <AbsoluteFill style={{opacity: fade, pointerEvents: 'none'}}>
      <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask,
        background: `radial-gradient(ellipse 70% 40% at ${30 + Math.sin(frame / 40) * 6}% 18%, rgba(140,60,220,0.55), transparent 70%),
          radial-gradient(ellipse 60% 35% at ${75 + Math.cos(frame / 50) * 5}% 30%, rgba(30,120,255,0.45), transparent 70%),
          linear-gradient(180deg, rgba(3,5,22,0.94) 0%, rgba(8,10,40,0.8) 17%, rgba(8,10,40,${w * 0.85}) 29%)`}} />
      <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask}}>
        <ThreeCanvas width={W} height={H} camera={{fov: 50, position: [0, 0, 10]}} gl={{alpha: true, antialias: true}}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[-4, 5, 6]} intensity={2.2} />
          <Estrellas f={frame} />
          {I3.planeta && <Planeta f={frame} />}
          {I3.cohete && <Humo f={frame} />}
          {I3.cohete && <Cohete f={frame} />}
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{top: 268, alignItems: 'center', opacity: tituloSale, transform: `scale(${1 + w * 0.6})`}}>
        <Letras t={I3.titulo[0] ?? ''} desde={tS - 4} size={92} color="#fff" />
        <div style={{marginTop: 6}}>
          <Letras t={I3.titulo[1] ?? ''} desde={tE - 4} size={126} color="#FFD60A" dorado />
        </div>
        <div style={{marginTop: 16}}>
          {!!I3.hud && <HUD p={frame < tV - 2 ? 0 : pHud}>
            <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 32, letterSpacing: 6, color: '#fff', textShadow: '0 0 14px #5ec8ff'}}>{I3.hud}</div>
          </HUD>}
        </div>
      </AbsoluteFill>
      {frame >= tD - 1 && frame <= tD + 62 && (
        <>
          <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 52%, rgba(255,214,10,0.9), rgba(255,170,0,0.25) 45%, transparent 70%)', opacity: oro}} />
          <AbsoluteFill>
            <ThreeCanvas width={W} height={H} camera={{fov: 50, position: [0, 0, 10]}} gl={{alpha: true, antialias: true}}>
              <ambientLight intensity={0.9} />
              <directionalLight position={[-3, 4, 6]} intensity={2.6} />
              <pointLight position={[2, -2, 5]} intensity={3.5} color="#fff1b0" />
              <Monedas f={frame} t0={tD - 1} />
            </ThreeCanvas>
          </AbsoluteFill>
        </>
      )}
      <AbsoluteFill style={{background: '#dff3ff', opacity: flash}} />
    </AbsoluteFill>
  );
};

// capa pre-renderizada (reel capas): el mismo resultado sin calcular 3D en cada render
export const IntroEspacioCapa: React.FC = () =>
  !I3 ? null : I3.capa ? (
    <Sequence durationInFrames={INTRO3D_LEN}>
      <OffthreadVideo src={staticFile(I3.capa)} transparent muted style={{width: W, height: H}} />
    </Sequence>
  ) : (
    <IntroEspacio />
  );
