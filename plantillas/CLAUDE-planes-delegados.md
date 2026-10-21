# Bloque para pegar en el CLAUDE.md de cada proyecto

Copia desde la línea `## Planes para ejecución delegada` hasta el final.

---

## Planes para ejecución delegada

Cuando se pida analizar o planificar un cambio de arquitectura o UI (no ejecutarlo), escribe el plan en
`docs/plans/<tema>.md` para que lo ejecute otro modelo menos capaz:

- Paso 0 con línea base de tsc y lint (para no culpar al ejecutor de errores previos).
- Pasos de un solo objetivo, cada uno con casilla `[ ]`, archivos exactos, código o fragmento clave,
  qué NO tocar y verificación (comando + qué se debe ver en pantalla).
- Sin decisiones abiertas: decide y justifica en una línea.
- Regla para el ejecutor: si algo no coincide con el plan, detenerse y avisar en vez de improvisar.
- Paso final de cierre: checklist y actualización de los documentos de auditoría cuando aplique.

No modifiques código al planificar.
