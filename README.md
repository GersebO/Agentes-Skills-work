# Agentes y herramientas para Barnard-SGSI

Este repositorio reúne instrucciones, skills, agentes y scripts para ayudar a desarrollar, revisar y validar cambios en Barnard-SGSI. Su objetivo es aplicar de forma consistente los estándares de arquitectura, seguridad, frontend, backend, base de datos y documentación.

> Este repositorio contiene herramientas y estándares de trabajo; no contiene la aplicación Barnard-SGSI. Varias validaciones esperan ejecutarse sobre el workspace del proyecto, con rutas como `app-sgsi/`, `api-sgsi/` y `docs/`.

## Qué incluye

### Estándares del proyecto

[`rulesproyect.md`](rulesproyect.md) es la referencia general para:

- Arquitectura frontend: Component → Hook → Service → Zustand.
- Arquitectura backend: Router → Middleware → Controller → Service → Model → Query → Database.
- Autenticación con JWT, controles de seguridad HTTP y protección de datos.
- Diseño de interfaz, accesibilidad y experiencia de carga.
- Convenciones de nombres, pruebas y validación.
- PostgreSQL, funciones almacenadas, integridad de datos y soft deletes.

[`AGENTS.md`](AGENTS.md) indica cómo aplicar estas reglas y dónde consultar los estándares de UI y arquitectura del proyecto.

### Skills

Las skills contienen guías de trabajo detalladas que los asistentes pueden seguir según la tarea:

- **Arquitectura:** frontend, backend y PostgreSQL.
- **Seguridad y autenticación:** JWT, configuración de seguridad y lógica PL/pgSQL.
- **Calidad y validación:** parametrización SQL, tamaño de componentes, convenciones de nombres, middlewares, motores de validación, bloqueo de formularios, soft deletes y transiciones de estado.
- **Pruebas y documentación:** pruebas con Vitest, trazabilidad documental y análisis de decisiones arquitectónicas.
- **Interfaz:** estándares y auditoría de pantallas de E-SGSI.

Las definiciones para Claude Code están en [`.claude/skills/`](.claude/skills/). También hay skills reutilizables en [`agents/skills/`](agents/skills/).

### Agentes y workflows

- [`.claude/agents/`](.claude/agents/) contiene agentes de revisión para arquitectura, backend, documentación y UI.
- [`agents/`](agents/) incluye agentes especializados de seguridad y pruebas.
- [`.agents/workflows/`](.agents/workflows/) ofrece workflows para ejecutar el guardian de arquitectura, revisar backend, auditar UI y mantener documentación.

Los agentes de revisión están diseñados para analizar y reportar hallazgos; consulta sus instrucciones antes de usarlos para conocer su alcance y permisos.

### Scripts

Los scripts de [`scripts/`](scripts/) automatizan comprobaciones y tareas de apoyo. Entre otras cosas:

- Detectan SQL no parametrizado y revisan soft deletes.
- Comprueban convenciones de nombres y el tamaño de componentes funcionales.
- Revisan la configuración JWT, el orden de middlewares y el bloqueo de formularios durante operaciones asíncronas.
- Validan motores de esquemas y transiciones de estado.
- Detectan lógica de negocio en funciones PL/pgSQL.
- Ayudan a revisar ADRs, localizar imports de servicios, auditar estándares y dividir archivos SQL grandes.

El detalle de cada script está en [`scripts/README.md`](scripts/README.md).

## Uso

### Ejecutar una validación

Desde la raíz del workspace del proyecto:

```bash
node scripts/validate-sql-params.js
node scripts/validate-component-size.js
node scripts/validate-middleware-order.js
```

Cada script se puede ejecutar de forma independiente. Revisa [`scripts/README.md`](scripts/README.md) para conocer qué rutas inspecciona y cómo interpretar el resultado. En PowerShell también se puede ejecutar el conjunto de validadores y detectores:

```powershell
Get-ChildItem scripts/validate-*.js, scripts/detect-*.js | ForEach-Object {
  node $_.FullName
}
```

### Trabajar con skills y agentes

Usa la skill o el workflow relacionado con la tarea (por ejemplo, frontend, backend, seguridad, pruebas o documentación) y sigue las instrucciones y estándares incluidos en sus respectivos archivos. No asumas que un agente que audita también tiene permiso para modificar código.

## Requisitos

- Node.js para ejecutar los scripts.
- Un workspace de Barnard-SGSI para las validaciones que inspeccionan `app-sgsi/`, `api-sgsi/` o `docs/`.
- Un asistente compatible con los archivos de skills, agentes o workflows para utilizarlos como instrucciones.

## Estructura

```text
.
├── .agents/workflows/   # Workflows reutilizables
├── .claude/agents/      # Agentes de Claude Code
├── .claude/skills/      # Skills de Claude Code
├── agents/              # Agentes y skills compartidos
├── scripts/             # Validadores y utilidades Node.js
├── AGENTS.md            # Instrucciones para agentes
├── README.md            # Descripción y uso de este repositorio
└── rulesproyect.md      # Estándares técnicos del proyecto

```