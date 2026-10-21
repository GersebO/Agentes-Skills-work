---
name: ui-esgsi
description: Audita, migra o crea pantallas de app-sgsi siguiendo el estándar de UI de E-SGSI (docs/ui-standard.md). Usar ante cualquier pedido de revisar, corregir, homogeneizar o crear una pantalla, listado o tabla.
---

# UI E-SGSI

Las reglas viven en `docs/ui-standard.md` (fuente única). Esta skill define cómo aplicarlas.
El estado por pantalla vive en `docs/ui-audit.md`.

## Antes de empezar (siempre)

1. Lee `docs/ui-standard.md` completo. No inventes reglas que no estén ahí.
2. Detecta el modo según el pedido:
   - **Auditar**: "revisa", "audita", "¿cumple?", "qué le falta a X".
   - **Migrar**: "arregla", "homogeneiza", "pásala al estándar", "corrige X".
   - **Crear**: "hazme", "crea", "nueva pantalla de X".
   Si es ambiguo, pregunta en una línea.
3. Para ahorrar contexto, lee solo los archivos de la pantalla objetivo: page.tsx, el componente funcional, sus columnas y el help-popover. No recorras el proyecto entero.
4. Para ver el patrón de referencia, abre `components/functional/doc-flow/edition/assignment-list.tsx` y busca `toolbarHeader` y la columna `action`. No confíes en números de línea.

## Modo Auditar (no modifica código)

1. Ubica la pantalla por su ruta (`src/app/(menu)/...`) y sigue los imports hasta el componente funcional.
2. Recorre el checklist del §6 del estándar, punto por punto.
3. Entrega una tabla:

   | # | Punto del checklist | Estado | Evidencia (archivo:línea) | Corrección propuesta |
   |---|---|---|---|---|
   | 1 | DetailHeaderCard | ✅ / ❌ / ⚠️ | … | … |

4. Cierra con:
   - **Esfuerzo estimado**: bajo / medio / alto, y por qué.
   - **Bloqueos**: componentes "pendientes de extraer" que la migración necesitaría (FilterTabs, RowActions, StatusBadge).
   - Una frase con el cambio de mayor impacto visual.
5. Actualiza la entrada de esa pantalla en `docs/ui-audit.md` (estado y fecha). Es el único archivo que este modo puede editar.

## Modo Migrar

1. Haz primero la auditoría (modo anterior) y muéstrala.
2. Si la migración requiere un componente "pendiente de extraer":
   - Pregunta: "¿Extraigo FilterTabs primero (beneficia a N pantallas) o lo replico local copiando assignment-list.tsx?"
   - Si se extrae, usa exactamente la API propuesta en el §3 y migra también la pantalla de referencia para usarlo.
3. Aplica las correcciones en orden de impacto: estructura → tabla → filtros → badges/colores → acciones → móvil → estados.
4. No cambies lógica de negocio, servicios ni stores. Si una corrección lo exige, detente y avisa.
5. Respeta el límite de 800 líneas. Si el archivo lo supera, divídelo según la estructura del §7.
6. Verifica antes de terminar:
   - `npm run lint` y el chequeo de tipos del proyecto, sin errores nuevos.
   - Repasa el checklist §6 de nuevo; todo debe quedar ✅ o justificado.
7. Marca la pantalla como cumplida en `docs/ui-audit.md` y resume qué cambió en máximo 5 líneas.

## Modo Crear

1. Pide lo mínimo si falta: qué entidad lista, sus estados (para pestañas y badges) y la acción principal por fila.
2. Sigue el §7 del estándar: capas de CLAUDE.md → estructura de carpetas → esqueleto del orquestador.
3. Usa solo componentes canónicos del §2. Si necesitas uno pendiente de extraer, aplica la misma pregunta del modo Migrar.
4. Mapea cada estado de negocio a una variante de badge con la tabla del §2. Si un estado no calza, pregunta; no inventes colores.
5. Verifica con el checklist §6, lint y chequeo de tipos. Agrega la pantalla a `docs/ui-audit.md` como cumplida.

## Reglas de comportamiento

- El estándar manda. Si encuentras un caso que no cubre, propón la regla y pregunta antes de aplicarla. Si se aprueba, agrégala a `docs/ui-standard.md`.
- Nunca uses colores crudos de Tailwind ni hex en pantallas: solo tokens.
- No toques `app/` ni `api/` (legacy).
- Respuestas cortas: tablas y listas, no párrafos.
