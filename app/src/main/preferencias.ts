// Preferencias de la app (userData/preferencias.json): rutas de la skill y del Python del toolkit, tema y calidad.
import {app} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type {Preferencias} from '../shared/tipos';

export const PREF_DEFECTO: Preferencias = {skill: '', python: '', tema: 'oscuro', calidad: 'proxy'};
const archivo = () => path.join(app.getPath('userData'), 'preferencias.json');
let cache: Preferencias | null = null;

export const preferencias = (): Preferencias => {
  if (cache) return cache;
  try {
    cache = {...PREF_DEFECTO, ...JSON.parse(fs.readFileSync(archivo(), 'utf8'))};
  } catch {
    cache = {...PREF_DEFECTO};
  }
  return cache!;
};

export const guardarPreferencias = (p: Partial<Preferencias>): Preferencias => {
  cache = {...preferencias(), ...p};
  fs.mkdirSync(path.dirname(archivo()), {recursive: true});
  fs.writeFileSync(archivo(), JSON.stringify(cache, null, 2));
  return cache;
};
