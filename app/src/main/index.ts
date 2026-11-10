// Proceso principal de Reel Studio.
import {BrowserWindow, app, clipboard, dialog, ipcMain, shell} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {ARCHIVOS, type Archivo, type CambioArchivo, type EventoClaude, type Herramientas, type Trabajo} from '../shared/tipos';
import {escribirJSON, leerJSON} from './archivos';
import {abrirSesionInteractiva, cancelarClaude, preguntar} from './claude';
import {manejarProtocolo, registrarEsquema} from './medios';
import {alAvisar, cancelar, detenerTodo, encolar, encolarCadena, lista} from './procesos';
import {abrir, cerrar, dejarDeVigilarRegistro, infoDe, miniatura, propias, recientes, rutaDe, vigilarRegistro} from './proyectos';
import {TOOLKIT, entorno, python, reelPy, repoDir, skillDir} from './rutas';
import {guardarPreferencias, preferencias} from './preferencias';
import {execFileSync} from 'node:child_process';

registrarEsquema();
// pruebas: perfil aislado (recientes, etc.)
if (process.env.REEL_USER_DATA) app.setPath('userData', process.env.REEL_USER_DATA);

let ventana: BrowserWindow | null = null;
const enviar = (canal: string, x: unknown) => ventana?.webContents.send(canal, x);

const crearVentana = () => {
  ventana = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    title: 'Reel Studio',
    backgroundColor: '#0b0b0f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {preload: path.join(__dirname, '../preload/index.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: false},
  });
  if (process.env.ELECTRON_RENDERER_URL) ventana.loadURL(process.env.ELECTRON_RENDERER_URL);
  else ventana.loadFile(path.join(__dirname, '../renderer/index.html'));
  ventana.on('closed', () => (ventana = null));
  // abrir un proyecto al iniciar: REEL_ABRIR=<ruta>, argumento de línea de comandos o carpeta soltada en el ícono
  ventana.webContents.once('did-finish-load', () => {
    const ruta = pendiente ?? process.env.REEL_ABRIR ?? process.argv.slice(1).find((a) => !a.startsWith('-') && (fs.existsSync(path.join(a, 'proyecto_remotion', 'edicion', 'proyecto.json')) || fs.existsSync(path.join(a, 'edicion', 'proyecto.json'))));
    if (ruta) enviar('abrir-ruta', ruta);
    pendiente = null;
  });
};
let pendiente: string | null = null;
app.on('open-file', (e, ruta) => {
  e.preventDefault();
  if (ventana && !ventana.webContents.isLoading()) enviar('abrir-ruta', ruta);
  else pendiente = ruta;
});

const archivoValido = (a: string): a is Archivo => (ARCHIVOS as readonly string[]).includes(a);
const dentro = (raiz: string, rel: string) => {
  const f = path.resolve(raiz, rel);
  if (!f.startsWith(raiz + path.sep)) throw new Error(`ruta fuera del proyecto: ${rel}`);
  return f;
};

