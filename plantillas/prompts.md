# Prompts de uso frecuente

## 1. Planificar (Claude Code — el modelo fuerte piensa)

```
Planifica <qué>: analiza el código contra los estándares del proyecto y escribe el plan en
docs/plans/<tema>.md siguiendo la sección "Planes para ejecución delegada" de CLAUDE.md.
No modifiques código.
```

## 2. Ejecutar un plan (OpenCode / Antigravity — el modelo barato ejecuta)

Repetir una vez por paso:

```
Ejecuta SOLO el siguiente paso sin marcar de docs/plans/<tema>.md, exactamente como está escrito.
Si algo no calza con el código, detente y avísame. Al terminar corre su verificación y márcalo [x].
```

## 3. Revisar lo que ejecutó otro modelo (Claude Code, barato: solo lee el diff)

```
Revisa los cambios actuales contra docs/plans/<tema>.md. Dime qué pasos quedaron distintos a lo planificado.
```

## 4. Crear el estándar de UI de un proyecto nuevo (Claude Code, una sola vez)

```
Analiza este proyecto para crear su estándar de UI. NO modifiques código, solo investiga y documenta.
1. Stack: framework, estilos, librería de componentes, íconos (package.json y config).
2. Tokens: dónde se definen colores, tipografía, espaciados, radios y modo oscuro.
3. Catálogo de componentes reutilizables; marca duplicados y elige UNO canónico por necesidad.
4. Pantalla de referencia: <ruta de la pantalla que está bien>. Describe su estructura de arriba a abajo.
5. Contraejemplo: <ruta de la pantalla que está mal>. Lista qué se desvía.
6. Escribe docs/ui-standard.md (reglas estables, máx ~300 líneas): stack y tokens, catálogo,
   patrón de pantalla, reglas hacer/no hacer, checklist de auditoría, cómo crear una pantalla nueva.
7. Escribe docs/ui-audit.md (pantallas que no cumplen + duplicados, con casillas [ ]).
8. Agrega en CLAUDE.md y AGENTS.md: "Para cualquier trabajo de UI, sigue docs/ui-standard.md".
```
