// Deshacer / rehacer: restaura el estado y guarda lo restaurado.
import {guardar, useEditor} from './store';

export const historial = (accion: 'deshacer' | 'rehacer') => {
  const t = useEditor.temporal.getState();
  if (accion === 'deshacer') t.undo();
  else t.redo();
  const s = useEditor.getState();
  useEditor.setState({sucios: ['eventos', 'estilo', 'plan', 'notas'].filter((d) => s[d as 'eventos'] !== null) as typeof s.sucios, verEdicion: s.verEdicion + 1});
  guardar(true);
};
