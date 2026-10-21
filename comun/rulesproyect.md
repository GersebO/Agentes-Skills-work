# 🏛️ Full-Stack Master Standards & Architecture (2026)

This document establishes the official technical standards for our development ecosystem. It merges high-end Frontend "Premium UI" principles with Enterprise-grade Backend security and layered architecture.

**Structure of this document**
* **Part I — Standards & Architecture** (this part, English): the rules every project must follow.
* **Part II — Database Technical Reference** (Spanish): the detailed PostgreSQL conventions, function patterns and step-by-step guide. Part I §10 summarizes it; Part II is the source of truth for *how* to implement it.

---

## ⚠️ Critical Exception: Validation Engines
Before starting development, identify the project scope to ensure compliance with existing codebases:

1.  **Project: Barnard-SGSI**
    * **Frontend:** Use **Zod** for schema validation.
    * **Backend:** Use **Joi** for request validation.
2.  **All Other / New Projects:**
    * **Full-Stack:** Use **Zod** for both Frontend and Backend (Standardized Lead Developer approach).

---

## 1. System Architecture Overview

### 🔹 Frontend Layer (React/Next.js)
Focused on **User Experience (UX)** and **Performance**.
* **Pattern:** `Page → Component → Hook → Zustand Store → Service → API`.
* **Key Principle:** The UI should be "dumb" (presentational). The **Zustand store** is the "brain": its async actions call the service and own the result, loading and error state. The **Hook** is the component's only door to the store.
* **Strict rule:** no layer skips another. Components never import a store or a service directly; services never hold state.

### 🔸 Backend Layer (Node.js/Express)
Focused on **Security** and **Separation of Concerns**.
* **Pattern:** `Router → Middleware → Controller → Service → Model → Query → DB (stored function in schema app)`.
* **Key Principle:** Controllers must remain "thin" (HTTP handling only). Business logic resides exclusively in the **Service** layer.
* **Data Access Principle:** The backend never runs ad-hoc SQL against tables. Every database operation is a call to a PL/pgSQL stored function in the `app` schema that returns a `{ status, data }` JSONB envelope (see Part II §1, §6).

---

## 2. Directory Structure (`/src`)

### 🎨 Frontend Logic
* **`app/`**: Next.js App Router (Routes & Layouts).
* **`components/`**:
    * **`functional/`**: Logic-heavy orchestrators. **Avoid "God Components" (>800 lines).**
    * **`layout/`**: Structural skeletons (Headers, Sidebars).
    * **`ui/`**: Atomic, robust components based on CVA (Buttons, Inputs).
* **`store/`**:
    * **`hooks/`**: **(The Door)** Wraps the store with selective subscriptions and is the only thing components import. Never calls a service.
    * **`zustand/`**: **(The Brain / Source of Truth)** Async actions call the service and store the result plus `isLoading` / `hasError` / `errorMessage`, always releasing state in `finally`.
    * **`services/`**: Pure API fetching logic (Axios). No state, no business logic.
    * **`interfaces/`**: Strict TypeScript data contracts.

### ⚙️ Backend Logic (The Layered System)
* **`routers/`**: **(The Traffic Police)** Maps URLs to specific Controllers.
* **`middlewares/`**: **(The Metal Detector)** Blocks or translates requests (Auth, Rate Limiting, Pino logging).
* **`controllers/`**: **(The Receptionist)** Extracts data (`req.body/params`), performs basic validation, and delegates to the Service.
* **`services/`**: **(The Chef)** Where the "magic" happens. Business logic, ISO 27001 calculations, and complex orchestration.
* **`models/`**: **(The Connector)** Executes queries through the Pool, reads the `status` of the JSONB envelope and translates it (`success` → data, `not_found` → `null`, `error` → logged internal error, never exposed to the client).
* **`queries/`**: **(The Spell Dictionary)** Stores only parameterized calls to stored functions (e.g. `SELECT app.entity_get_by_id($1) AS data`). No direct `SELECT/INSERT/UPDATE` on tables, no string concatenation.
* **`utils/`**: Shared infrastructure (`database.ts` Pool, `logger.ts` Pino, `dbResponse.ts` envelope helper).
* **`migrations/`** *(project root)*: Versioned SQL files (`NNN_entity.sql`) containing tables, indexes and stored functions.
* **`schemas/`**: **(The Manual)** Validation schemas (Joi for Barnard-SGSI / Zod for others).
* **`config/`**: Centralized configuration using `requireEnv()`.
* **`app.ts`**: **(The Heart)** Global security settings (Helmet, CORS, body limits).
* **`server.ts`**: **(The Ignition Key)** Starts the engine and begins listening on the designated port.

---

## 3. Security & Authentication (JWT 2026)

We implement a **Dual-Token Architecture** with mandatory rotation:

* **Access Token:** 15 min expiration. Stored in **client memory** (JS variable).
* **Refresh Token:** 7 days expiration. Stored in **httpOnly + Secure + SameSite: Strict** cookie.
* **Rotation:** Each use generates a new refresh token. If a revoked token is reused, all user sessions are invalidated (**Theft Detection**).
* **Hashing:** Passwords use `bcryptjs` with a cost factor of $\ge 12$. Refresh tokens are stored as a **SHA-256** hash (deterministic lookup is required to detect reuse of revoked tokens). Neither is ever stored in plain text.
* **Persistence:** `app.users`, `app.refresh_tokens` and `app.token_blacklist` tables and their functions are defined in Part II §13, including the theft-detection flow.

### Security Layers (Order in `app.ts`)
1.  `trust proxy` (if behind a load balancer).
2.  `securityHeaders` (Helmet) - **NEVER** include `'unsafe-inline'`.
3.  `corsMiddleware` - Origins defined via environment variables.
4.  `rateLimiter` - Default 100 req / 15 min.
5.  `hpp()` - HTTP Parameter Pollution protection.
6.  `express.json({ limit: "10kb" })` - Body size limit (Up to 50mb allowed only for specific image/file uploads).

---

## 4. Frontend "Premium" UI/UX Standards

* **Design Tokens:** Zero hardcoded hex colors. Use `bg-primary`, `text-muted`.
* **CVA (Class Variance Authority):** Standardize component variants (e.g., `<Button variant="outline">`).
* **Micro-animations:** `active:scale-95` on clicks, `transition-all duration-150` on hovers.
* **Loading UX:**
    * **Skeletons:** Mandatory for initial data fetching to maintain visual structure.
    * **Spinners:** Reserved for AI processing or "Save" actions.
* **Responsive "Mirror" Strategy:** Complex tables switch to an optimized card list on mobile. Prefer the table component's own mobile renderer (e.g. `DataTable` `renderMobileCard`) so search, filters and pagination are shared; never re-implement them by hand for mobile.

---

## 5. Technology Choices (2026)

| Tool | Why |
| :--- | :--- |
| **Node.js 22+** | LTS, native ESM, high performance. |
| **Zod / Joi** | Strict validation (Project dependent). |
| **Pino** | Fast JSON logging (Redact sensitive fields like passwords/tokens). |
| **PostgreSQL 16+** | Relational data in schema `app`, accessed only via PL/pgSQL stored functions with positional parameters (`$1`, `$2`). |
| **Vitest** | Fast TypeScript-native testing. |

---

## 6. Naming Conventions

| Entity | Case Standard | Example |
| :--- | :--- | :--- |
| **Components / UI Files** | `PascalCase` | `RiskMatrix.tsx` |
| **Hooks / Logic / Functions** | `camelCase` | `useAuditData()`, `validateUser()` |
| **Project Root Folders** | `kebab-case` | `api-service-v1/` |
| **Database Tables** | `snake_case`, singular | `attendance_record` |
| **Database Columns** | `snake_case` | `user_id`, `created_at` |
| **Stored Functions** | `{entity}_{action}` | `document_type_get_by_id` |
| **Function Params / Vars** | `p_` / `v_` prefix | `p_id`, `v_result` |
| **JSON keys returned by DB** | `camelCase` | `createdAt` |
| **Environment Variables** | `SCREAMING_SNAKE` | `JWT_ACCESS_SECRET` |

---

## 7. Infrastructure & Deployment

* **Docker:** Multi-stage builds using `node:22-alpine`.
* **User:** Must run as a non-root user (`appuser`).
* **Shutdown:** Handle signals via `dumb-init` for a graceful shutdown.
* **Healthcheck:** Mandatory endpoint at `/health`.

---

## 8. Testing Strategy and QA (Quality Assurance)

Code quality is not optional. Every new feature must guarantee stability before reaching production through a structured testing approach.

* **Mandatory Unit Testing (Backend):** Since business logic resides exclusively within the `services/` layer, all critical services must have comprehensive unit tests using Vitest.
* **Edge Case Coverage:** Tests must not be limited to the "happy path." It is mandatory to test the system's behavior against malformed payloads, verifying that validation engines (Zod or Joi) respond with the correct error structures and do not expose internal server traces.
* **Alignment with User Stories:** Unit and integration tests must be written based directly on the acceptance criteria defined by QA or the Product Owner for each user story.

