// Paridad con reel.py: la resolución de anclas de la app debe dar EXACTAMENTE lo mismo que Python.
// Fixture generado con proyectos reales (scratch): REEL_PARIDAD=/ruta/paridad.json npx vitest run
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {Anclas} from '@shared/anclas';

const f = process.env.REEL_PARIDAD;
describe.skipIf(!f)('paridad de anclas con reel.py', () => {
  it('todas las anclas reales resuelven igual', () => {
    const casos = JSON.parse(fs.readFileSync(f!, 'utf8')) as {proyecto: string; an: never; t: number | null}[];
    const cache = new Map<string, Anclas>();
    let malos = 0;
    for (const c of casos) {
      if (!cache.has(c.proyecto)) cache.set(c.proyecto, new Anclas(JSON.parse(fs.readFileSync(path.join(c.proyecto, 'src/data.json'), 'utf8')).words));
      let t: number | null;
      try {
        t = cache.get(c.proyecto)!.t(c.an);
      } catch {
        t = null;
      }
      if (t === null ? c.t !== null : c.t === null || Math.abs(t - c.t) > 1e-9) {
        malos++;
        console.log('DIFERENTE', c.proyecto.split('/').slice(-2, -1)[0], JSON.stringify(c.an), 'py', c.t, 'ts', t);
      }
    }
    console.log(`${casos.length} anclas comparadas`);
    expect(malos).toBe(0);
  });
});
