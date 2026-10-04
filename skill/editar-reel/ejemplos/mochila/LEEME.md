# Ejemplo completo: "Qué lleva en su mochila" (estilo humor-comparacion)

`plan.json` y `eventos.json` reales que regeneran este video con la skill, desde los clips crudos (IMG_0634 Radio, IMG_0636 Juan, IMG_0639 intro). Probado de punta a punta: 92.7 s, 0 silencios, bt709, −15.6 LUFS.

Para replicar el estilo con material nuevo, lee los dos archivos:
- **Intro:** la mejor toma del gancho (índices 25–41 de IMG_0639).
- **Por persona:** pregunta → nombre → semestre → "¿puedes mostrarme…?" → objetos.
- **Cámara rápida:** las listas largas van con `"speed": 2`; `quitar` elimina repeticiones.
- **eventos.json:** `objetos` alimenta el contador, `zooms` centra los objetos curiosos (cx/cy salen de `reel cuadricula`) y `sfx` pone los SFX de chiste.

El video publicado (versión final del creador, 76 s) está en
`~/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/Qué lleva en su mochila/`.