const registrarIPC = () => {
  ipcMain.handle('recientes', () => recientes());
  ipcMain.handle('miniatura', (_e, ruta: string) => miniatura(ruta));
  ipcMain.handle('buscarProyectos', (_e, carpeta: string) => encolar('', carpeta, 'Buscar videos', ['proyectos', '--buscar', carpeta]));
  ipcMain.handle('elegirCarpeta', async (_e, titulo?: string) => {
    const r = await dialog.showOpenDialog(ventana!, {title: titulo ?? 'Abrir proyecto', properties: ['openDirectory', 'createDirectory']});
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('elegirArchivo', async (_e, filtros?: {name: string; extensions: string[]}[]) => {
    const r = await dialog.showOpenDialog(ventana!, {properties: ['openFile'], filters: filtros});
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('abrir', (_e, ruta: string) => abrir(ruta, (c: CambioArchivo) => enviar('cambio', c)));
  ipcMain.handle('cerrar', (_e, id: string) => cerrar(id));
  ipcMain.handle('info', (_e, id: string) => infoDe(rutaDe(id)));
  ipcMain.handle('leer', (_e, id: string, a: string) => {
    if (!archivoValido(a)) throw new Error(`archivo no permitido: ${a}`);
    return leerJSON(path.join(rutaDe(id), a));
  });
  ipcMain.handle('escribir', (_e, id: string, a: string, contenido: unknown, hashPrevio: string | null) => {
    if (!archivoValido(a)) throw new Error(`archivo no permitido: ${a}`);
    const raiz = rutaDe(id);
    return escribirJSON(raiz, path.join(raiz, a), contenido, hashPrevio, propias);
  });
  ipcMain.handle('leerTexto', (_e, id: string, rel: string) => {
    const f = dentro(rutaDe(id), rel);
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  });
  ipcMain.handle('listar', (_e, id: string, rel: string) => {
    const f = dentro(rutaDe(id), rel);
    return fs.existsSync(f) ? fs.readdirSync(f).filter((x) => !x.startsWith('.')).sort() : [];
  });
  ipcMain.handle('correr', (_e, id: string, titulo: string, comando: string[]) => {
    if (comando[0] === 'nuevo') return encolar('', path.dirname(comando[1]), titulo, comando); // aún no hay proyecto
    return encolar(id, rutaDe(id), titulo, comando);
  });
  ipcMain.handle('cadena', (_e, id: string, pasos: {titulo: string; comando: string[]}[]) => encolarCadena(id, rutaDe(id), pasos));
  ipcMain.handle('fuenteDe', (_e, id: string, clip: string) => {
    const dir = infoDe(rutaDe(id)).carpeta;
    const f = fs.existsSync(dir) ? fs.readdirSync(dir).find((x) => path.parse(x).name === clip && /\.(mov|mp4|m4v)$/i.test(x)) : undefined;
    return f ?? null;
  });
  ipcMain.handle('cancelar', (_e, t: string) => cancelar(t));
  ipcMain.handle('trabajos', () => lista());
  ipcMain.handle('herramientas', (): Herramientas => {
    const det: string[] = [];
    const ok = (f: string, n: string) => (fs.existsSync(f) ? true : (det.push(`falta ${n}: ${f}`), false));
    const t = [ok(python(), 'Python del toolkit'), ok(reelPy(), 'reel.py'), ok(path.join(TOOLKIT, 'bin', 'faces'), 'binarios Swift'),
      ok(path.join(TOOLKIT, 'models', 'ggml-large-v3-turbo.bin'), 'modelo Whisper'), ok(path.join(TOOLKIT, 'remotion', 'node_modules'), 'Remotion')];
    return {python: python(), reel: reelPy(), skill: skillDir(), toolkit: t.every(Boolean), detalles: det};
  });
  ipcMain.handle('mostrarEnFinder', (_e, ruta: string) => shell.showItemInFolder(ruta));
  ipcMain.handle('copiarAPublic', (_e, id: string, origen: string, destinoRel: string) => {
    const raiz = rutaDe(id);
    const dst = dentro(path.join(raiz, 'public'), destinoRel);
    fs.mkdirSync(path.dirname(dst), {recursive: true});
    fs.copyFileSync(origen, dst);
    return path.relative(path.join(raiz, 'public'), dst);
  });
  ipcMain.handle('preferencias', () => preferencias());
  ipcMain.handle('guardarPreferencias', (_e, p) => guardarPreferencias(p));
  // actualizaciones: el repo de la skill es la fuente de la app (git fetch + comparar con la rama remota)
  ipcMain.handle('buscarActualizaciones', () => {
    const repo = repoDir();
    const git = (...a: string[]) => execFileSync('git', ['-C', repo, ...a], {encoding: 'utf8', env: entorno(), timeout: 30_000}).trim();
    try {
      const rama = git('rev-parse', '--abbrev-ref', 'HEAD');
      git('fetch', '--quiet');
      const [adelante, atras] = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').split(/\s+/).map(Number);
      return {repo, rama, atras, adelante, cambiosLocales: git('status', '--porcelain', '--untracked-files=no') !== '', ultimo: git('log', '-1', '--format=%h %s (%cr)')};
    } catch (e) {
      return {repo, rama: '', atras: 0, adelante: 0, cambiosLocales: false, ultimo: '', error: String((e as Error).message).split('\n')[0]};
    }
  });
  // REEL_DESTINO_APP: dónde reinstalar (pruebas); por defecto /Applications
  // git pull (solo avance rápido) + instalar.sh de la versión NUEVA; no depende de scripts que la versión vieja no tenga
  ipcMain.handle('actualizarApp', () =>
    encolar('', repoDir(), 'Actualizar Reel Studio', [
      '__sh', '-c', 'set -e; echo "… git pull"; git -C "$1" pull --ff-only; zsh "$1/app/instalar.sh" "$2"; echo "✓ actualizado: reinicia Reel Studio"',
      'actualizar', repoDir(), process.env.REEL_DESTINO_APP || '/Applications',
    ]),
  );
  ipcMain.handle('repararToolkit', () => encolar('', repoDir(), 'Instalar / reparar toolkit', ['__sh', path.join(repoDir(), 'install.sh')]));
  ipcMain.handle('probarToolkit', () => encolar('', repoDir(), 'Probar toolkit', ['prueba']));
  ipcMain.handle('reiniciar', () => {
    app.relaunch();
    app.exit(0);
  });
  ipcMain.handle('estilos', () => {
    const dir = path.join(skillDir(), 'estilos');
    const estilos = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json') && !f.endsWith('.eventos.json'))
      .map((f) => {
        const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        // ojo: en estilos/*.json "nombre" es el grupo de fuentes de la etiqueta de nombre, no el nombre del estilo
        return {id: f.slice(0, -5), nombre: typeof j.titulo === 'string' ? j.titulo : f.slice(0, -5), descripcion: typeof j.descripcion === 'string' ? j.descripcion : undefined};
      });
    const md = path.join(skillDir(), 'marcas');
    const marcas = fs
      .readdirSync(md)
      .filter((d) => fs.existsSync(path.join(md, d, 'marca.json')))
      .map((d) => {
        const n = JSON.parse(fs.readFileSync(path.join(md, d, 'marca.json'), 'utf8')).nombre;
        return {id: d, nombre: typeof n === 'string' ? n : d};
      });
    return {estilos, marcas};
  });
  ipcMain.handle('leerEstilo', (_e, id: string) => {
    if (!/^[\w-]+$/.test(id)) throw new Error('id de estilo inválido');
    return JSON.parse(fs.readFileSync(path.join(skillDir(), 'estilos', `${id}.json`), 'utf8'));
  });
  ipcMain.handle('guardarEstilo', (_e, id: string, contenido: unknown) => {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error('usa minúsculas, números y guiones');
    fs.writeFileSync(path.join(skillDir(), 'estilos', `${id}.json`), JSON.stringify(contenido, null, 2) + '\n');
  });
  ipcMain.handle('claude', (_e, id: string, prompt: string) => preguntar(rutaDe(id), prompt, (ev: EventoClaude) => enviar('claude', ev)));
  ipcMain.handle('copiar', (_e, t: string) => clipboard.writeText(t));
  ipcMain.handle('publicarRevision', (_e, id: string) => {
    const ruta = rutaDe(id);
    const url = (leerJSON(path.join(ruta, 'edicion', 'proyecto.json'))?.contenido as {revision_url?: string} | null)?.revision_url;
    const prompt =
      `Publica la página de revisión de este proyecto (${ruta}) siguiendo SKILL.md §4 de la skill editar-reel. ` +
      `La página y el borrador web ya están en edicion/revision/. ` +
      (url ? `Ya existe en ${url}: lee ese artifact y republica ahí (mismo link), subiendo el video nuevo como asset. ` : 'Es la primera vez: publícala nueva. ') +
      `Después corre reel revision con --video-url y --artifact para que quede revision_url en proyecto.json, y dame el link.`;
    return abrirSesionInteractiva(ruta, prompt);
  });
  ipcMain.handle('claudeCancelar', (_e, s: string) => cancelarClaude(s));
  alAvisar((t: Trabajo) => enviar('trabajo', t));
  vigilarRegistro(() => enviar('recientes-cambio', null));
};

app.whenReady().then(() => {
  manejarProtocolo();
  registrarIPC();
  crearVentana();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && crearVentana());
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  detenerTodo();
  dejarDeVigilarRegistro();
});
