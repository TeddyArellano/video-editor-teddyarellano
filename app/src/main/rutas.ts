// Dónde están la skill, el toolkit y las herramientas externas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {preferencias} from './preferencias';

export const HOME = os.homedir();
export const TOOLKIT = path.join(HOME, '.reels-toolkit');
// el Python del toolkit (o el que se elija en Preferencias)
export const python = () => preferencias().python || path.join(TOOLKIT, 'venv', 'bin', 'python');

// la skill: variable REEL_SKILL > el repo donde vive la app (desarrollo) > el enlace que crea install.sh
export const skillDir = (): string => {
  const cands = [
    preferencias().skill || undefined,
    process.env.REEL_SKILL,
    path.resolve(__dirname, '../../../skill/editar-reel'), // app/out/main → repo/skill/editar-reel
    path.resolve(__dirname, '../../../../skill/editar-reel'),
    path.join(HOME, '.claude', 'skills', 'editar-reel'),
    path.join(HOME, '.claude-tortas', 'skills', 'editar-reel'),
  ].filter(Boolean) as string[];
  for (const c of cands) if (fs.existsSync(path.join(c, 'scripts', 'reel.py'))) return fs.realpathSync(c);
  return cands[1];
};
export const reelPy = () => path.join(skillDir(), 'scripts', 'reel.py');
export const plantillaDir = () => path.join(skillDir(), 'plantilla_remotion');
// raíz del repo (skill/editar-reel → ../..), para buscar actualizaciones e instalar
export const repoDir = () => path.resolve(skillDir(), '..', '..');

// apps abiertas desde Finder heredan un PATH mínimo: se agregan Homebrew y las rutas de usuario (ffmpeg, whisper-cli, node, claude)
export const entorno = (): NodeJS.ProcessEnv => {
  const extra = ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', path.join(HOME, '.local', 'bin'), path.join(HOME, '.claude', 'local'), path.join(HOME, '.npm-global', 'bin')];
  const actual = (process.env.PATH ?? '').split(':');
  return {...process.env, PATH: [...extra.filter((x) => !actual.includes(x)), ...actual].join(':'), PYTHONUNBUFFERED: '1', FORCE_COLOR: '0', NO_COLOR: '1', PYTHON_COLORS: '0'};
};