---

## 9. UI/UX Resilience and Mutation Control (Frontend)

The Frontend must act as a defensive barrier, preventing user errors, duplicate process execution, and inconsistent data leakage.

* **Strict Input Validation (The Filter):** Every text field must pass through a `.trim()` function before final validation to prevent accidental whitespaces. Unless explicitly required by context, Regex validation must be applied to block the entry of emojis, control sequences, or non-standard special characters. Explicit minimum and maximum lengths must be defined.
* **Total Mutation Lockdown (The Barrier):** When initiating an asynchronous request (e.g., `isLoading`, `isSubmitting`), disabling only the submit button is insufficient. The `disabled` or `readOnly` property must be propagated to all `inputs`, `selects`, and `textareas` within the interactive form to prevent data alterations while the request is in flight.
* **Interface and Keyboard Leak Prevention:** Keyboard submission in invalid states must be explicitly blocked. Pressing the `Enter` key within an input must not trigger the request if the form contains errors or if the overall mutation state is locked.
* **Visual Stability (Zero Layout Shift):** Validation error messages beneath inputs must be rendered in containers with reserved spaces and minimum heights. The appearance of an error must not push other elements or break the visual structure of the screen.
* **Guaranteed State Release:** Every asynchronous mutation block must always use a `finally` block to turn off spinners and re-enable the interface, ensuring the system does not remain permanently locked due to a network failure or server rejection.

---

## 10. Logical Security, Architecture, and Database (Backend)

Enterprise data integrity is non-negotiable. The database and core logic must be designed to reject destructive or inconsistent operations. Implementation details for every rule below are in **Part II**.

* **Responsibility Boundary (DB vs. Services):** Stored functions own *data access and structural integrity*: CRUD, joins, JSON serialization, `UPPER(TRIM())` normalization, unique constraints, reactivation of soft-deleted rows, identity resolution and header + detail persistence in one transaction, audit logs and massive aggregations. The `services/` layer owns *business meaning*: state machines, ISO 27001 calculations, role permissions and dependency checks. A stored function must never decide a workflow state or a business rule (Part II §1).
* **Physical Deletion and Dependency Lockdown (Soft Deletes):** Physical deletion (Hard Delete) is strictly prohibited. Soft delete is implemented **only** with the `deleted_at timestamptz` column (`NULL` = active); every function filters `WHERE deleted_at IS NULL`. `is_active` is a separate business flag (e.g., a suspended user) and must never be used to represent deletion. Before calling any `*_delete_by_id`, the `services/` layer must verify that no active linked records exist and abort if they do (Part II §3, §7.5).
* **Unbreakable State Machines:** Multi-stage entity workflows (such as Position documents) must be absolute at the Backend level. Entities must mandatorily initialize in their defined base state (e.g., `Draft`), including when created through bulk-ingestion functions. The `services/` layer must block any attempt to directly transition to advanced states (like "In Revision") that seeks to bypass intermediate step requirements.
* **Absolute Parameterization (SQL):** All entries in `queries/` are calls to stored functions using exclusively positional parameters (`$1`, `$2`). String concatenation or Template Literals to inject variables into SQL are strictly forbidden, both in Node.js and inside PL/pgSQL (no dynamic `EXECUTE` with concatenated input).
* **Standard Table Contract:** Every domain table has `id uuid` (`gen_random_uuid()`), `created_at`, `updated_at` (`NULL` on creation) and `deleted_at`, all `timestamptz`. Natural keys are enforced with unique indexes, which also drive `ON CONFLICT` upserts (Part II §2, §7.4).
* **Standard Response Envelope:** Every stored function returns `jsonb` with `status` (`success` / `not_found` / `error`), `data`, and optionally `count` or `message`. Lists are never `null` (`[]`). The only documented exception are the auth utility functions (Part II §13.4). Database error messages (`SQLERRM`) are logged with Pino and never returned to the HTTP client.
* **Data Integrity in JSONB:** When using `jsonb` columns for dynamic storage, every incoming payload must be rigorously structured and validated using defined schemas (Joi for Barnard-SGSI / Zod for others) before insertion into the database to prevent structural injections.
* **Least-Privilege DB Access:** All functions are `SECURITY DEFINER` with a fixed `SET search_path = app, pg_temp`. The application's database user has `EXECUTE` permission on `app` functions only, with no direct `SELECT/INSERT/UPDATE/DELETE` on tables.
* **Nil UUID Convention for "No aplica" (Barnard-SGSI):** To differentiate between the unconfigured/empty state (`NULL` in the `uuid` column, displayed as "Sin cargo supervisor") and the explicit "No aplica" state (cargos that report to no one by design, e.g., CEO) without modifying the database schema or the Joi backend validation, we use the Nil UUID (`00000000-0000-0000-0000-000000000000`) as a reserved value. An empty string `""` is never stored (a `uuid` column cannot hold it); if the frontend sends `""`, the backend converts it to `NULL` before calling the model. Because the Nil UUID is not a real row, columns that may hold it must **not** have a FK constraint to the referenced table (or must be validated in `services/` instead). All position visualizations (Org Chart, Position Profile, Staff Assignment) must parse this UUID as "No aplica" instead of querying a real database entity.

**Standard strictly for Production Environments.**

---

# PARTE II — Referencia Técnica: Base de Datos (PostgreSQL)

