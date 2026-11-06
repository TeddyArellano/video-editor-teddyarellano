# Ejemplo validado: Rocket Revolution — "¿Cuánto han invertido en su proyecto?" (2 partes)

Inauguración de la Semana Mundial del Espacio (IPN, oct. 2026). Estilo `entrevista` con todo lo que el creador aprobó tras varias rondas:

| Pieza | Qué hace |
|---|---|
| sección `teddy` | el creador a cámara: "Estamos en la inauguración de la Semana Mundial del Espacio… vamos a ver cuánto dinero han invertido los equipos". Zoom ×1.4 + seguimiento de cara (`caras: 1`). `reel lentes --sec teddy` quita el reflejo azul de sus lentes. |
| `intro_espacio` | la intro 3D: estrellas, planeta, cohete con humo, título "SEMANA MUNDIAL / DEL ESPACIO" + HUD "ROCKET REVOLUTION", monedas 3D al decir "dinero" y salto a hipervelocidad hacia la pregunta. Se pre-renderiza con `reel capas`. |
| sección `intro` | la pregunta = el gancho, con una toma distinta en cada parte (la de mejor LUFS/contraste) y la píldora "PARTE N". |
| una sección por equipo | la primera es la cifra más alta del video. Cada una lleva: monto `golpe` + cash/coin, etiquetas con el desglose, b-roll del stand (2–3 s) y la captura de IG centrada al decir su nombre, que termina antes del siguiente equipo. |
| sin `cierre` | el creador lo quitó. |

Archivos: `parteN.plan.json`, `parteN.eventos.json`, `estilo.json` (el de entrevista + `"monto": {"estilo": "golpe"}`). Los índices son de esa transcripción: úsalos como modelo de estructura, no copies los números.

Flujo que funcionó (el orden importa):
1. `nuevo` → `inventario` (mira las hojas: entrevistas largas = personas; clips cortos después = su b-roll; capturas de IG en el mismo orden).
2. `sdr` de todo lo que uses → `transcribir --prompt "nombres de equipos"` → mide las tomas de la pregunta (LUFS + contraste) → `plan.json`.
3. `edl` → `cortar --verificar` → `niveles --aplicar` → `lentes --sec teddy` (si hay lentes).
4. b-roll con `hdr_a_sdr` + recorte vertical (`public/broll/`); capturas de IG completas a `public/perfiles/<equipo>.jpg`.
5. `eventos.json` → `datos` → ajusta los `dur` de los perfiles para que terminen antes de la siguiente sección → `revisar`.
6. `render --borrador` (la capa 3D se hace sola una vez) → el creador aprueba → `render --nota` (o `--4k`).
7. (Aquí el creador lo pidió; no es automático.) `dividir` en 2 partes de ≥ 1 min, con teddy+intro en ambas, una toma distinta de la pregunta en la parte 2 y la cifra más alta primero.
