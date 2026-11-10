// Props de la composición "Reel" (las mismas para la vista previa y para cualquier cálculo de la app que use la
// plantilla, como los bloques de subtítulos). setDatos() de la plantilla es global: si alguien la llamara con otros
// valores, la vista previa dibujaría con ellos; por eso todo pasa por aquí.
import {useMemo} from 'react';
import {setDatos, type Datos} from '@plantilla/theme';
import {useEditor} from './store';

export const usePropsPlantilla = (): Datos | null => {
  const data = useEditor((s) => s.data);
  const estilo = useEditor((s) => s.estilo);
  const vlog = useEditor((s) => s.vlog);
  const info = useEditor((s) => s.info);
  const calidad = useEditor((s) => s.calidad);
  return useMemo(
    () =>
      data
        ? {data, estilo: estilo ?? undefined, vlog: vlog ?? VACIO, base: info ? `${info.base}__v${info.versionCorte}/` : null, proxy: calidad === 'proxy' && !!info?.estado.proxy, fuentes: info ? `${info.base}__plantilla/fonts/` : null}
        : null,
    [data, estilo, vlog, info, calidad],
  );
};
const VACIO = {};

// aplica los props a la plantilla y devuelve el resultado de fn (p. ej. CHUNKS())
export const conPlantilla = <T,>(p: Datos | null, fn: () => T): T | null => {
  if (!p) return null;
  setDatos(p);
  return fn();
};
