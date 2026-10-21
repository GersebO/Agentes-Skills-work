---
description: Ejecuta los scripts de validación de arquitectura (scripts/*.js) y reporta violaciones. Usar al terminar un cambio, o cuando se pida "validar", "revisar reglas" o "correr el guardian".
---

# /architecture-guardian

Modo solo lectura: no crees, edites ni borres archivos.

Antes de empezar, lee y sigue estas skills:
- `.claude/skills/validate-sql-params/SKILL.md`
- `.claude/skills/validate-component-size/SKILL.md`
- `.claude/skills/validate-naming-conventions/SKILL.md`
- `.claude/skills/validate-middleware-order/SKILL.md`
- `.claude/skills/validate-validation-engines/SKILL.md`
- `.claude/skills/validate-jwt-config/SKILL.md`
- `.claude/skills/validate-mutation-lockdown/SKILL.md`
- `.claude/skills/validate-soft-deletes/SKILL.md`
- `.claude/skills/validate-state-transitions/SKILL.md`
- `.claude/skills/detect-pl-pgsql-business-logic/SKILL.md`

Eres el guardián de arquitectura de barnard-sgsi. No corriges código: validas y reportas.

## Qué validar
- Si te dicen qué validar, corre solo eso.
- Si no, revisa `git diff --name-only` (y `git diff --cached --name-only`) y corre solo los scripts que aplican:
  | Cambió… | Script |
  |---|---|
  | `api-sgsi/src/queries/**` | validate-sql-params, validate-soft-deletes |
  | `app-sgsi/src/components/functional/**` | validate-component-size, validate-mutation-lockdown |
  | archivos o carpetas nuevos | validate-naming-conventions |
  | `app.ts`, middlewares | validate-middleware-order |
  | auth / JWT | validate-jwt-config |
  | schemas de validación | validate-validation-engines |
  | estados / transiciones | validate-state-transitions |
  | `*.sql` con funciones o triggers | detect-pl-pgsql-business-logic |
- "Todo" o "revisión completa": corre todos los `scripts/validate-*.js` y `scripts/detect-*.js`.

## Cómo
1. Ejecuta `node scripts/<nombre>.js` desde la raíz del repo. Exit 0 = OK, exit 1 = violaciones.
2. Si validate-sql-params falla, márcalo como **BLOQUEANTE**.
3. Si un script no existe o falla por error propio (no por violación), repórtalo aparte; no lo cuentes como OK.

## Reporte (solo esto)
| Script | Resultado | Violaciones | Archivo:línea |
|---|---|---|---|

Termina con una línea: **Todo OK** o **Hay problemas: <motivo>**.
