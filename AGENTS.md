# AGENTS.md

Guía para agentes de código en este repositorio (barnard-sgsi, monorepo SGSI).

- **UI:** para cualquier trabajo de UI, sigue [`docs/ui-standard.md`](docs/ui-standard.md). Pantallas pendientes y duplicados: [`docs/ui-audit.md`](docs/ui-audit.md).
- **Arquitectura, comandos y reglas de capas:** ver [`CLAUDE.md`](CLAUDE.md) (flujo Page → Component → Hook → Store → Service; Router → Controller → Service → Model → Query; límite de 800 líneas por componente funcional; no tocar `app/` ni `api/` legacy).
- **Estándares empresariales:** `.rulesproyect`.