> **Stack:** PostgreSQL 16+ · Schema `app` · Stored Functions en PL/pgSQL · Soft Delete (`deleted_at`)
> **Propósito:** Guía definitiva de la capa de base de datos. Explica las convenciones, patrones adoptados y cómo agregar nuevas entidades.
> **Relación con la Parte I:** esta parte desarrolla en detalle las reglas resumidas en la sección 10 de la Parte I. Si alguna vez ambas partes parecen contradecirse, prevalece la frontera de responsabilidades definida en la sección 1 de esta parte ("Qué vive en la BD y qué vive en `services/`").

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Schema y Convenciones de Tablas](#2-schema-y-convenciones-de-tablas)
3. [Soft Delete](#3-soft-delete)
4. [Patrón Opcional: Entidades de Rol Compartidas](#4-patrón-opcional-entidades-de-rol-compartidas)
5. [Stored Functions — Convenciones](#5-stored-functions--convenciones)
6. [Formato de Respuesta JSONB](#6-formato-de-respuesta-jsonb)
7. [Patrones de Funciones](#7-patrones-de-funciones)
   - 7.1 [get\_all](#71-get_all)
   - 7.2 [get\_by\_id](#72-get_by_id)
   - 7.3 [get\_by\_fields (filtros opcionales)](#73-get_by_fields-filtros-opcionales)
   - 7.4 [upsert (INSERT ON CONFLICT)](#74-upsert-insert-on-conflict)
   - 7.5 [delete\_by\_id (soft delete)](#75-delete_by_id-soft-delete)
   - 7.6 [build\_\* (funciones auxiliares de construcción)](#76-build_-funciones-auxiliares-de-construcción)
8. [Funciones de Relaciones Many-to-Many](#8-funciones-de-relaciones-many-to-many)
9. [Funciones con Documentos Anidados (header + details)](#9-funciones-con-documentos-anidados-header--details)
10. [Funciones de Alto Nivel (from\_document)](#10-funciones-de-alto-nivel-from_document)
11. [Normalización de Datos de Entrada](#11-normalización-de-datos-de-entrada)
12. [Llamada a Funciones desde el Backend](#12-llamada-a-funciones-desde-el-backend)
13. [Tablas y Funciones de Autenticación](#13-tablas-y-funciones-de-autenticación)
14. [Cómo Agregar una Nueva Entidad](#14-cómo-agregar-una-nueva-entidad)

---

## 1. Visión General

Toda la lógica de acceso a datos reside en **stored functions PL/pgSQL** dentro del schema `app`. El backend nunca escribe SQL ad-hoc; siempre invoca una función del schema.

```
Backend (Model) → SELECT app.entity_action(...) → Stored Function → Tabla(s)
```

Este diseño centraliza la **lógica de acceso a datos** (integridad, normalización, joins, serialización a JSON, resolución de identidad) en la BD, simplifica el backend y permite reutilizar lógica entre distintos consumidores.

### Qué vive en la BD y qué vive en `services/`

Esta frontera es obligatoria y aplica a todas las secciones siguientes:

| Responsabilidad | Dónde vive | Ejemplos |
|---|---|---|
| Acceso a datos y serialización | Stored function (`app.*`) | `get_all`, `get_by_id`, joins, mapeo `snake_case` → `camelCase` |
| Integridad estructural | Stored function / constraints | Índices únicos, `CHECK`, FKs, normalización `UPPER(TRIM())`, reactivación de soft-deleted |
| Orquestación de **datos** (resolver identidad, cabecera + detalle en una transacción) | Stored function | Patrón C de upsert, `from_source`, header + details |
| Auditoría y agregaciones masivas | Stored function / trigger | Logs de auditoría, totales de reportes |
| **Reglas de negocio** | `services/` (Node.js) | Máquinas de estado (`Draft` → `In Revision`), cálculos ISO 27001, permisos por rol |
| **Validación de dependencias antes de borrar** | `services/` (Node.js) | Abortar el soft delete si existen registros vinculados activos |
| **Validación de payloads** (incluido JSONB) | `schemas/` (Joi en Barnard-SGSI / Zod en el resto) | Antes de llamar al model |

Regla práctica: si la decisión depende del **significado de negocio** de los datos (estado, rol, normativa), va en `services/`. Si depende solo de su **forma o integridad**, va en la función de BD.

> 💡 **¿Qué es una stored function (función almacenada)?**
> Es un bloque de código SQL/PL-pgSQL que se guarda *dentro* de la base de datos (no en el backend) y se ejecuta cuando algo la invoca con `SELECT app.nombre_funcion(...)`. La diferencia con escribir SQL directamente en el backend es que la lógica vive en un solo lugar, versionado junto al schema, y cualquier aplicación que se conecte a esa BD puede reutilizarla sin duplicar código. En este proyecto, *todo* el acceso a datos pasa por funciones — nunca se ejecuta un `SELECT * FROM tabla` directo desde el backend.
>
> 💡 **¿Qué es PL/pgSQL?**
> Es el lenguaje procedural de PostgreSQL (similar en espíritu a un lenguaje de programación: tiene variables, `IF`, loops, manejo de errores) que permite escribir lógica más compleja que un simple `SELECT`. Se usa dentro de las stored functions cuando se necesita más que una sola consulta — por ejemplo, validar algo antes de insertar, o encadenar varias operaciones.
>
> 💡 **¿Qué es un schema?**
> Un schema es como una "carpeta" dentro de la base de datos que agrupa tablas y funciones relacionadas. `app` es el nombre del schema usado en este proyecto; todas las tablas y funciones se referencian con el prefijo `app.` (ej. `app.users`, `app.entity_get_all()`). Sirve para organizar y evitar colisiones de nombres, especialmente si la misma BD tiene otros schemas (ej. `public`, `audit`).

---

## 2. Schema y Convenciones de Tablas

Todas las tablas viven en el schema `app`.

**Columnas estándar de toda tabla:**

| Columna      | Tipo        | Descripción                                      |
|--------------|-------------|--------------------------------------------------|
| `id`         | `uuid`      | PK, generado con `gen_random_uuid()`             |
| `created_at` | `timestamptz` | Fecha de creación, default `now()`               |
| `updated_at` | `timestamptz` | Fecha de última modificación, `NULL` al crear    |
| `deleted_at` | `timestamptz` | Fecha de borrado lógico; `NULL` = registro activo|

> **Tipo de fecha unificado:** todas las tablas (dominio y autenticación) usan `timestamptz` (timestamp con zona horaria). Evita desfases cuando el servidor, la BD y los usuarios están en zonas horarias distintas (p. ej. `America/Santiago` con cambio de horario).

> 💡 **¿Qué es una PK (Primary Key / clave primaria)?**
> Es la columna (o combinación de columnas) que identifica de forma única a cada fila de una tabla. No puede repetirse ni estar vacía. Aquí, toda tabla usa `id` como PK.
>
> 💡 **¿Qué es un UUID?**
> Es un identificador único de 128 bits (se ve como `a1b2c3d4-...`) generado de forma prácticamente irrepetible sin necesidad de coordinación central. Se usa en vez de un número autoincremental (`1, 2, 3...`) porque permite generar el ID *antes* de insertar (útil cuando el backend necesita conocer el ID de antemano) y porque no revela información sobre cuántos registros existen ni el orden de creación. `gen_random_uuid()` es la función de PostgreSQL que genera uno nuevo cada vez que se llama.
>
> 💡 **¿Qué es un timestamp?**
> Es un tipo de dato que almacena fecha y hora. Se usa para registrar *cuándo* ocurrió algo (creación, última modificación, borrado lógico). Que una columna timestamp sea `NULL` aquí tiene un significado especial: por ejemplo, `updated_at = NULL` significa "nunca se ha modificado desde que se creó", y `deleted_at = NULL` significa "el registro está activo" (ver sección 3).

**Índices únicos:** se definen sobre los campos que identifican naturalmente al registro (e.g., un código o identificador externo único, o una combinación de FKs + período para entidades que representan un registro recurrente en el tiempo).

> 💡 **¿Qué es un índice (y un índice único)?**
> Un índice es una estructura auxiliar que PostgreSQL mantiene para encontrar filas rápidamente sin tener que recorrer toda la tabla — es similar al índice de un libro: en vez de leer página por página, saltas directo a donde está lo que buscas. Un **índice único** además impone una regla: no pueden existir dos filas con el mismo valor (o misma combinación de valores) en esas columnas. Por ejemplo, un índice único sobre `email` garantiza que nunca habrá dos usuarios con el mismo correo. Esta misma propiedad es la que después usa `ON CONFLICT` en los upserts (ver sección 7.4) para decidir si insertar o actualizar.
>
> 💡 **¿Qué es un FK (Foreign Key / clave foránea)?**
> Es una columna que referencia el `id` de otra tabla, estableciendo una relación entre ambas. Por ejemplo, si la tabla `order` tiene una columna `customer_id` que apunta a `customer.id`, decimos que `customer_id` es un FK. Esto es lo que permite "conectar" tablas entre sí y hacer `JOIN` (ver sección 7.3) para traer datos relacionados en una sola consulta.

**Naming:**
- Tablas: `snake_case` en singular (`attendance_record`, `employment_contract`)
  - *Excepción heredada:* las tablas de autenticación de la sección 13 (`users`, `refresh_tokens`, `token_blacklist`) se mantienen en plural por compatibilidad con la migración base. Toda tabla nueva va en singular.
- Columnas: `snake_case`
- Funciones: `{entidad}_{acción}` (`entity_get_all`, `entity_upsert`)
- Booleanos de estado: `is_` + adjetivo (`is_active`). **No** se usan para representar borrado (ver sección 3).

---

## 3. Soft Delete

**Nunca se hacen DELETE físicos.** El borrado lógico se implementa seteando `deleted_at = now()`.

Todas las queries filtran `WHERE deleted_at IS NULL` para considerar sólo registros activos. Las funciones de upsert también resetean `deleted_at = NULL` al reactivar un registro previamente eliminado.

> 💡 **¿Qué es soft delete (borrado lógico) y por qué no se usa DELETE?**
> Un `DELETE` físico (`DELETE FROM tabla WHERE id = ...`) elimina la fila para siempre — no hay vuelta atrás, y cualquier otra tabla que tenga un FK apuntando a esa fila queda rota o bloqueada. El **soft delete** en cambio no borra nada: solo marca la fila como "eliminada" rellenando la columna `deleted_at` con la fecha/hora actual. El registro sigue físicamente en la tabla, pero todas las consultas lo ignoran filtrando `WHERE deleted_at IS NULL`.
>
> Ventajas de este enfoque: se puede "deshacer" un borrado (reactivando con `deleted_at = NULL`), se mantiene el historial completo para auditoría, y no se rompen las relaciones con otras tablas. La desventaja es que el desarrollador debe **recordar siempre** agregar `AND deleted_at IS NULL` en cada consulta — si se olvida, aparecerán registros que deberían estar "borrados". Por eso en este proyecto esa condición está encapsulada dentro de las stored functions, para que nadie tenga que acordarse de ponerla manualmente cada vez.

```sql
-- Borrar (soft delete)
UPDATE app.entity SET deleted_at = now() WHERE id = p_id AND deleted_at IS NULL;

-- Reactivar (dentro de un upsert ON CONFLICT)
DO UPDATE SET updated_at = now(), deleted_at = NULL;
```

**`deleted_at` vs `is_active`:** son conceptos distintos y no se intercambian.
- `deleted_at` = el registro fue **eliminado** (no aparece en ninguna consulta). Es el único mecanismo de borrado.
- `is_active` = el registro **existe y es visible**, pero está deshabilitado por una decisión de negocio (p. ej. un usuario suspendido en `app.users`). Solo se agrega cuando el dominio lo necesita.

**Validación de dependencias (obligatoria):** la función `delete_by_id` solo ejecuta el borrado lógico. Antes de invocarla, el `service` debe verificar que no existan registros activos vinculados (consultando las funciones `get_by_fields` de las entidades hijas) y abortar con un error de negocio si los hay. Opcionalmente, la entidad puede exponer una función de lectura `app.entity_count_dependencies(p_id uuid) → jsonb` para que esa verificación sea una sola llamada; la decisión de abortar sigue siendo del `service`.

---

## 4. Patrón Opcional: Entidades de Rol Compartidas

> Esta sección describe un **patrón**, no una regla obligatoria. Aplica solo si tu dominio tiene el problema que resuelve; si no, se omite por completo.

Es común que una misma entidad base (e.g., una organización, una persona, un producto) cumpla **distintos roles** según el contexto, y que esos roles tengan sus propias relaciones y reglas. En vez de duplicar la tabla base por cada rol, se modela como:

```
base_entity ←── role_a   (rol 1 sobre la entidad base)
base_entity ←── role_b   (rol 2 sobre la entidad base)
```

> 💡 **¿Qué es una relación 1:1 (uno a uno)?**
> Significa que cada fila de la tabla A corresponde a, como máximo, una fila de la tabla B (y viceversa). En este patrón, cada `organization` tiene a lo sumo un registro en `role_a`. Se garantiza con un índice único sobre la columna FK (ej. `organization_id`), como se ve más abajo.

Ejemplo abstracto: una tabla `organization` (datos comunes: nombre, identificador fiscal, dirección) y dos tablas de rol, `role_a` y `role_b`, cada una con un FK 1:1 a `organization`. Una misma organización puede tener ambos roles simultáneamente.

```sql
CREATE TABLE app.organization (
    id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_id varchar NULL,
    name varchar NULL,
    -- columnas estándar (created_at, updated_at, deleted_at)
);
CREATE UNIQUE INDEX organization_idx ON app.organization USING btree (tax_id);

CREATE TABLE app.role_a (
    id              uuid NOT NULL,
    organization_id uuid NULL,
    -- columnas estándar
);
CREATE UNIQUE INDEX role_a_idx ON app.role_a USING btree (organization_id);
```

**Relaciones N:M entre roles:** cuando dos roles se relacionan entre sí (e.g., `role_a` trabaja con múltiples `role_b` y viceversa), se modela con una tabla de junction estándar (ver sección 8), nunca con FKs directos en las tablas de rol.

**Upsert en dos pasos (entidad base + rol):** ver sección 7.4, patrón C. El upsert del rol siempre delega primero en el upsert de la entidad base, y luego crea/reactiva el registro de rol asociado.

**Cuándo usar este patrón:**
- La entidad base tiene datos que se repetirían si se duplicara por rol (evita inconsistencia de datos).
- Los roles tienen atributos y relaciones propias que no aplican a la entidad base en general.
- Una misma entidad base puede necesitar más de un rol simultáneamente.

**Cuándo NO usar este patrón:**
- Si cada "rol" es en realidad una entidad completamente distinta sin atributos compartidos — ahí van tablas independientes sin esta indirección.
- Si solo existe un rol posible por entidad base — un FK simple o un campo `type` alcanza, sin necesidad de tablas de rol separadas.

---

## 5. Stored Functions — Convenciones

- **Lenguaje:** `plpgsql` (con `DECLARE`/`BEGIN`/`EXCEPTION`) para mutaciones; puede usarse `SQL STABLE` solo para funciones de lectura pura sin lógica condicional.
- **Security:** todas las funciones se declaran `SECURITY DEFINER`, ejecutándose con los permisos del owner, y **siempre** fijan `SET search_path = app, pg_temp`. Sin esto, quien llama podría crear en otro schema una tabla u operador con el mismo nombre y hacer que la función, con permisos de owner, lo use en lugar del original.
- **Retorno:** siempre `RETURNS jsonb`. Nunca `SETOF` ni `TABLE`.
- **Parámetros:** con prefijo `p_` (`p_id`, `p_period`). Variables locales con prefijo `v_` (`v_id`, `v_result`).
- **Manejo de errores:** bloque `EXCEPTION WHEN OTHERS THEN` en todas las funciones mutables. Las funciones de lectura también lo incluyen por consistencia.

> 💡 **¿Qué es `STABLE`?**
> Es una "promesa" que se le hace a PostgreSQL: esta función no modifica datos, y si se llama varias veces con los mismos parámetros dentro de la misma consulta, siempre devuelve el mismo resultado. Esto le permite al motor optimizar mejor (por ejemplo, evitar recalcular lo mismo dos veces). Se usa en funciones de **solo lectura** (`get_all`, `get_by_id`). Las funciones que insertan, actualizan o eliminan datos **no** deben marcarse `STABLE`, porque sí modifican el estado de la BD.
>
> 💡 **¿Qué es `SECURITY DEFINER`?**
> Por defecto, una función se ejecuta con los permisos de quien la *llama*. `SECURITY DEFINER` cambia eso: la función se ejecuta con los permisos de quien la *creó* (el "owner" de la función). Esto es útil porque permite que el backend se conecte con un usuario de BD con permisos limitados (que no puede leer las tablas directamente), y aun así pueda ejecutar estas funciones, que internamente sí tienen los permisos necesarios. Es un patrón de seguridad: se cierra el acceso directo a las tablas y se abre solo a través de funciones controladas. La contraparte (`SECURITY INVOKER`, que es el default) sería usar los permisos de quien llama.
>
> 💡 **¿Qué es `RETURNS jsonb` (vs `JSON`, `SETOF`, `TABLE`)?**
> `jsonb` es el tipo de dato de PostgreSQL para almacenar y devolver JSON. Existe también `json` (texto JSON sin procesar) y `jsonb` (JSON ya parseado a un formato binario interno, más eficiente para consultar y manipular, aunque ligeramente más lento de escribir). Aquí se prefiere `jsonb` porque permite, por ejemplo, navegar el resultado con operadores como `->>'status'` desde el propio SQL. `SETOF` y `TABLE` son otras formas de hacer que una función devuelva múltiples filas "como si fuera una tabla", pero ese formato es más difícil de consumir desde un backend que espera un objeto JSON con la estructura `{ status, data }` descrita en la sección 6 — por eso aquí se evitan y todo se empaqueta como un único valor `jsonb`.
>
> 💡 **¿Qué es el bloque `EXCEPTION WHEN OTHERS`?**
> Es el manejo de errores de PL/pgSQL — equivalente a un `try/catch` en JavaScript o Python. Si cualquier instrucción dentro del `BEGIN...END` falla (una restricción violada, un tipo de dato inválido, etc.), en vez de que la función "explote" y la conexión arroje un error crudo de PostgreSQL al backend, este bloque lo captura y retorna una respuesta controlada (`{ status: 'error', message: ... }`). `SQLERRM` es una variable especial que contiene el mensaje de error que generó PostgreSQL internamente.

```sql
CREATE OR REPLACE FUNCTION app.entity_action(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER   -- STABLE solo para lecturas puras
SET search_path = app, pg_temp
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    -- lógica aquí
    RETURN jsonb_build_object('status', 'success', 'data', v_result);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'data', NULL, 'message', SQLERRM);
END;
$function$;
```

---

## 6. Formato de Respuesta JSONB

Todas las funciones retornan un objeto JSONB con estructura estándar:

> 💡 **¿Qué es `jsonb_build_object`?**
> Es una función de PostgreSQL que construye un objeto JSON directamente desde SQL, recibiendo pares clave-valor: `jsonb_build_object('status', 'success', 'data', algo)` produce `{"status": "success", "data": algo}`. Es la pieza central de todas las funciones de este proyecto, ya que permite armar la respuesta JSON sin salir de SQL.

**Éxito — registro único:**
```json
{
  "status": "success",
  "data": { "id": "...", "name": "...", "createdAt": "..." }
}
```

**Éxito — lista:**
```json
{
  "status": "success",
  "data": [ {...}, {...} ],
  "count": 2
}
```

**No encontrado:**
```json
{
  "status": "not_found",
  "data": null,
  "message": "No active entity found with id: ..."
}
```

**Error:**
```json
{
  "status": "error",
  "data": null,
  "message": "descripción del error de PostgreSQL"
}
```

**Regla del backend:** leer siempre el campo `status` antes de usar `data`. Si `status !== 'success'`, propagar el error apropiadamente.

**Claves en camelCase:** las funciones mapean siempre `snake_case` de BD a `camelCase` en el JSON (`created_at` → `"createdAt"`, `business_name` → `"businessName"`).

> 💡 **¿Por qué `snake_case` en la BD pero `camelCase` en el JSON?**
> Son simplemente convenciones de nombres distintas para mundos distintos: `snake_case` (palabras separadas por guion bajo, todo minúscula) es la convención habitual en SQL/PostgreSQL; `camelCase` (sin separadores, cada palabra nueva empieza en mayúscula) es la convención habitual en JavaScript/TypeScript. Como el JSON que devuelven las funciones lo consume directamente el backend en TypeScript, se traduce el nombre de cada columna en el momento de construir el JSON (`'createdAt', t.created_at`) para que el objeto ya llegue con el formato que espera el código del backend, sin necesidad de una capa de transformación adicional.

---

## 7. Patrones de Funciones

### 7.1 `get_all`

Retorna todos los registros activos, ordenados. Nunca requiere parámetros. Siempre devuelve `[]` (array vacío) cuando no hay datos, nunca `null`.

> 💡 **¿Qué es `COALESCE`?**
> Es una función que recibe varios valores y devuelve el primero que **no** sea `NULL`. Aquí se usa como red de seguridad: `jsonb_agg(...)` (la función que junta varias filas en un array JSON) devuelve `NULL` si no hay ninguna fila, lo cual sería confuso para el backend (¿es un error, o simplemente no hay datos?). `COALESCE(jsonb_agg(...), '[]'::JSONB)` dice "si el resultado es NULL, usa un array vacío en su lugar" — así el backend siempre recibe un array, nunca `null`, sin importar si hay 0 o 1000 registros.
>
> 💡 **¿Qué es `COUNT(*)`?**
> Cuenta cuántas filas cumplieron la condición del `WHERE`. Se incluye junto a los datos para que el backend sepa el total sin tener que contar el array él mismo (útil sobre todo cuando en el futuro se agregue paginación).

```sql
CREATE OR REPLACE FUNCTION app.entity_get_all()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = app, pg_temp
AS $function$
DECLARE
    v_data  JSONB;
    v_count INTEGER;
BEGIN
    SELECT
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',        t.id,
                'name',      t.name,
                'createdAt', t.created_at,
                'updatedAt', t.updated_at
            )
        ORDER BY t.name ASC NULLS LAST
        ), '[]'::JSONB),
        COUNT(*)::INTEGER
    INTO v_data, v_count
    FROM app.entity t
    WHERE t.deleted_at IS NULL;

    RETURN jsonb_build_object('status', 'success', 'data', v_data, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'data', NULL, 'message', SQLERRM);
END;
$function$;
```

### 7.2 `get_by_id`

Busca un registro por PK. Si no existe o está eliminado, retorna `not_found`.

```sql
CREATE OR REPLACE FUNCTION app.entity_get_by_id(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = app, pg_temp
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',        t.id,
        'name',      t.name,
        'createdAt', t.created_at,
        'updatedAt', t.updated_at
    )
    INTO v_result
    FROM app.entity t
    WHERE t.id = p_id AND t.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object(
            'status',  'not_found',
            'data',    NULL,
            'message', FORMAT('No active entity found with id: %s', p_id)
        );
    END IF;

    RETURN jsonb_build_object('status', 'success', 'data', v_result);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'data', NULL, 'message', SQLERRM);
END;
$function$;
```

### 7.3 `get_by_fields` (filtros opcionales)

Para entidades con múltiples filtros opcionales (típicamente reportes o listados acotados por contexto). **Requiere al menos un filtro** para evitar full-table scans sin límite. Cuando el parámetro es `NULL`, el filtro se omite dinámicamente.

> 💡 **¿Qué es un `JOIN`?**
> Es la operación que combina filas de dos (o más) tablas relacionadas mediante sus FKs, en una sola consulta. Por ejemplo, `FROM entity e LEFT JOIN category c ON c.id = e.category_id` dice: "para cada fila de `entity`, busca la fila correspondiente en `category` (donde el id coincida) y trae sus columnas también". El tipo `INNER JOIN` solo incluye filas que tienen coincidencia en ambas tablas; `LEFT JOIN` incluye todas las filas de la tabla izquierda aunque no haya coincidencia en la derecha (en ese caso, las columnas de la derecha vienen en `NULL`).
>
> 💡 **¿Qué es un "filtro dinámico" (`IS NULL OR campo = valor`)?**
> Es una técnica para que una sola función soporte combinaciones flexibles de filtros sin tener que escribir una función distinta por cada combinación posible. La condición `(p_owner_id IS NULL OR e.owner_id = p_owner_id)` se lee como: "si no me pasaron `p_owner_id`, ignora este filtro (deja pasar todas las filas); si sí me lo pasaron, exige que coincida". Al combinar varias de estas condiciones con `AND`, cada parámetro `NULL` simplemente "desaparece" de la búsqueda, y solo los parámetros con valor real restringen el resultado. Por eso casi siempre se exige al menos un filtro no nulo: si todos fueran `NULL`, la condición completa sería siempre verdadera y la consulta devolvería toda la tabla sin límite.

```sql
CREATE OR REPLACE FUNCTION app.entity_get_by_fields(
    p_owner_id   uuid DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_status     varchar DEFAULT NULL,
    p_period     varchar DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = app, pg_temp
AS $function$
DECLARE
    v_data  JSONB;
    v_count INTEGER;
BEGIN
    -- Guard: al menos un filtro requerido
    IF p_owner_id IS NULL AND p_category_id IS NULL
       AND p_status IS NULL AND p_period IS NULL THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'data',    NULL,
            'message', 'At least one filter parameter must be provided.'
        );
    END IF;

    SELECT
        COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'period') DESC NULLS LAST), '[]'::JSONB),
        COUNT(*)::INTEGER
    INTO v_data, v_count
    FROM (
        SELECT jsonb_build_object(
            'id',       e.id,
            'period',   e.period,
            'status',   e.status,
            -- joins anidados aquí, si la entidad referencia otras tablas...
            'category', jsonb_build_object('id', c.id, 'name', c.name)
        ) AS row_data
        FROM app.entity e
        LEFT JOIN app.category c ON c.id = e.category_id
        WHERE e.deleted_at IS NULL
          AND (p_owner_id    IS NULL OR e.owner_id    = p_owner_id)
          AND (p_category_id IS NULL OR e.category_id = p_category_id)
          AND (p_status      IS NULL OR e.status      = p_status)
          AND (p_period      IS NULL OR e.period      = p_period)
    ) sub;

    RETURN jsonb_build_object('status', 'success', 'data', v_data, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'data', NULL, 'message', SQLERRM);
END;
$function$;
```

**Filtros de rango de fechas:** para entidades con `start_date`/`end_date`, se usa overlap:
```sql
AND (p_from IS NULL OR e.end_date   >= p_from)
AND (p_to   IS NULL OR e.start_date <= p_to)
```

### 7.4 `upsert` (INSERT ON CONFLICT)

Patrón central: un solo endpoint que crea o actualiza. La clave única del índice determina cuándo hay conflicto.

> 💡 **¿Qué es un "upsert" y qué es `ON CONFLICT`?**
> "Upsert" es la combinación de "update" + "insert": una sola operación que inserta una fila nueva si no existe, o la actualiza si ya existe — sin que quien llama tenga que averiguar primero cuál de los dos casos aplica. PostgreSQL lo implementa con la cláusula `ON CONFLICT`: se intenta hacer un `INSERT` normal, y *si* eso choca contra un índice único o una PK ya existente (un "conflicto"), en vez de fallar con un error, se ejecuta la alternativa indicada (`DO UPDATE SET ...` para actualizar, o `DO NOTHING` para simplemente ignorar el conflicto sin hacer nada). Esto es justamente por lo que en la sección 2 se insiste tanto en los índices únicos: son los que definen *qué* combinación de columnas dispara el "conflicto" que activa el `ON CONFLICT`.
>
> 💡 **¿Qué es `EXCLUDED`?**
> Dentro de un `ON CONFLICT DO UPDATE`, `EXCLUDED` es una palabra especial que representa "los valores que se intentaron insertar" (la fila que causó el conflicto). Por ejemplo, `SET name = EXCLUDED.name` significa "actualiza la columna `name` con el valor nuevo que se quiso insertar", en vez de dejar el valor viejo que ya estaba en la tabla.

**Patrón A — clave simple (e.g., `name`):**
```sql
-- p_id NULL = crear; p_id presente = actualizar
CREATE OR REPLACE FUNCTION app.entity_upsert(p_name varchar, p_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_temp
AS $function$
DECLARE v_id UUID;
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO app.entity (id, name, created_at)
        VALUES (gen_random_uuid(), UPPER(TRIM(p_name)), now())
        RETURNING id INTO v_id;
    ELSE
        UPDATE app.entity
        SET name = UPPER(TRIM(p_name)), updated_at = now(), deleted_at = NULL
        WHERE id = p_id AND deleted_at IS NULL
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RETURN jsonb_build_object('status', 'not_found', 'data', NULL,
                'message', FORMAT('No active entity found with id: %s', p_id));
        END IF;
    END IF;

    RETURN app.entity_get_by_id(v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'data', NULL, 'message', SQLERRM);
END;
$function$;
```

**Patrón B — upsert por clave compuesta:**

Cuando el índice único de la tabla combina varias columnas (e.g., múltiples FKs + un campo de período o fecha), el `ON CONFLICT` se declara sobre esa combinación:

```sql
INSERT INTO app.entity (...) VALUES (...)
ON CONFLICT (owner_id, category_id, period)
DO UPDATE SET
    field_a    = EXCLUDED.field_a,
    updated_at = now(),
    deleted_at = NULL       -- reactiva si estaba soft-deleted
RETURNING id INTO v_id;
```

**Patrón C — upsert en dos pasos (entidad compuesta):**
Cuando la entidad depende de otra (e.g., una tabla `child` referencia a una tabla `parent` mediante un FK 1:1, como en el patrón de roles de la sección 4), el upsert llama primero al upsert del padre:

```sql
-- Paso 1: upsert del padre
v_parent_result := app.parent_upsert(...);
IF v_parent_result->>'status' <> 'success' THEN
    RETURN v_parent_result;  -- propagar error
END IF;
v_parent_id := (v_parent_result->'data'->>'id')::UUID;

-- Paso 2: upsert del hijo usando el parent_id
INSERT INTO app.child (id, parent_id, ...) VALUES (gen_random_uuid(), v_parent_id, ...)
ON CONFLICT (parent_id) DO UPDATE SET updated_at = now(), deleted_at = NULL
RETURNING id INTO v_id;
```

### 7.5 `delete_by_id` (soft delete)

Setea `deleted_at = now()`. Si ninguna fila fue afectada (`v_affected = 0`), retorna `not_found`. En caso de éxito retorna la lista actualizada (`get_all`).

> ⚠️ Esta función **no** valida dependencias: eso es responsabilidad del `service` antes de llamarla (ver sección 3).

```sql
CREATE OR REPLACE FUNCTION app.entity_delete_by_id(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_temp
AS $function$
DECLARE v_affected INTEGER;
BEGIN
    UPDATE app.entity
    SET deleted_at = now()
    WHERE id = p_id AND deleted_at IS NULL;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        RETURN jsonb_build_object(
            'status',  'not_found',
            'data',    NULL,
            'message', FORMAT('No active entity found with id: %s', p_id)
        );
    END IF;

    RETURN app.entity_get_all();

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'data', NULL, 'message', SQLERRM);
END;
$function$;
```

### 7.6 `build_*` (funciones auxiliares de construcción)

Se usan cuando la lógica de serialización de una entidad se reutiliza en múltiples funciones. En vez de duplicar el `SELECT jsonb_build_object(...)`, se extrae a una función auxiliar privada.

```sql
-- Función auxiliar: construye el objeto JSON de una entidad por id
CREATE OR REPLACE FUNCTION app.build_entity_row(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = app, pg_temp
AS $function$
DECLARE v_result JSONB;
BEGIN
    SELECT jsonb_build_object('id', e.id, ...)
    INTO v_result
    FROM app.entity e
    -- joins necesarios
    WHERE e.id = p_id AND e.deleted_at IS NULL;

    RETURN v_result;  -- puede retornar NULL; quien llama debe verificar
END;
$function$;

-- Las funciones públicas delegan en la auxiliar
CREATE OR REPLACE FUNCTION app.entity_get_by_id(p_id uuid)
RETURNS jsonb ...
AS $function$
DECLARE v_result JSONB;
BEGIN
    v_result := app.build_entity_row(p_id);

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('status', 'not_found', ...);
    END IF;

    RETURN jsonb_build_object('status', 'success', 'data', v_result);
END;
$function$;
```

---

## 8. Funciones de Relaciones Many-to-Many

Las tablas de junction (ver patrón de la sección 4) tienen sus propias funciones de upsert y remove, que trabajan exclusivamente con los IDs de las entidades relacionadas.

```sql
-- Upsert (agregar relación o reactivar si estaba eliminada)
app.entity_a_entity_b_upsert(p_entity_a_id uuid, p_entity_b_id uuid) → jsonb

-- Remove (soft delete de la relación)
app.entity_a_entity_b_remove(p_entity_a_id uuid, p_entity_b_id uuid) → jsonb
```

Es común que una función de upsert de alto nivel (sección 10) llame automáticamente a esta función de relación como efecto secundario, manteniendo la tabla de junction actualizada sin intervención explícita del backend.

---

## 9. Funciones con Documentos Anidados (header + details)

Algunas entidades tienen una cabecera y líneas de detalle (e.g., una orden y sus líneas de producto, un formulario y sus filas). El patrón es:

> 💡 **¿Qué es una relación 1:N (uno a muchos) y por qué aquí se usan dos tablas?**
> A diferencia de la relación 1:1 (sección 4), aquí una sola fila "cabecera" (ej. una orden) puede tener *muchas* filas "detalle" asociadas (ej. varias líneas de producto). Por eso son dos tablas distintas: la cabecera (`entity`) y el detalle (`entity_detail`), donde cada fila de detalle tiene un FK apuntando a su cabecera (`entity_id`). No hay índice único sobre ese FK porque, a propósito, se permite que existan múltiples filas de detalle por cada cabecera.
>
> 💡 **¿Qué es un loop `FOR ... IN ... LOOP` y `jsonb_array_elements`?**
> Es un bucle de PL/pgSQL: repite el bloque de código una vez por cada elemento que recorre. `jsonb_array_elements(p_details)` toma un array JSON (ej. `[{...}, {...}, {...}]`) y lo "descompone" en filas individuales, una por cada objeto del array, para poder iterarlas con el `FOR`. Esto es lo que permite recibir todas las líneas de detalle como un solo parámetro JSON desde el backend, e insertarlas una por una dentro de la función.

**Upsert:**
1. Insertar/actualizar la cabecera con `ON CONFLICT` por clave única.
2. Soft-delete de todas las líneas previas.
3. Insertar las nuevas líneas del array `p_details: jsonb`.
4. Retornar el documento completo.

```sql
-- Soft-delete de líneas previas
UPDATE app.entity_detail SET deleted_at = now()
WHERE entity_id = v_id AND deleted_at IS NULL;

-- Insertar nuevas líneas
FOR v_detail IN SELECT * FROM jsonb_array_elements(p_details)
LOOP
    INSERT INTO app.entity_detail (id, entity_id, field_a, ...)
    VALUES (gen_random_uuid(), v_id, v_detail->>'fieldA', ...);
END LOOP;
```

**Lectura:** la función `build_*` construye el objeto completo incluyendo el array `details` con un subquery:

> 💡 **¿Qué es un subquery (subconsulta)?**
> Es una consulta `SELECT` completa escrita *dentro* de otra consulta, normalmente entre paréntesis. Aquí, dentro del `jsonb_build_object` que arma la cabecera, se incluye un `SELECT` adicional que busca todas las líneas de detalle correspondientes y las empaqueta como un array JSON anidado bajo la clave `'details'`. Así, el resultado final es un solo objeto JSON con la cabecera y todas sus líneas juntas, listo para que el backend lo use sin tener que hacer una segunda consulta por separado.

```sql
'details', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', d.id, ...))
    FROM app.entity_detail d
    WHERE d.entity_id = e.id AND d.deleted_at IS NULL
), '[]'::JSONB)
```

**Variante con ON CONFLICT en detalle:** cuando las líneas tienen clave única propia dentro del documento (e.g., `(entity_id, line_type)`), se usa `ON CONFLICT DO UPDATE` en vez del replace completo.

---

## 10. Funciones de Alto Nivel (`from_document` / orquestadoras)

Para flujos de ingesta automática (e.g., importación masiva, procesamiento de un archivo, integración con un sistema externo), pueden existir funciones que reciben datos crudos no normalizados y orquestan la creación de todas las entidades necesarias en una sola llamada:

```sql
app.entity_upsert_from_source(
    p_owner_id        uuid,
    p_related_a_code  varchar,    -- código externo de una entidad relacionada (se crea si no existe)
    p_related_a_name  varchar,
    p_related_b_code  varchar,    -- código externo de otra entidad relacionada (se crea si no existe)
    p_related_b_name  varchar,
    p_period          varchar,
    ...                           -- resto de campos de la entidad principal
)
```

Internamente:
1. Llama al `upsert` de cada entidad relacionada usando su código/identificador externo (crea el registro si no existe, lo reactiva si estaba soft-deleted).
2. Llama al `upsert` de la entidad principal con los IDs resultantes de los pasos anteriores.

Esto permite que la lógica de resolución de identidad (mapear un identificador externo a un `id` interno) sea completamente transparente para quien llama, que solo necesita conocer los datos crudos del origen.

> **Límite de estas funciones:** solo orquestan **datos** (crear/reactivar entidades relacionadas y enlazarlas). No deciden estados de flujo, no aplican reglas normativas ni permisos. Si la ingesta requiere decidir algo de negocio (p. ej. en qué estado queda un documento importado), el `service` toma esa decisión y la pasa como parámetro. Las entidades con máquina de estados siempre se crean en su estado base (`Draft`), salvo que el `service` indique explícitamente otro estado válido.

---

## 11. Normalización de Datos de Entrada

Las funciones aplican normalización de forma consistente:

> 💡 **¿Qué hacen `UPPER` y `TRIM`, y por qué importa para la búsqueda?**
> `TRIM(valor)` elimina espacios en blanco al inicio y al final de un texto (ej. `" abc "` → `"abc"`). `UPPER(valor)` convierte todo el texto a mayúsculas (ej. `"abc"` → `"ABC"`). Se combinan para resolver un problema típico: si dos usuarios escriben el mismo código pero uno con minúsculas y otro con un espacio de más, sin esta normalización el sistema los trataría como dos valores distintos (y un índice único no detectaría el duplicado). Al normalizar siempre antes de comparar o guardar, `"abc123 "`, `"ABC123"` y `" abc123"` terminan siendo el mismo valor almacenado, evitando duplicados accidentales.

- **Identificadores/códigos únicos (strings de búsqueda):** `UPPER(TRIM(p_value))` — siempre en mayúsculas sin espacios. Aplica a cualquier campo usado como clave de búsqueda case-insensitive (identificador externo, código, email normalizado, etc.).
- **Período:** `UPPER(TRIM(p_period))` — mismo criterio, cuando el período se representa como string.
- **Textos generales:** sin normalización automática; se almacenan tal como llegan.
- **Reactivación de soft-deleted:** cualquier `ON CONFLICT DO UPDATE` incluye `deleted_at = NULL`, reactivando registros previamente eliminados.

---

## 12. Llamada a Funciones desde el Backend

El backend (Node.js/TypeScript) invoca las funciones con la sintaxis:

```typescript
// queries/entity.ts
export const getAll    = `SELECT app.entity_get_all() AS data`;
export const getById   = `SELECT app.entity_get_by_id($1) AS data`;
export const upsert    = `SELECT app.entity_upsert($1, $2, $3) AS data`;
export const deleteById = `SELECT app.entity_delete_by_id($1) AS data`;
```

```typescript
// models/entity.ts
const result = await pool.query(queries.getAll);
const response = result.rows[0].data;  // ya es el objeto { status, data, count }
```

La función siempre devuelve un único row con una única columna (`data`). El backend lee `result.rows[0].data` y evalúa el campo `status`.

**Reparto de responsabilidades en el backend:**
- **`queries/`** contiene únicamente llamadas a funciones (`SELECT app.fn($1, $2) AS data`). No hay `SELECT ... FROM tabla`, `INSERT` ni `UPDATE` directos. Siempre parámetros posicionales; nunca concatenación ni template literals con variables.
- **`models/`** ejecuta la query vía el Pool, lee `status` y traduce: `success` → devuelve `data`; `not_found` → devuelve `null` (o lanza un `NotFoundError`); `error` → lanza un error interno **sin** propagar `message` (contiene `SQLERRM`) al cliente HTTP. El mensaje se registra con Pino.
- **`services/`** aplica reglas de negocio sobre lo que devuelve el model.

---

## 13. Tablas y Funciones de Autenticación

El sistema de autenticación requiere su propio set de tablas, independiente de las entidades de dominio. Estas tablas suelen vivir en la migración base (`001_initial_schema.sql` o equivalente), antes de cualquier entidad de negocio.

### 13.1 Tabla `users`

Almacena las credenciales y el rol de cada usuario del sistema.

> 💡 **¿Qué es un índice parcial (el `WHERE` dentro de un `CREATE INDEX`)?**
> Es un índice que solo cubre las filas que cumplen una condición, en vez de toda la tabla. `CREATE INDEX idx_users_email ON app.users(email) WHERE deleted_at IS NULL` crea un índice sobre `email`, pero ignorando las filas ya marcadas como soft-deleted. Esto tiene dos ventajas: el índice es más pequeño y rápido (no indexa filas "muertas" que casi nunca se consultan), y evita que un email de un usuario eliminado bloquee la creación de un nuevo registro con el mismo email — algo que sí pasaría con un índice único normal sobre toda la tabla.
>
> 💡 **¿Qué es un `CHECK` constraint?**
> Es una restricción que valida que el valor de una columna cumpla una condición antes de permitir guardar la fila. `CHECK (role IN ('admin', 'editor', 'viewer'))` significa que la BD rechazará cualquier intento de insertar o actualizar una fila donde `role` no sea exactamente uno de esos tres valores — es una capa de seguridad adicional a nivel de base de datos, independiente de cualquier validación que también haga el backend.

```sql
CREATE TABLE app.users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50) NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('admin', 'editor', 'viewer')),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NULL,
    deleted_at    TIMESTAMPTZ DEFAULT NULL
);

CREATE UNIQUE INDEX idx_users_email ON app.users(LOWER(TRIM(email))) WHERE deleted_at IS NULL;
```

> Los valores del `CHECK` de `role` deben coincidir exactamente con el tipo `UserRole` definido en el backend (`src/interfaces/response.ts`). Si se agrega un rol nuevo, debe sincronizarse en ambos lugares.

### 13.2 Tabla `refresh_tokens`

Almacena refresh tokens **hasheados** (nunca en texto plano), permitiendo invalidación individual o masiva por usuario.

> 💡 **¿Qué significa "hasheado" y por qué no se guarda el token tal cual?**
> Un *hash* es el resultado de pasar un dato por una función matemática que lo transforma en una cadena de longitud fija, de forma que es prácticamente imposible reconstruir el dato original a partir del hash, pero siempre se obtiene el mismo hash a partir del mismo dato original. Si alguien lograra leer la tabla `refresh_tokens` directamente (ej. por una fuga de la base de datos), encontraría solo hashes inútiles, no los tokens reales que podría usar para hacerse pasar por un usuario. Para validar un token recibido, el backend no "desencripta" el hash guardado — vuelve a calcular el hash del token recibido y compara si coincide con el que está guardado.
>
> 💡 **¿Qué es `ON DELETE CASCADE`?**
> Es una regla a nivel de FK que dice: "si la fila padre (en este caso, el `user` referenciado) se elimina físicamente, elimina automáticamente también todas las filas hijas que la referencian". Aquí, si un `user` se borra físicamente (algo poco común dado que el proyecto usa soft delete, pero posible en una limpieza administrativa), todos sus `refresh_tokens` se eliminan en cascada para no dejar registros huérfanos apuntando a un usuario que ya no existe.

```sql
CREATE TABLE app.refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ DEFAULT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_refresh_tokens_hash ON app.refresh_tokens(token_hash);

CREATE INDEX idx_refresh_tokens_user_active
    ON app.refresh_tokens(user_id)
    WHERE revoked_at IS NULL;
-- Nota: PostgreSQL no permite NOW() en el WHERE de un índice parcial (no es IMMUTABLE).
-- El filtro expires_at > NOW() se aplica en la consulta, no en el índice.
```

> Nota: esta tabla usa `revoked_at` en vez de `deleted_at`, ya que la semántica es "token invalidado", no "registro borrado". Es una variante intencional del patrón de soft delete estándar.

### 13.3 Tabla `token_blacklist`

Lista de access tokens revocados antes de su expiración natural (e.g., logout explícito), indexados por `jti` (JWT ID).

```sql
CREATE TABLE app.token_blacklist (
    jti         VARCHAR(36) PRIMARY KEY,
    user_id     UUID NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_blacklist_expires ON app.token_blacklist(expires_at);
```

> Esta tabla típicamente se purga periódicamente (cron / job) eliminando filas con `expires_at < NOW()`, ya que un token expirado no necesita estar en la blacklist.

### 13.4 Funciones de Autenticación

**Excepción documentada a la sección 5:** estas funciones **no** usan el sobre `{ status, data }`. Las de lectura retornan `JSON` crudo (o `NULL` si no hay resultado) y las de escritura retornan `VOID`, porque se invocan en flujos internos (login, refresh, logout) donde el backend ya tiene el dato necesario. Para mantener el modelo de permisos de la sección 5, todas se declaran igualmente `SECURITY DEFINER`. El model de auth debe tratar `NULL` como "no encontrado".

**Hashing:** las contraseñas se hashean con `bcryptjs` (costo ≥ 12). Los refresh tokens se guardan como **SHA-256** del token: es determinista, lo que permite buscarlos directamente por hash (necesario para la detección de reutilización), y es seguro porque el token ya es un valor aleatorio de alta entropía.

```sql
-- Búsqueda de usuario por email (login)
CREATE OR REPLACE FUNCTION app.user_get_by_email(p_email VARCHAR)
RETURNS JSON AS $$
    SELECT row_to_json(u)
    FROM (
        SELECT id, email, password_hash, role, is_active AS "isActive",
               created_at AS "createdAt", updated_at AS "updatedAt", deleted_at AS "deletedAt"
        FROM app.users
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email)) AND deleted_at IS NULL
    ) u;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = app, pg_temp;

-- Búsqueda de usuario por id (verificación de token / /auth/me)
CREATE OR REPLACE FUNCTION app.user_get_by_id(p_id UUID)
RETURNS JSON AS $$
    SELECT row_to_json(u)
    FROM (
        SELECT id, email, role
        FROM app.users
        WHERE id = p_id AND deleted_at IS NULL
    ) u;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = app, pg_temp;

-- Insertar un nuevo refresh token (login / refresh)
CREATE OR REPLACE FUNCTION app.user_refresh_token_insert(
    p_user_id UUID,
    p_token_hash VARCHAR,
    p_expires_at TIMESTAMPTZ
) RETURNS VOID AS $$
    INSERT INTO app.refresh_tokens(user_id, token_hash, expires_at)
    VALUES (p_user_id, p_token_hash, p_expires_at);
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = app, pg_temp;

-- Listar refresh tokens activos de un usuario (validación de rotación)
CREATE OR REPLACE FUNCTION app.user_refresh_tokens_get_active(p_user_id UUID)
RETURNS JSON AS $$
    SELECT json_agg(row_to_json(t))
    FROM (
        SELECT id, token_hash AS "tokenHash"
        FROM app.refresh_tokens
        WHERE user_id = p_user_id
          AND revoked_at IS NULL
          AND expires_at > NOW()
    ) t;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = app, pg_temp;

-- Buscar un refresh token por su hash, INCLUIDOS los revocados (detección de robo)
CREATE OR REPLACE FUNCTION app.user_refresh_token_get_by_hash(p_token_hash VARCHAR)
RETURNS JSON AS $$
    SELECT row_to_json(t)
    FROM (
        SELECT id, user_id AS "userId", expires_at AS "expiresAt", revoked_at AS "revokedAt"
        FROM app.refresh_tokens
        WHERE token_hash = p_token_hash
    ) t;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = app, pg_temp;

-- Revocar un refresh token específico (rotación)
CREATE OR REPLACE FUNCTION app.user_refresh_token_revoke(p_token_id UUID)
RETURNS VOID AS $$
    UPDATE app.refresh_tokens SET revoked_at = NOW() WHERE id = p_token_id;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = app, pg_temp;

-- Revocar todos los refresh tokens de un usuario (logout de todas las sesiones)
CREATE OR REPLACE FUNCTION app.user_refresh_tokens_revoke_all(p_user_id UUID)
RETURNS VOID AS $$
    UPDATE app.refresh_tokens SET revoked_at = NOW()
    WHERE user_id = p_user_id AND revoked_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = app, pg_temp;

-- Agregar un access token a la blacklist (logout)
CREATE OR REPLACE FUNCTION app.token_blacklist_insert(
    p_jti VARCHAR,
    p_user_id UUID,
    p_expires_at TIMESTAMPTZ
) RETURNS VOID AS $$
    INSERT INTO app.token_blacklist(jti, user_id, expires_at)
    VALUES (p_jti, p_user_id, p_expires_at)
    ON CONFLICT (jti) DO NOTHING;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = app, pg_temp;
```

**Por qué estas funciones usan `LANGUAGE SQL` y no `plpgsql`:** son operaciones simples de una sola sentencia, sin lógica condicional ni manejo de excepciones. Cuando una función de auth necesita lógica adicional (validaciones, transformación de datos), debe escribirse en `plpgsql` siguiendo el patrón estándar de la sección 5, incluyendo el bloque `EXCEPTION WHEN OTHERS`.

### 13.5 Flujo de Datos (referencia)

```
POST /auth/login   → user_get_by_email → verifica is_active y password_hash (bcrypt) → genera tokens
                    → user_refresh_token_insert (guarda sha256 del refresh token)

POST /auth/refresh → sha256(token recibido) → user_refresh_token_get_by_hash
                    ├─ no existe o expirado        → 401
                    ├─ revokedAt != NULL (REUSO)   → user_refresh_tokens_revoke_all(userId) → 401
                    │                                (Theft Detection: se cierran TODAS las sesiones)
                    └─ activo → user_refresh_token_revoke (token usado)
                              + user_refresh_token_insert (nuevo token, rotación)

POST /auth/logout  → token_blacklist_insert (invalida access token actual)
                    → user_refresh_token_revoke o revoke_all
```

> Esta tabla resume el flujo a nivel de BD; la lógica de hashing, firma JWT y validación de expiración vive en el backend (ver Parte I, sección 3).

---

## 14. Cómo Agregar una Nueva Entidad

Usar como checklist. Ejemplo: agregar la entidad `document_type`.

### Paso 1: Tabla en migración SQL

```sql
-- migrations/NNN_document_type.sql
CREATE TABLE app.document_type (
    id         uuid DEFAULT gen_random_uuid() NOT NULL,
    name       varchar NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz NULL,
    deleted_at timestamptz NULL,
    CONSTRAINT document_type_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX document_type_idx ON app.document_type USING btree (name);
```

### Paso 2: Stored functions

Crear en el mismo archivo de migración (o en uno separado `NNN_document_type_functions.sql`):

```sql
-- Lectura
CREATE OR REPLACE FUNCTION app.document_type_get_all() RETURNS jsonb ...
CREATE OR REPLACE FUNCTION app.document_type_get_by_id(p_id uuid) RETURNS jsonb ...

-- Escritura
CREATE OR REPLACE FUNCTION app.document_type_upsert(p_name varchar, p_id uuid DEFAULT NULL) RETURNS jsonb ...
CREATE OR REPLACE FUNCTION app.document_type_delete_by_id(p_id uuid) RETURNS jsonb ...
```

Si la entidad tiene filtros múltiples, agregar también:
```sql
CREATE OR REPLACE FUNCTION app.document_type_get_by_fields(...) RETURNS jsonb ...
```

### Paso 3: Interface TypeScript

```typescript
// src/interfaces/models/documentType.ts
export interface DocumentType {
  id: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
```

### Paso 4: Queries

```typescript
// src/queries/documentType.ts
export const getAll    = `SELECT app.document_type_get_all() AS data`;
export const getById   = `SELECT app.document_type_get_by_id($1) AS data`;
export const upsert    = `SELECT app.document_type_upsert($1, $2) AS data`;
export const deleteById = `SELECT app.document_type_delete_by_id($1) AS data`;
```

### Paso 5: Model

```typescript
// src/models/documentType.ts
import pool from '../utils/database';
import * as queries from '../queries/documentType';
import { DocumentType } from '../interfaces/models/documentType';
import { unwrap } from '../utils/dbResponse';

export async function getAll(): Promise<DocumentType[]> {
  const result = await pool.query(queries.getAll);
  return unwrap<DocumentType[]>(result.rows[0].data) ?? [];
}

export async function getById(id: string): Promise<DocumentType | null> {
  const result = await pool.query(queries.getById, [id]);
  return unwrap<DocumentType>(result.rows[0].data);
}

export async function upsert(name: string, id?: string): Promise<DocumentType | null> {
  const result = await pool.query(queries.upsert, [name, id ?? null]);
  return unwrap<DocumentType>(result.rows[0].data);
}

export async function deleteById(id: string): Promise<DocumentType[] | null> {
  const result = await pool.query(queries.deleteById, [id]);
  return unwrap<DocumentType[]>(result.rows[0].data);
}
```

Helper compartido que aplica la regla de la sección 12 (nunca usar `data` sin revisar `status`, nunca exponer `SQLERRM`):

```typescript
// src/utils/dbResponse.ts
import { logger } from './logger';

interface DbResponse<T> { status: 'success' | 'not_found' | 'error'; data: T | null; message?: string; count?: number }

export function unwrap<T>(res: DbResponse<T>): T | null {
  if (res.status === 'success') return res.data;
  if (res.status === 'not_found') return null;
  logger.error({ dbMessage: res.message }, 'Stored function error');
  throw new Error('DATABASE_ERROR'); // el error handler lo traduce a 500 genérico
}
```

### Paso 6: Service, Controller y Router

El `service` decide qué hacer con `null` (p. ej. `NotFoundError` → 404), valida dependencias antes de `deleteById` (sección 3) y aplica las reglas de negocio. El controller solo extrae `req.body`/`req.params` validados por el schema y delega. Ver Parte I, secciones 1, 2 y 10.

---

## Resumen de Convenciones Rápidas

| Aspecto | Convención |
|---|---|
| Schema | Siempre `app` |
| PK | `uuid` con `gen_random_uuid()` |
| Fechas | `timestamptz` en todas las tablas |
| Borrado | Soft delete (`deleted_at`); dependencias validadas en `services/` |
| Retorno | `RETURNS jsonb` con sobre `{status, data}` (excepción: funciones de auth, sección 13.4) |
| Status values | `success` / `not_found` / `error` |
| Null list | `COALESCE(..., '[]'::JSONB)` — nunca null |
| Strings únicos | `UPPER(TRIM(...))` |
| Parámetros | Prefijo `p_` |
| Variables locales | Prefijo `v_` |
| Naming functions | `{entity}_{action}` |
| camelCase en JSON | Sí, siempre |
| Filtros opcionales | `IS NULL OR campo = valor` |
| Mínimo un filtro | Guard explícito en `get_by_fields` |
| Reglas de negocio | Nunca en la BD; siempre en `services/` |
| Errores de BD | Se loguean, nunca se exponen al cliente |
