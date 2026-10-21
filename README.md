# Agentes y Skills de trabajo

Fuente única de skills, agentes y prompts para Claude Code, OpenCode y Antigravity.
Nada se copia a los proyectos: se **vinculan** (junctions de Windows), así que lo que cambies aquí
se ve al instante en todos lados.

## Estructura

```
Agentes-Skills-work/
├── comun/                    ← sirve en TODOS los proyectos (se instala a nivel de usuario)
│   ├── skills/               frontend-architecture, backend-architecture, database-postgres,
│   │                         security-auth, testing-vitest
│   ├── agents/               security-auditor, test-writer
│   ├── generado/             (automático: versiones OpenCode y Antigravity, no editar)
│   └── rulesproyect.md       estándares de la empresa (copia maestra)
│
├── proyectos/
│   └── barnard-sgsi/         ← solo de este proyecto (se vincula a su carpeta)
│       ├── skills/           ui-esgsi, validate-*, update-documentation, analyze-architectural-decisions...
│       ├── agents/           ui-auditor, architecture-guardian, backend-reviewer, docs-keeper
│       ├── generado/         (automático, no editar)
│       └── referencia/       copias de respaldo: scripts/, AGENTS.md (viven en el repo del proyecto)
│
├── plantillas/               bloque de CLAUDE.md para planes delegados + prompts frecuentes
└── herramientas/
    ├── instalar-global.bat   vincula comun/ a tu usuario (una vez por PC)
    ├── instalar-proyecto.bat vincula proyectos/<nombre>/ a un proyecto
    └── sync-agents.py        genera las versiones de OpenCode y Antigravity
```

## Instalación (una vez por PC)

Desde CMD, en la raíz de este repo:

```
herramientas\instalar-global.bat
herramientas\instalar-proyecto.bat barnard-sgsi "C:\ruta\a\barnard-sgsi"
```

Lo que ya exista se renombra a `.bak-NNNN` (no se borra). Revisa y borra esos `.bak` cuando todo funcione.

En el `.gitignore` del proyecto agrega:

```
.claude/skills
.claude/agents
.opencode/agent
.agents/
```

## Reglas

1. **Se edita solo aquí**, en `skills/` y `agents/`. Nunca en `generado/`.
2. Después de crear o cambiar un agente: `python herramientas/sync-agents.py`.
3. ¿Dónde va una skill nueva? Si sirve en cualquier proyecto → `comun/`. Si menciona rutas,
   pantallas o scripts de un proyecto → `proyectos/<nombre>/`.

## Proyecto nuevo

```
herramientas\instalar-proyecto.bat <nombre> "C:\ruta\al\proyecto"
```

Si `proyectos/<nombre>/` no existe, se crea vacío. Luego:
1. Pega `plantillas/CLAUDE-planes-delegados.md` en el CLAUDE.md del proyecto.
2. Usa el prompt 4 de `plantillas/prompts.md` para generar su estándar de UI.
3. Crea sus skills y agentes en `proyectos/<nombre>/`.

## Dónde queda cada cosa

| Herramienta | Común (usuario) | Proyecto |
|---|---|---|
| Claude Code | `~/.claude/skills`, `~/.claude/agents` | `.claude/skills`, `.claude/agents` |
| OpenCode | `~/.config/opencode/agent` | `.opencode/agent` |
| Antigravity | `~/.gemini/config/skills` | `.agents/skills`, `.agents/workflows` (`/nombre`) |
