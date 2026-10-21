# Referencia Técnica — Servicios BackEnd

> **Versión:** 3.1 — Correcciones y mejoras sobre v3.0
> **Stack:** Node.js 22+ · Express · TypeScript · PostgreSQL · JWT · Docker
> **Propósito:** Guía definitiva de desarrollo para el equipo. Explica **cómo funciona el sistema**, las decisiones de diseño y los patrones adoptados. Cada sección incluye el código completo y listo para usar.

---

> **Jerarquía:** ante cualquier diferencia manda `rulesproyect.md` (Parte I y Parte II). En particular: el SQL (tablas y funciones) se copia siempre desde la Parte II, nunca desde esta guía. Esta guía usa **Zod**; en Barnard-SGSI el backend usa **Joi** (ver la excepción al inicio de `rulesproyect.md`).

## Tabla de Contenidos

1. [Visión General y Arquitectura](#1-visión-general-y-arquitectura)
2. [Creación del Proyecto](#2-creación-del-proyecto)
3. [Configuración de TypeScript](#3-configuración-de-typescript)
4. [Dependencias](#4-dependencias)
5. [Variables de Entorno](#5-variables-de-entorno)
6. [Estructura de Directorios](#6-estructura-de-directorios)
7. [Configuración (config)](#7-configuración-config)
8. [Logger](#8-logger)
9. [Base de Datos](#9-base-de-datos)
10. [Interfaces y Tipos](#10-interfaces-y-tipos)
11. [Seguridad](#11-seguridad)
    - 11.1 [Principios Generales](#111-principios-generales)
    - 11.2 [Helmet y Security Headers](#112-helmet-y-security-headers)
    - 11.3 [Rate Limiting](#113-rate-limiting)
    - 11.4 [CORS](#114-cors)
    - 11.5 [Validación y Sanitización de Entrada](#115-validación-y-sanitización-de-entrada)
    - 11.6 [Protección contra Ataques Comunes](#116-protección-contra-ataques-comunes)
12. [Autenticación con JWT](#12-autenticación-con-jwt)
    - 12.1 [Fundamentos de JWT](#121-fundamentos-de-jwt)
    - 12.2 [Generación de Tokens](#122-generación-de-tokens)
    - 12.3 [Middleware de Verificación](#123-middleware-de-verificación)
    - 12.4 [Refresh Tokens y Rotación](#124-refresh-tokens-y-rotación)
    - 12.5 [Blacklisting de Tokens](#125-blacklisting-de-tokens)
13. [Manejo de Sesiones](#13-manejo-de-sesiones)
    - 13.1 [Estrategia Stateless vs Stateful](#131-estrategia-stateless-vs-stateful)
    - 13.2 [Flujo Completo de Autenticación](#132-flujo-completo-de-autenticación)
    - 13.3 [Logout y Revocación](#133-logout-y-revocación)
14. [Middlewares](#14-middlewares)
15. [Routes (Rutas)](#15-routes-rutas)
16. [Controllers (Controladores)](#16-controllers-controladores)
17. [Services (Capa de Servicio)](#17-services-capa-de-servicio)
18. [Models (Modelos)](#18-models-modelos)
19. [Queries](#19-queries)
20. [Schemas (Validación)](#20-schemas-validación)
21. [Utilidades](#21-utilidades)
22. [Archivos Principales (app.ts y server.ts)](#22-archivos-principales-appts-y-serverts)
23. [Docker](#23-docker)
24. [Gestión del Schema de Base de Datos](#24-gestión-del-schema-de-base-de-datos)
25. [Testing](#25-testing)
26. [Scripts de Ejecución](#26-scripts-de-ejecución)
27. [Cómo Agregar una Nueva Entidad](#27-cómo-agregar-una-nueva-entidad)
28. [Checklist de Seguridad Pre-Deploy](#28-checklist-de-seguridad-pre-deploy)
29. [Estructura Final del Proyecto](#29-estructura-final-del-proyecto)

---

## 1. Visión General y Arquitectura

El sistema BackEnd está compuesto por servicios independientes con responsabilidades específicas. Cada servicio comienza con el prefijo `api-`:

| Servicio             | Responsabilidad                                                     |
| -------------------- | ------------------------------------------------------------------- |
| `api`                | Interacción con BD y orquestación del resto de servicios            |
| `api-files`          | Manipulación y almacenamiento de archivos (S3, disco, etc.)         |
| `api-pdf`            | Generación, lectura y modificación de PDFs                          |
| `api-email`          | Gestión y envío de correos electrónicos                             |
| `api-webhook-[type]` | Servicio residente para respuestas de terceros (pagos, OAuth, etc.) |
| `api-auth`           | Servicio dedicado de autenticación y autorización                   |

### Arquitectura por Capas

```
Request → Router → Middleware(s) → Controller → Service → Model → Query → PostgreSQL
                                                                            ↓
Response ← Controller ← Service ← Model ←──────────────────────────────────┘
```

| Capa | Archivo | Responsabilidad única |
|---|---|---|
| **Router** | `routers/{entity}.ts` | Declara rutas y encadena middlewares |
| **Middleware** | `middlewares/*.ts` | Autenticación, validación, logging, seguridad |
| **Controller** | `controllers/{entity}.ts` | Extrae datos del request, llama al service, envía respuesta |
| **Service** | `services/{entity}.ts` | Lógica de negocio, validaciones de dominio, orquestación |
| **Model** | `models/{entity}.ts` | Acceso a BD: llama stored procedures, retorna tipos |
| **Query** | `queries/{entity}.ts` | Strings de llamada a stored procedures |

**Por qué esta separación:** Permite testear cada capa independientemente (service sin BD, model sin lógica), reutilizar services entre endpoints, y mantener los controllers como simples adaptadores HTTP.

> **REGLA ESTRICTA:** Ninguna capa puede saltarse a otra. El service nunca importa nada de `express`. El controller nunca hace queries a la BD. El model nunca contiene lógica de negocio. Si algo no encaja, es señal de que pertenece a otra capa.

> **NOTA:** Cada servicio vive dentro de un proyecto principal (monorepo o multi-repo según la escala).

---

## 2. Creación del Proyecto

```bash
mkdir api-<nombre>
cd api-<nombre>
yarn init -y
```

---

## 3. Configuración de TypeScript

### Instalación

```bash
yarn add typescript @types/node ts-node-dev --dev
npx tsc --init
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

> **Nota:** Se usa `ES2022` como target y `Node16` para module resolution, habilitando top-level await y ESM nativo. Las opciones `noUnusedLocals`, `noImplicitReturns` y `noFallthroughCasesInSwitch` elevan la calidad del código y evitan bugs silenciosos.

---

## 4. Dependencias

### Producción

```bash
yarn add express cors helmet dotenv pg zod uuid pino pino-pretty \
  bcryptjs jsonwebtoken express-rate-limit hpp cookie-parser
```

### Desarrollo

```bash
yarn add -D typescript @types/node @types/express @types/cors @types/pg \
  @types/bcryptjs @types/jsonwebtoken @types/cookie-parser @types/uuid \
  ts-node-dev nodemon vitest @vitest/coverage-v8 supertest @types/supertest
```

### Decisiones de librería

| Librería | Reemplaza | Razón |
| ------------------ | ----------------------- | ----------------------------------------------------------------- |
| `zod` | `joi` | Inferencia de tipos nativa en TypeScript, schemas más ergonómicos |
| `pino` + `pino-pretty` | `winston` | ~5x más rápido, JSON nativo, mejor para producción |
| Clases de error propias | `@hapi/boom` | Menor dependencia externa, mayor control |
| `express-rate-limit` | — | Protección contra brute force y DDoS |
| `hpp` | — | Protección contra HTTP Parameter Pollution |
| `cookie-parser` | — | Necesario para leer refresh tokens en httpOnly cookies |
| `vitest` | — | Testing moderno, rápido y compatible con TypeScript sin configuración extra |

> **Nota sobre `multer`:** Solo se instala en `api-files`. No va en el servicio principal. Principio de responsabilidad única.

---

## 5. Variables de Entorno

Crear el archivo `.env` en la raíz del proyecto:

```bash
# ─── Aplicación ───
NODE_ENV=development
API_NAME=api
API_PORT=3001
API_VERSION=v1

# ─── Base de Datos ───
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MAX=20
DB_SSL=false

# ─── JWT ───
JWT_ACCESS_SECRET=<clave-secreta-mínimo-64-caracteres>
JWT_REFRESH_SECRET=<otra-clave-secreta-mínimo-64-caracteres>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
JWT_ISSUER=api-<nombre>

# ─── CORS ───
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# ─── Rate Limiting ───
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

> **SEGURIDAD:** Jamás hacer commit del archivo `.env`. En producción, usar un gestor de secretos (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager o variables de entorno inyectadas por el orquestador).

> **Generar claves JWT seguras:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> Ejecutar dos veces: una para `JWT_ACCESS_SECRET` y otra para `JWT_REFRESH_SECRET`. Nunca usar la misma clave para ambos.

### .gitignore

```gitignore
# Dependencias
node_modules/
.pnp.js

# Build
dist/
build/

# Entorno
.env
.env.*
!.env.example

# Logs
logs/
*.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
```

### .env.example

Mantener siempre este archivo en el repositorio con las claves pero sin valores reales. Es la referencia de onboarding para nuevos desarrolladores:

```bash
# ─── Aplicación ───
NODE_ENV=
API_NAME=
API_PORT=
API_VERSION=

# ─── Base de Datos ───
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_POOL_MAX=
DB_SSL=

# ─── JWT ───
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRATION=
JWT_REFRESH_EXPIRATION=
JWT_ISSUER=

# ─── CORS ───
CORS_ALLOWED_ORIGINS=

# ─── Rate Limiting ───
RATE_LIMIT_WINDOW_MS=
RATE_LIMIT_MAX_REQUESTS=
```

---

## 6. Estructura de Directorios

```
api-<nombre>/
├── src/
│   ├── interfaces/        # Interfaces y tipos TypeScript
│   │   ├── auth.ts
│   │   ├── response.ts
│   │   └── models/
│   │       └── {entity}.ts
│   ├── middlewares/        # Middlewares de Express
│   │   ├── auth.ts            # Verificación de JWT y autorización por roles
│   │   ├── cors.ts            # Configuración CORS
│   │   ├── errorHandler.ts    # Manejo centralizado de errores
│   │   ├── notFoundHandler.ts # Rutas no encontradas
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   ├── requestLogger.ts   # Log de peticiones con Request ID
│   │   ├── securityHeaders.ts # Headers de seguridad (Helmet)
│   │   └── validateRequest.ts # Validación genérica con Zod
│   ├── routers/           # Definición de rutas
│   │   ├── index.ts           # Registra todos los routers bajo /api/v1
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── controllers/       # Manejo de request/response HTTP
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── services/          # Lógica de negocio
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── models/            # Interacción con base de datos
│   │   ├── user.ts            # Siempre existe: auth lo necesita
│   │   └── {entity}.ts
│   ├── queries/           # Strings de llamada a stored procedures
│   │   ├── user.ts
│   │   └── {entity}.ts
│   ├── schemas/           # Esquemas de validación (Zod)
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── utils/             # Configuración y utilidades
│   │   ├── config.ts          # Variables de entorno centralizadas
│   │   ├── database.ts        # Pool de conexión PostgreSQL
│   │   ├── errors.ts          # Clases de error personalizadas
│   │   ├── jwt.ts             # Generación y verificación de tokens
│   │   ├── logger.ts          # Instancia de pino
│   │   └── sendResponse.ts    # Helper de respuesta estándar
│   ├── app.ts             # Configuración de Express (middlewares, rutas)
│   └── server.ts          # Punto de entrada (arranque, graceful shutdown)
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   └── integration/
│       └── routes/
├── migrations/            # Scripts SQL de BD (ver sección 24)
│   ├── 001_initial_schema.sql
│   └── 002_add_refresh_tokens.sql
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 7. Configuración (config)

La configuración vive en `src/utils/config.ts`. No existe carpeta `config/` separada — config es una utilidad más.

**Por qué:** Centraliza todas las variables de entorno en un único objeto `config` con validación al arranque. Si falta una variable crítica, el servicio falla inmediatamente con un mensaje claro en lugar de fallar silenciosamente en runtime.

```typescript
// src/utils/config.ts
import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Variable de entorno requerida no encontrada: ${key}`);
  }
  return value;
}

const config = {
  // Aplicación
  nodeEnv: requireEnv("NODE_ENV", "development"),
  apiName: requireEnv("API_NAME", "api"),
  apiPort: parseInt(requireEnv("API_PORT", "3001"), 10),
  apiVersion: requireEnv("API_VERSION", "v1"),
  isDev: process.env.NODE_ENV !== "production",

  // Base de Datos
  db: {
    host: requireEnv("DB_HOST", "localhost"),
    port: parseInt(requireEnv("DB_PORT", "5432"), 10),
    name: requireEnv("DB_NAME", "postgres"),
    user: requireEnv("DB_USER", "postgres"),
    password: requireEnv("DB_PASSWORD"),
    poolMax: parseInt(requireEnv("DB_POOL_MAX", "20"), 10),
    ssl: requireEnv("DB_SSL", "false") === "true",
  },

  // JWT
  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
    accessExpiration: requireEnv("JWT_ACCESS_EXPIRATION", "15m"),
    refreshExpiration: requireEnv("JWT_REFRESH_EXPIRATION", "7d"),
    issuer: requireEnv("JWT_ISSUER", "api"),
  },

  // CORS
  corsAllowedOrigins: requireEnv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000",
  )
    .split(",")
    .map((origin) => origin.trim()),

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(requireEnv("RATE_LIMIT_WINDOW_MS", "900000"), 10),
    maxRequests: parseInt(requireEnv("RATE_LIMIT_MAX_REQUESTS", "100"), 10),
  },
} as const;

export default config;
```

> **Nota:** La función `requireEnv` lanza un error al iniciar el servicio si falta alguna variable de entorno crítica (como `DB_PASSWORD` o `JWT_ACCESS_SECRET`), evitando fallos silenciosos en runtime. El servidor nunca llega a escuchar si hay variables faltantes.

---

## 8. Logger

```typescript
// src/utils/logger.ts
import pino from "pino";
import config from "./config";

const logger = pino({
  level: config.isDev ? "debug" : "info",
  transport: config.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    service: config.apiName,
    env: config.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // En producción, los logs salen como JSON puro para ingesta en
  // ELK, Datadog, CloudWatch, etc.
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    // Campos que NUNCA deben aparecer en logs, ni siquiera enmascarados parcialmente
    paths: [
      "req.headers.authorization",
      "req.body.password",
      "*.password",
      "*.token",
      "*.refreshToken",
      "*.passwordHash",
    ],
    casing: "all",
  },
});

export default logger;
```

> **Por qué pino sobre winston:** Pino es ~5x más rápido en benchmarks. La opción `redact` enmascara automáticamente datos sensibles en los logs (passwords, tokens), lo cual es crítico para cumplimiento normativo (GDPR, SOC 2). En producción, los logs van como JSON puro para ser procesados por sistemas de observabilidad.

---

## 9. Base de Datos

```typescript
// src/utils/database.ts
import pg from "pg";
import config from "./config";
import logger from "./logger";

const { Pool } = pg;

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: config.db.poolMax,
  idleTimeoutMillis: 30000,       // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 5000,  // Fallar si no hay conexión disponible en 5s
  keepAlive: true,
  options: "-c timezone=America/Santiago",
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
});

// Evento de conexión nueva al pool
pool.on("connect", () => {
  logger.debug("Nueva conexión al pool de base de datos");
});

// Manejo de errores inesperados en clientes inactivos
pool.on("error", (err) => {
  logger.error({ err }, "Error inesperado en cliente PostgreSQL inactivo");
});

// Verificación de conectividad al inicio del servidor
export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    logger.info("Conexión a base de datos verificada correctamente");
  } catch (err) {
    logger.fatal({ err }, "No se pudo conectar a la base de datos");
    process.exit(1);
  }
}

export default pool;
```

> **Nota:** Se incluye `connectionTimeoutMillis` para no bloquear indefinidamente, manejo de eventos `error` del pool, y una función `testConnection()` que se invoca en `server.ts` antes de empezar a escuchar. Si la BD no está disponible, el servicio falla rápido en lugar de aceptar requests sin conexión.

---

## 10. Interfaces y Tipos

```typescript
// src/interfaces/response.ts
//
// CONTRATO DE API — este formato debe estar sincronizado con: src/utils/sendResponse.ts
// Formato estándar de todas las respuestas del backend:
//   { success: true,  data: T,    error: null,  requestId?: string }  → éxito
//   { success: false, data: null, error: "msg", requestId?: string }  → error
//
// El frontend espera exactamente esta estructura. No modificar sin coordinar con frontend-guide.
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  requestId?: string;
}

// Roles disponibles en el sistema.
// FUENTE DE VERDAD: este tipo es el autoritativo en el backend.
// Sincronizar con: frontend → src/store/interfaces/response.interface.ts → UserRole
// Si se agrega un rol aquí, debe agregarse también en el frontend y en la BD (ENUM o CHECK).
export type UserRole = "admin" | "editor" | "viewer";
```

```typescript
// src/interfaces/auth.ts
import type { UserRole } from "./response";

export interface JwtPayload {
  sub: string;        // user id
  email: string;
  role: UserRole;     // tipado estricto — sincronizado con UserRole en response.ts
  iat?: number;
  exp?: number;
  iss?: string;
  jti?: string;       // JWT ID único para blacklisting
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Extensión global de Express.Request para incluir el usuario autenticado
// Esto habilita req.user en cualquier parte del código con tipado completo
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
```

```typescript
// src/interfaces/models/user.ts
// La interfaz User refleja los datos que retornan las funciones de PostgreSQL
import type { UserRole } from "../response";

export interface User {
  id: string;
  email: string;
  role: UserRole;       // sincronizado con UserRole en response.ts
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Vista parcial usada en el payload JWT y en /auth/me
export interface UserPublic {
  id: string;
  email: string;
  role: UserRole;       // sincronizado con UserRole en response.ts
}
```

```typescript
// src/interfaces/models/post.ts — Ejemplo de entidad de dominio
export interface Post {
  id: string;
  userId: string;
  message: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

> **Convención de roles:** Los roles válidos son `admin`, `editor` y `viewer`. Están centralizados en el tipo `UserRole` de `src/interfaces/response.ts`, que es la fuente de verdad del backend. Todas las interfaces que usen roles deben importar `UserRole` desde ahí, nunca redefinir el literal union. El frontend debe mantener su propio `UserRole` sincronizado con este.

---

## 11. Seguridad

### 11.1 Principios Generales

La seguridad de un servicio backend se basa en **defensa en profundidad** — múltiples capas que, combinadas, protegen contra distintos vectores de ataque:

1. **Autenticación:** Verificar la identidad del solicitante (JWT, API keys)
2. **Autorización:** Verificar permisos del solicitante autenticado (roles)
3. **Validación de entrada:** Todo input es hostil hasta que se valide con Zod
4. **Cifrado en tránsito:** HTTPS obligatorio (TLS 1.3)
5. **Cifrado en reposo:** Passwords hasheados con bcrypt (cost ≥ 12), refresh tokens guardados como SHA-256 en BD
6. **Rate limiting:** Prevenir abuso y ataques de fuerza bruta
7. **Logging y monitoreo:** Detectar anomalías y responder a incidentes
8. **Principio de menor privilegio:** Cada componente accede solo a lo necesario

### 11.2 Helmet y Security Headers

```typescript
// src/middlewares/securityHeaders.ts
import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],    // NUNCA 'unsafe-inline' ni 'unsafe-eval'
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  hsts: {
    maxAge: 63072000, // 2 años
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: false, // Deprecado en navegadores modernos, CSP lo reemplaza
  frameguard: { action: "deny" },
});
```

> **CRÍTICO:** Nunca incluir `'unsafe-inline'` ni `'unsafe-eval'` en las directivas CSP, ya que anulan por completo la protección contra XSS. Si se necesita inline scripting, utilizar nonces CSP. Verificar los headers con [securityheaders.com](https://securityheaders.com) antes de cada deploy.

### 11.3 Rate Limiting

```typescript
// src/middlewares/rateLimiter.ts
import rateLimit from "express-rate-limit";
import config from "../utils/config";

// Rate limiter general — aplica a todos los endpoints
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutos por defecto
  max: config.rateLimit.maxRequests,   // 100 requests por ventana
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: "Demasiadas peticiones. Intente nuevamente más tarde.",
  },
  keyGenerator: (req) => {
    // Usar X-Forwarded-For si está detrás de un proxy/load balancer
    return (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
  },
});

// Rate limiter estricto para endpoints de autenticación
// Solo 10 intentos por ventana de 15 minutos para prevenir brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: "Demasiados intentos de autenticación. Intente en 15 minutos.",
  },
  skipSuccessfulRequests: true, // No contar requests exitosos contra el límite
});
```

> **Producción con múltiples instancias:** En entornos con cluster o Kubernetes, reemplazar el store en memoria por Redis usando `rate-limit-redis` para que el conteo sea compartido entre instancias. El store en memoria es per-proceso y no escala horizontalmente.

### 11.4 CORS

```typescript
// src/middlewares/cors.ts
import cors from "cors";
import config from "../utils/config";
import logger from "../utils/logger";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, Postman, health checks, service-to-service)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (config.corsAllowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin }, "Solicitud bloqueada por CORS");
      callback(new Error("No permitido por CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],   // Para trazabilidad en el cliente
  credentials: true,                  // Necesario para cookies (refresh tokens)
  maxAge: 86400,                      // Cachear preflight por 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

> **Nota:** Los orígenes permitidos se definen en variables de entorno (`CORS_ALLOWED_ORIGINS`), no hardcoded. En producción, esta lista debe contener solo los dominios del frontend. Nunca usar wildcard `*` en producción.

### 11.5 Validación y Sanitización de Entrada

```typescript
// src/middlewares/validateRequest.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type RequestLocation = "body" | "params" | "query";

export function validateRequest(
  schema: ZodSchema,
  location: RequestLocation = "body",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // schema.parse lanza ZodError si los datos son inválidos.
      // También transforma: trim(), toLowerCase(), strip de campos desconocidos.
      const parsed = schema.parse(req[location]);
      req[location] = parsed; // Reemplazar con datos validados y transformados
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
```

> **Principio:** Todo dato proveniente del exterior (body, params, query, headers) debe tratarse como potencialmente malicioso. Zod no solo valida sino que transforma, eliminando propiedades no declaradas en el schema (strip by default). Nunca acceder a `req.body.campo` sin haber pasado por `validateRequest` primero.

### 11.6 Protección contra Ataques Comunes

Los middlewares globales en `app.ts` activan las siguientes protecciones:

```typescript
// En app.ts (ver sección 22)
app.use(express.json({ limit: "10kb" }));           // Limitar tamaño del body
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(hpp());                                      // HTTP Parameter Pollution
```

**Resumen de protecciones activas:**

| Ataque | Protección |
| ----------------------- | ---------------------------------------------------------------------------- |
| SQL Injection | Queries parametrizadas (`$1`, `$2`, ...) — JAMÁS concatenar strings |
| XSS | Helmet CSP sin unsafe-inline, validación Zod, no renderizar HTML del usuario |
| CSRF | Cookies `SameSite=Strict`, verificación de Origin header via CORS |
| Brute Force | `authLimiter` (10 intentos / 15 min) en endpoints de auth |
| DDoS (capa app) | `generalLimiter`, `express.json({ limit })`, timeouts de pool de BD |
| Parameter Pollution | `hpp` middleware |
| Clickjacking | `X-Frame-Options: DENY` via Helmet |
| MIME Sniffing | `X-Content-Type-Options: nosniff` via Helmet |
| Man-in-the-Middle | HSTS con preload, TLS 1.3 obligatorio |
| Enumeración de usuarios | Respuestas genéricas en login (`"Credenciales inválidas"`) |
| Timing Attacks | `bcrypt.hash()` siempre se ejecuta, incluso si el usuario no existe |

---

## 12. Autenticación con JWT

### 12.1 Fundamentos de JWT

JSON Web Tokens (JWT) es el estándar para autenticación stateless en APIs. Se compone de tres partes codificadas en Base64URL separadas por puntos: `header.payload.signature`.

**Estrategia de doble token con cookies httpOnly:**

| Token | Propósito | Expiración | Almacenamiento |
| ----------------- | ---------------------------- | -------------- | ----------------------------------- |
| **Access Token** | Autenticar cada request | Corta (15 min) | Memoria del cliente (variable JS) |
| **Refresh Token** | Obtener nuevos access tokens | Larga (7 días) | Cookie `httpOnly` + `Secure` + `SameSite=Strict` |

**¿Por qué dos tokens?**
- Si un access token es interceptado, su ventana de uso es muy corta (15 min).
- El refresh token vive en una cookie `httpOnly`, completamente inaccesible desde JavaScript, protegiéndolo contra ataques XSS.
- Esta combinación es el estándar de la industria para SPAs y apps móviles.

**Flujo del cliente:**
1. Login → recibe `accessToken` en el body JSON, `refreshToken` en cookie httpOnly automática.
2. Requests autenticados → incluye `Authorization: Bearer <accessToken>` en el header.
3. Access token expirado → el cliente llama a `/auth/refresh` (la cookie se envía automáticamente).
4. Logout → llama a `/auth/logout` (la cookie se limpia en el servidor).

### 12.2 Generación de Tokens

```typescript
// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "./config";
import { JwtPayload, TokenPair } from "../interfaces/auth";

const { jwt: jwtConfig } = config;

/**
 * Genera un par de tokens (access + refresh).
 * Cada token incluye un `jti` (JWT ID) único para permitir blacklisting individual.
 */
// NOTA: `sub` ya viaja en el payload. No pasar también `subject` en las opciones:
// jsonwebtoken lanza "Bad options.subject option. The payload already has an sub property".
export function generateTokenPair(
  payload: Omit<JwtPayload, "iat" | "exp" | "iss" | "jti">,
): TokenPair {
  const accessTokenId = crypto.randomUUID();
  const refreshTokenId = crypto.randomUUID();

  const accessToken = jwt.sign(
    { ...payload, jti: accessTokenId },
    jwtConfig.accessSecret,
    {
      expiresIn: jwtConfig.accessExpiration,
      issuer: jwtConfig.issuer,
      algorithm: "HS256",
    },
  );

  const refreshToken = jwt.sign(
    { sub: payload.sub, jti: refreshTokenId },
    jwtConfig.refreshSecret,
    {
      expiresIn: jwtConfig.refreshExpiration,
      issuer: jwtConfig.issuer,
      algorithm: "HS256",
    },
  );

  return { accessToken, refreshToken };
}

/**
 * Verifica un access token y retorna su payload.
 * Lanza error si el token es inválido, expirado o fue manipulado.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, jwtConfig.accessSecret, {
    issuer: jwtConfig.issuer,
    algorithms: ["HS256"],  // CRÍTICO: previene el ataque "algorithm none"
  }) as JwtPayload;
}

/**
 * Verifica un refresh token y retorna su payload.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, jwtConfig.refreshSecret, {
    issuer: jwtConfig.issuer,
    algorithms: ["HS256"],
  }) as JwtPayload;
}
```

> **Seguridad:** Siempre especificar `algorithms: ["HS256"]` en `verify()` para prevenir el ataque "algorithm none" donde un atacante envía un token sin firma.
>
> **Producción avanzada:** Para servicios críticos o microservicios múltiples, considerar RS256 (asimétrico) donde el servicio de auth firma con la clave privada y los demás servicios verifican con la clave pública, sin necesidad de compartir el secreto.

### 12.3 Middleware de Verificación y Autorización

```typescript
// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import type { UserRole } from "../interfaces/response";
import config from "../utils/config";
import logger from "../utils/logger";

/**
 * Middleware de autenticación.
 * Verifica el JWT en el header Authorization: Bearer <token>
 * Si es válido, adjunta el payload a req.user y llama next().
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      data: null,
      error: "Token de autenticación no proporcionado",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === "TokenExpiredError"
        ? "Token expirado"
        : "Token inválido";

    logger.warn({ ip: req.ip }, `Autenticación fallida: ${message}`);

    res.status(401).json({
      success: false,
      data: null,
      error: message,
    });
  }
}

/**
 * Middleware de autorización por roles.
 * SIEMPRE se usa después de authenticate().
 * Los roles permitidos son tipados con UserRole, por lo que TypeScript detecta
 * en compilación si se pasa un rol que no existe en el sistema.
 *
 * Uso en router:
 *   router.delete("/remove/:id", authenticate, authorize("admin"), AreaController.remove);
 *   router.post("/upsert", authenticate, authorize("admin", "editor"), AreaController.upsert);
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: null,
        error: "No autenticado",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.sub, role: req.user.role, required: allowedRoles },
        "Acceso denegado por rol insuficiente",
      );
      res.status(403).json({
        success: false,
        data: null,
        error: "No tiene permisos para acceder a este recurso",
      });
      return;
    }

    next();
  };
}

/**
 * Autenticación por API Key para comunicación service-to-service.
 * La API key se envía en el header "X-API-Key".
 *
 * Requiere agregar en .env: API_KEY=<clave-secreta>
 * Y en utils/config.ts: apiKey: requireEnv("API_KEY")
 *
 * Solo implementar en servicios que lo necesiten (ej: api-files, api-email).
 */
export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = req.headers["x-api-key"] as string;

  // config se importa al inicio del archivo junto con el resto de imports
  if (!apiKey || apiKey !== config.apiKey) {
    logger.warn({ ip: req.ip }, "API Key inválida o ausente");
    res.status(401).json({
      success: false,
      data: null,
      error: "API key inválida",
    });
    return;
  }

  next();
}
```

**Roles disponibles en el sistema:**

| Rol | Descripción | Acceso |
|---|---|---|
| `admin` | Administrador total | Todos los endpoints, incluyendo crear usuarios y eliminar recursos |
| `editor` | Editor de contenido | Lectura y escritura (upsert), sin eliminación |
| `viewer` | Solo lectura | Solo endpoints GET |

**Cómo usar `authorize` en un router:**

```typescript
// Solo admins pueden eliminar
router.delete("/remove/:id", authenticate, authorize("admin"), AreaController.remove);

// Admins y editors pueden crear/actualizar
router.post("/upsert", authenticate, authorize("admin", "editor"), AreaController.upsert);

// Todos los roles autenticados pueden leer
router.get("/getAll", authenticate, AreaController.getAll);
```

### 12.4 Refresh Tokens y Rotación

El service de auth sigue el mismo patrón de capas que el resto del sistema: usa `models/user.ts` para acceder a la BD, no hace queries directamente.

```typescript
// src/queries/user.ts
export const getByEmail = `SELECT app.user_get_by_email($1) AS data`;
export const getById = `SELECT app.user_get_by_id($1) AS data`;
export const insertRefreshToken = `SELECT app.user_refresh_token_insert($1, $2, $3) AS data`;
export const getRefreshTokenByHash = `SELECT app.user_refresh_token_get_by_hash($1) AS data`;
export const revokeRefreshToken = `SELECT app.user_refresh_token_revoke($1) AS data`;
export const revokeAllRefreshTokens = `SELECT app.user_refresh_tokens_revoke_all($1) AS data`;
export const blacklistToken = `SELECT app.token_blacklist_insert($1, $2, $3) AS data`;
```

```typescript
// src/models/user.ts
import pool from "../utils/database";
import * as queries from "../queries/user";
import { User, UserPublic } from "../interfaces/models/user";

export async function getByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const result = await pool.query(queries.getByEmail, [email]);
  return result.rows[0].data ?? null;
}

export async function getById(id: string): Promise<UserPublic | null> {
  const result = await pool.query(queries.getById, [id]);
  return result.rows[0].data ?? null;
}

export async function insertRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(queries.insertRefreshToken, [userId, tokenHash, expiresAt]);
}

// Incluye tokens revocados: así se detecta el reuso (Theft Detection).
export async function getRefreshTokenByHash(
  tokenHash: string,
): Promise<{ id: string; userId: string; expiresAt: string; revokedAt: string | null } | null> {
  const result = await pool.query(queries.getRefreshTokenByHash, [tokenHash]);
  return result.rows[0].data ?? null; // función de auth: retorna JSON crudo o NULL (rulesproyect Parte II §13.4)
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await pool.query(queries.revokeRefreshToken, [tokenId]);
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await pool.query(queries.revokeAllRefreshTokens, [userId]);
}

export async function blacklistToken(
  jti: string,
  userId: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(queries.blacklistToken, [jti, userId, expiresAt]);
}
```

```typescript
// src/services/auth.ts
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as UserModel from "../models/user";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt";
import { TokenPair, JwtPayload } from "../interfaces/auth";
import { UserPublic } from "../interfaces/models/user";
import { UnauthorizedError } from "../utils/errors";
import logger from "../utils/logger";

const SALT_ROUNDS = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Los refresh tokens se guardan como SHA-256, NO con bcrypt.
 * bcrypt solo considera los primeros 72 bytes y en un JWT esos bytes (header + inicio de `sub`)
 * son idénticos para todos los tokens del mismo usuario: un token viejo "coincidiría" con el hash
 * del nuevo y la detección de robo nunca se activaría. SHA-256 es determinista (permite buscar
 * por hash) y es seguro porque el token ya es un valor aleatorio de alta entropía.
 */
const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Login: verifica credenciales y retorna par de tokens.
 * IMPORTANTE: los mensajes de error son deliberadamente genéricos
 * para evitar enumeración de usuarios (no revelar si el email existe).
 */
export async function login(email: string, password: string): Promise<TokenPair> {
  const user = await UserModel.getByEmail(email);

  if (!user) {
    // Ejecutar hash igualmente para prevenir timing attacks
    // (así un email inexistente tarda lo mismo que uno incorrecto)
    await bcrypt.hash(password, SALT_ROUNDS);
    throw new UnauthorizedError("Credenciales inválidas");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError("Credenciales inválidas");
  }

  if (!user.isActive) {
    throw new UnauthorizedError("Credenciales inválidas"); // No revelar que el usuario está inactivo
  }

  const tokenPair = generateTokenPair({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  // Guardar el SHA-256 del refresh token en BD
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await UserModel.insertRefreshToken(user.id, hashToken(tokenPair.refreshToken), expiresAt);

  return tokenPair;
}

/**
 * Refresh: rota el refresh token (el antiguo queda invalidado).
 * Implementa "Refresh Token Rotation":
 * Si un refresh token revocado se reutiliza → se invalidan TODOS
 * los tokens del usuario (posible robo detectado).
 */
export async function refresh(currentRefreshToken: string): Promise<TokenPair> {
  let decoded: JwtPayload;

  try {
    decoded = verifyRefreshToken(currentRefreshToken);
  } catch {
    throw new UnauthorizedError("Refresh token inválido o expirado");
  }

  const stored = await UserModel.getRefreshTokenByHash(hashToken(currentRefreshToken));

  // No existe o no pertenece al usuario del token
  if (!stored || stored.userId !== decoded.sub) {
    throw new UnauthorizedError("Refresh token inválido");
  }

  // Reuso de un token ya revocado → posible robo: cerrar TODAS las sesiones
  if (stored.revokedAt) {
    logger.error(
      { userId: decoded.sub },
      "Posible robo de refresh token: reuso de token revocado",
    );
    await UserModel.revokeAllRefreshTokens(decoded.sub);
    throw new UnauthorizedError("Refresh token inválido");
  }

  if (new Date(stored.expiresAt) <= new Date()) {
    throw new UnauthorizedError("Refresh token inválido o expirado");
  }

  // Revocar el token actual (rotación)
  await UserModel.revokeRefreshToken(stored.id);

  // Obtener datos actualizados del usuario
  const user = await UserModel.getById(decoded.sub);
  if (!user) throw new UnauthorizedError("Usuario no encontrado");

  // Generar nuevo par de tokens
  const newTokenPair = generateTokenPair({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  // Guardar el SHA-256 del nuevo refresh token
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await UserModel.insertRefreshToken(user.id, hashToken(newTokenPair.refreshToken), expiresAt);

  return newTokenPair;
}

/**
 * Me: retorna el perfil del usuario autenticado.
 */
export async function me(userId: string): Promise<UserPublic> {
  const user = await UserModel.getById(userId);
  if (!user) throw new UnauthorizedError("Usuario no encontrado");
  return user;
}
```

> **Refresh Token Rotation:** Cada vez que se usa un refresh token, se genera uno nuevo y el anterior se revoca. Si un refresh token revocado se reutiliza, se invalidan **todos** los tokens del usuario, asumiendo que hubo un robo.

### 12.5 Blacklisting de Tokens

Para revocar access tokens antes de su expiración natural (ej: en logout), se mantiene una blacklist en BD:

```sql
-- Tabla para tokens revocados (job de limpieza: ver sección 24)
CREATE TABLE app.token_blacklist (
  jti         VARCHAR(36) PRIMARY KEY,
  user_id     UUID NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para refresh tokens
CREATE TABLE app.refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app.users(id),
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Job de limpieza (ejecutar diariamente con pg_cron o similar)
-- Excepción permitida al soft delete: son tablas técnicas de sesión, no datos de dominio.
DELETE FROM app.token_blacklist WHERE expires_at < NOW();
DELETE FROM app.refresh_tokens WHERE expires_at < NOW();
```

> **Producción con alto tráfico:** Usar Redis como store de blacklist (consulta O(1), TTL automático). La verificación de blacklist en el middleware `authenticate` quedaría así:
> ```typescript
> const isBlacklisted = await redis.get(`blacklist:${payload.jti}`);
> if (isBlacklisted) { /* 401 */ }
> ```

---

## 13. Manejo de Sesiones

### 13.1 Estrategia Stateless vs Stateful

| Aspecto | Stateless (JWT) | Stateful (Sesiones en servidor) |
| -------------------- | ---------------------------- | ------------------------------- |
| Almacenamiento | Token en cliente | Sesión en servidor (Redis/BD) |
| Escalabilidad | Alta (sin estado compartido) | Requiere store compartido |
| Revocación inmediata | Requiere blacklist | Nativa (eliminar sesión) |
| Ideal para | APIs REST, microservicios | Apps monolíticas, admin panels |

**Esta guía usa un enfoque híbrido:** JWT stateless para access tokens (rendimiento) con refresh tokens almacenados en BD (control de revocación) y entregados en cookies httpOnly (seguridad).

### 13.2 Flujo Completo de Autenticación

```
┌──────────┐                           ┌──────────┐                    ┌──────────┐
│  Cliente  │                           │   API    │                    │    BD    │
└────┬─────┘                           └────┬─────┘                    └────┬─────┘
     │  POST /auth/login                     │                              │
     │  { email, password }                  │                              │
     │──────────────────────────────────────>│                              │
     │                                       │  Verificar credenciales      │
     │                                       │─────────────────────────────>│
     │                                       │<─────────────────────────────│
     │                                       │  Guardar refresh hash en BD  │
     │                                       │─────────────────────────────>│
     │  { accessToken } (body JSON)          │                              │
     │  Set-Cookie: refreshToken (httpOnly)  │                              │
     │<──────────────────────────────────────│                              │
     │                                       │                              │
     │  GET /api/v1/areas/getAll             │                              │
     │  Authorization: Bearer <accessToken>  │                              │
     │──────────────────────────────────────>│                              │
     │                                       │  Verificar JWT               │
     │  { success: true, data: [...] }       │                              │
     │<──────────────────────────────────────│                              │
     │                                       │                              │
     │  [Access token expira en 15 min]      │                              │
     │                                       │                              │
     │  POST /auth/refresh                   │                              │
     │  (cookie refreshToken enviada auto)   │                              │
     │──────────────────────────────────────>│                              │
     │                                       │  Verificar + revocar actual  │
     │                                       │  Guardar nuevo hash en BD    │
     │                                       │─────────────────────────────>│
     │  { accessToken } (body JSON)          │                              │
     │  Set-Cookie: refreshToken (httpOnly)  │                              │
     │<──────────────────────────────────────│                              │
```

### 13.3 Logout y Revocación

```typescript
// src/controllers/auth.ts
import { Request, Response, NextFunction } from "express";
import * as AuthService from "../services/auth";
import * as UserModel from "../models/user";
import { sendResponse } from "../utils/sendResponse";
import logger from "../utils/logger";

/**
 * Configuración de la cookie del refresh token.
 * Se usa tanto en login como en refresh para consistencia.
 */
function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,                // No accesible desde JavaScript
    secure: true,                  // Solo HTTPS
    sameSite: "strict",            // Previene CSRF
    path: "/auth/refresh",         // Solo se envía al endpoint de refresh
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
  });
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;
    const tokens = await AuthService.login(email, password);

    // Refresh token en cookie httpOnly — inaccesible para JS
    setRefreshTokenCookie(res, tokens.refreshToken);

    // Solo el access token va en el body
    sendResponse(req, res, { accessToken: tokens.accessToken }, 200);
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // El refresh token viene de la cookie httpOnly, no del body
    const refreshToken = req.cookies?.refreshToken as string;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        data: null,
        error: "Refresh token no proporcionado",
      });
      return;
    }

    const tokens = await AuthService.refresh(refreshToken);

    setRefreshTokenCookie(res, tokens.refreshToken);
    sendResponse(req, res, { accessToken: tokens.accessToken }, 200);
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;

    // 1. Blacklistear el access token actual (para invalidarlo antes de su expiración)
    if (user.jti && user.exp) {
      await UserModel.blacklistToken(
        user.jti,
        user.sub,
        new Date(user.exp * 1000),
      );
    }

    // 2. Revocar todos los refresh tokens del usuario
    await UserModel.revokeAllRefreshTokens(user.sub);

    // 3. Limpiar la cookie del refresh token
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/auth/refresh",
    });

    sendResponse(req, res, { message: "Sesión cerrada correctamente" }, 200);
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await AuthService.me(req.user!.sub);
    sendResponse(req, res, user, 200);
  } catch (err) {
    next(err);
  }
}
```

> **Nota sobre el schema de auth:** El endpoint `/auth/refresh` lee el token de la cookie httpOnly, no del body. El schema `refreshSchema` en `schemas/auth.ts` ya no es necesario para este endpoint. El router de auth no aplica `validateRequest` en `/refresh`.

---

## 14. Middlewares

### Error Handler Centralizado

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Recurso") {
    super(`${resource} no encontrado`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Datos de entrada inválidos") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "No autorizado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Acceso denegado") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "El recurso ya existe") {
    super(message, 409);
  }
}
```

```typescript
// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import logger from "../utils/logger";
import config from "../utils/config";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    // Errores no operacionales (bugs, estados inconsistentes) → fatal
    if (!err.isOperational) {
      logger.fatal(
        {
          err,
          stack: err.stack,   // stack trace siempre en fatal
          url: req.originalUrl,
          method: req.method,
        },
        "Error no operacional — requiere atención inmediata",
      );
    } else {
      // Errores operacionales (NotFound, Unauthorized, etc.) → error sin stack en prod
      logger.error({
        err: err.message,
        statusCode: err.statusCode,
        url: req.originalUrl,
        method: req.method,
        // Stack trace solo en desarrollo: en producción infla los logs innecesariamente
        ...(config.isDev && { stack: err.stack }),
      });
    }

    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: err.message,
    });
    return;
  }

  // Error inesperado (bug, error de programación, librería externa, etc.)
  logger.fatal(
    {
      err,
      stack: err.stack,   // stack trace siempre en errores inesperados
      url: req.originalUrl,
      method: req.method,
    },
    "Error inesperado no controlado",
  );

  res.status(500).json({
    success: false,
    data: null,
    // NUNCA exponer stack trace, mensaje interno ni detalles al cliente
    error: "Error interno del servidor",
  });
}
```

**Mapeo de clases de error → códigos HTTP:**

| Clase | Código | Cuándo usarla |
|---|---|---|
| `ValidationError` | 400 | Input inválido que Zod no atrapó, regla de negocio violada |
| `UnauthorizedError` | 401 | Token ausente, expirado o inválido; credenciales incorrectas |
| `ForbiddenError` | 403 | Token válido pero rol insuficiente para la operación |
| `NotFoundError` | 404 | Recurso no existe o fue eliminado (soft delete) |
| `ConflictError` | 409 | Violación de unicidad (email duplicado, nombre ya existe) |
| `AppError` (genérico) | cualquiera | Base para crear errores con código HTTP personalizado |

> **Regla:** El stack trace **nunca** debe llegar al cliente ni a logs de producción en errores operacionales. En desarrollo (`config.isDev = true`) sí aparece en logs para facilitar el debugging. Los errores inesperados (500) siempre loguean el stack, independiente del entorno, porque indican un bug que debe investigarse.

### Not Found Handler

```typescript
// src/middlewares/notFoundHandler.ts
import { Request, Response } from "express";
import logger from "../utils/logger";

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn(
    { url: req.originalUrl, method: req.method },
    "Ruta no encontrada",
  );

  res.status(404).json({
    success: false,
    data: null,
    error: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
  });
}
```

### Request Logger con Request ID

```typescript
// src/middlewares/requestLogger.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import logger from "../utils/logger";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generar o reutilizar un Request ID para trazabilidad entre servicios
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, "Request completado con error");
    } else {
      logger.info(logData, "Request completado");
    }
  });

  next();
}
```

> **Request ID:** Permite rastrear una petición a través de múltiples servicios y logs. El cliente puede enviar un `X-Request-ID` propio (útil para debugging desde el frontend) o el servidor genera uno automáticamente.

---

## 15. Routes (Rutas)

### Convención de Rutas — Verbos Explícitos

Las rutas usan verbos explícitos en lugar de REST puro. Esta decisión evita ambigüedad en el endpoint `upsert` (que combina create y update) y hace las intenciones más legibles.

| Endpoint | Método | Auth requerida | Descripción |
| ------------------ | ------ | ---- | ----------------------------------------- |
| `/getAll` | GET | `authenticate` | Lista completa del recurso |
| `/getById/:id` | GET | `authenticate` | Un recurso por UUID |
| `/upsert` | POST | `authenticate` | Crear (sin `id`) o actualizar (con `id`) |
| `/remove/:id` | DELETE | `authenticate` + `authorize("admin")` | Eliminar por UUID |

### Router Index (registro central de rutas)

```typescript
// src/routers/index.ts
// Este archivo registra TODAS las rutas de la API bajo el prefijo /api/v1
// Para agregar una nueva entidad: importar su router y registrarlo aquí.
import { Router } from "express";
import areaRouter from "./area";
import userRouter from "./user";
// import productRouter from "./product"; // ← así se agrega una nueva entidad

const router = Router();

router.use("/areas", areaRouter);
router.use("/users", userRouter);
// router.use("/products", productRouter);

export default router;
```

### Router de Recurso

```typescript
// src/routers/{entity}.ts — Ejemplo con area
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validateRequest";
import { upsertAreaSchema } from "../schemas/area";
import * as AreaController from "../controllers/area";

const router = Router();

router.get("/getAll", authenticate, AreaController.getAll);
router.get("/getById/:id", authenticate, AreaController.getById);
router.post(
  "/upsert",
  authenticate,
  authorize("admin", "editor"),  // Solo admin y editor pueden crear/editar
  validateRequest(upsertAreaSchema, "body"),
  AreaController.upsert,
);
router.delete(
  "/remove/:id",
  authenticate,
  authorize("admin"),            // Solo admin puede eliminar
  AreaController.remove,
);

export default router;
```

### Router de Auth

```typescript
// src/routers/auth.ts
// No tiene /register. Los usuarios se crean vía /users/upsert (protegido por admin).
import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { authLimiter } from "../middlewares/rateLimiter";  // authLimiter vive en rateLimiter, no en auth
import { validateRequest } from "../middlewares/validateRequest";
import { loginSchema } from "../schemas/auth";
import * as AuthController from "../controllers/auth";

const router = Router();

// authLimiter solo en login: protección contra brute force
router.post("/login", authLimiter, validateRequest(loginSchema, "body"), AuthController.login);

// /refresh lee el token de la cookie httpOnly, no del body
router.post("/refresh", AuthController.refresh);

// logout requiere estar autenticado
router.post("/logout", authenticate, AuthController.logout);

// me retorna el perfil del usuario autenticado
router.get("/me", authenticate, AuthController.me);

export default router;
```

> **¿Por qué no hay `/register` público?** Los usuarios se crean a través del endpoint `/users/upsert` protegido por autenticación (solo un admin puede crear usuarios). Esto elimina el vector de registro masivo/spam y centraliza el control de acceso.

---

## 16. Controllers (Controladores)

Los controllers son adaptadores HTTP puros: extraen datos del request, delegan al service, retornan la respuesta estándar. **No contienen lógica de negocio ni condicionales de dominio.** Si el controller necesita más de una línea de lógica, esa lógica pertenece al service.

```typescript
// src/controllers/{entity}.ts — Ejemplo con area
import { Request, Response, NextFunction } from "express";
import * as AreaService from "../services/area";
import { sendResponse } from "../utils/sendResponse";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await AreaService.getAll();
    sendResponse(req, res, result);
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const item = await AreaService.getById(id);
    sendResponse(req, res, item);
  } catch (err) {
    next(err);
  }
}

export async function upsert(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await AreaService.upsert(req.body);
    sendResponse(req, res, item, 201);
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await AreaService.remove(id);
    sendResponse(req, res, result);
  } catch (err) {
    next(err);
  }
}
```

---

## 17. Services (Capa de Servicio)

Los services contienen **toda la lógica de negocio**: validaciones de dominio, cálculos, orquestación de múltiples models, y lanzamiento de errores de negocio.

**Reglas:**
- El service nunca importa nada de `express` (ni Request, ni Response).
- El service solo lanza errores de `utils/errors.ts`.
- El service puede llamar a múltiples models si la lógica lo requiere.

```typescript
// src/services/{entity}.ts — Ejemplo con area
import * as AreaModel from "../models/area";
import { NotFoundError } from "../utils/errors";
import { Area } from "../interfaces/models/area";
import { UpsertAreaInput } from "../schemas/area";

export async function getAll(): Promise<Area[]> {
  return AreaModel.getAll();
}

export async function getById(id: string): Promise<Area> {
  const item = await AreaModel.getById(id);
  if (!item) throw new NotFoundError("Área");
  return item;
}

export async function upsert(data: UpsertAreaInput): Promise<Area> {
  // Sin id → crear; con id → actualizar (la función de BD decide)
  const item = await AreaModel.upsert(data.name, data.id ?? null);
  if (!item) throw new NotFoundError("Área"); // se pidió actualizar un id que no existe
  return item;
}

export async function remove(id: string): Promise<Area[]> {
  const existing = await AreaModel.getById(id);
  if (!existing) throw new NotFoundError("Área");
  // Regla obligatoria (rulesproyect §10): antes de borrar, verificar que no existan
  // registros activos vinculados y abortar con un error de negocio si los hay.
  // await assertNoActiveDependencies(id);
  return (await AreaModel.deleteById(id)) ?? [];
}
```

---

## 18. Models (Modelos)

Los models son la **única capa que habla con PostgreSQL**. Llaman las funciones del esquema `app`, leen `result.rows[0].data` (el sobre `{ status, data }`) y lo traducen con `unwrap`: `success` → dato, `not_found` → `null`, `error` → se registra con Pino y se lanza un error genérico (el `SQLERRM` nunca llega al cliente). Regla de `rulesproyect.md` Parte II §12.

```typescript
// src/utils/dbResponse.ts
import logger from "./logger";

interface DbResponse<T> {
  status: "success" | "not_found" | "error";
  data: T | null;
  message?: string;
  count?: number;
}

export function unwrap<T>(res: DbResponse<T>): T | null {
  if (res.status === "success") return res.data;
  if (res.status === "not_found") return null;
  logger.error({ dbMessage: res.message }, "Stored function error");
  throw new Error("DATABASE_ERROR"); // el errorHandler lo traduce a un 500 genérico
}
```

```typescript
// src/models/{entity}.ts — Ejemplo con area
import pool from "../utils/database";
import * as queries from "../queries/area";
import { Area } from "../interfaces/models/area";
import { unwrap } from "../utils/dbResponse";

export async function getAll(): Promise<Area[]> {
  const result = await pool.query(queries.getAll);
  return unwrap<Area[]>(result.rows[0].data) ?? [];
}

export async function getById(id: string): Promise<Area | null> {
  const result = await pool.query(queries.getById, [id]);
  return unwrap<Area>(result.rows[0].data); // null si no existe
}

export async function upsert(name: string, id: string | null): Promise<Area | null> {
  const result = await pool.query(queries.upsert, [name, id]);
  return unwrap<Area>(result.rows[0].data); // null si el id a actualizar no existe
}

export async function deleteById(id: string): Promise<Area[] | null> {
  const result = await pool.query(queries.deleteById, [id]);
  return unwrap<Area[]>(result.rows[0].data); // lista actualizada, o null si no existía
}
```

> Las funciones de auth (§12.4) son la excepción documentada: retornan JSON crudo o `NULL`, sin sobre, por eso su model no usa `unwrap`.

---

## 19. Queries

Las queries son strings que llaman **funciones de PostgreSQL** del esquema `app`. No contienen SQL inline, siempre con parámetros posicionales.

```typescript
// src/queries/{entity}.ts — Ejemplo con area
export const getAll     = `SELECT app.area_get_all() AS data`;
export const getById    = `SELECT app.area_get_by_id($1) AS data`;
export const upsert     = `SELECT app.area_upsert($1, $2) AS data`; // $1 = name, $2 = id (NULL → crear)
export const deleteById = `SELECT app.area_delete_by_id($1) AS data`;
```

**Convención de nombres de funciones** (igual que `rulesproyect.md` Parte II §7):

| Acción | Función |
|---|---|
| Listar todos | `app.{entity}_get_all()` |
| Buscar por ID | `app.{entity}_get_by_id(p_id)` |
| Filtros opcionales | `app.{entity}_get_by_fields(...)` |
| Crear/Actualizar | `app.{entity}_upsert(p_campos..., p_id DEFAULT NULL)`: el `id` va **al final** |
| Eliminar (soft delete) | `app.{entity}_delete_by_id(p_id)` |

> **Por qué funciones:** el acceso a datos, joins e integridad viven en la BD; la API solo orquesta llamadas. La app solo tiene permiso `EXECUTE` sobre las funciones, nunca acceso directo a las tablas.

---

## 20. Schemas (Validación)

Cada recurso tiene un único `upsertXxxSchema` con el campo `id` opcional. La presencia de `id` determina si el stored procedure crea o actualiza el registro.

```typescript
// src/schemas/{entity}.ts — Ejemplo con area
import { z } from "zod";

export const upsertAreaSchema = z.object({
  id: z.string().uuid().optional(),   // ausente → INSERT, presente → UPDATE
  name: z.string().min(1, "El nombre es requerido").max(255).trim(),
});

export type UpsertAreaInput = z.infer<typeof upsertAreaSchema>;
```

**Schema de auth:**

```typescript
// src/schemas/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("El email no es válido").max(255).trim().toLowerCase(),
  password: z.string().min(1, "La contraseña es requerida"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

> **¿Por qué un solo schema upsert?** Elimina duplicación y divergencia entre schemas de create y update. El stored procedure en PostgreSQL maneja la lógica `INSERT ... ON CONFLICT DO UPDATE` (o `IF id IS NULL THEN INSERT ELSE UPDATE`) internamente.

---

## 21. Utilidades

### sendResponse

Helper que garantiza un formato de respuesta consistente en toda la API:

```typescript
// src/utils/sendResponse.ts
import { Request, Response } from "express";

export function sendResponse<T>(
  req: Request,
  res: Response,
  data: T,
  statusCode: number = 200,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    error: null,
    requestId: req.headers["x-request-id"],
  });
}
```

**Formato de respuesta estándar:**

```json
// Respuesta exitosa
{
  "success": true,
  "data": { "id": "...", "name": "..." },
  "error": null,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}

// Respuesta de error (generada por errorHandler)
{
  "success": false,
  "data": null,
  "error": "Área no encontrada"
}
```

---

## 22. Archivos Principales (app.ts y server.ts)

### app.ts

```typescript
// src/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import config from "./utils/config";
import { securityHeaders } from "./middlewares/securityHeaders";
import { corsMiddleware } from "./middlewares/cors";
import { generalLimiter } from "./middlewares/rateLimiter";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFoundHandler";
import router from "./routers";
import authRouter from "./routers/auth";

const app = express();

// ─── Confianza en Proxy/LB (obligatorio si está detrás de nginx, AWS ALB, etc.) ───
app.set("trust proxy", 1);

// ─── Middlewares de Seguridad (el orden importa) ───
app.use(securityHeaders);   // Headers de seguridad (Helmet) — primero siempre
app.use(corsMiddleware);    // CORS — antes de parsear el body
app.use(generalLimiter);   // Rate limiting global
app.use(hpp());            // HTTP Parameter Pollution

// ─── Parseo de Body y Cookies ───
app.use(express.json({ limit: "10kb" }));                       // Limitar tamaño del body (protección DoS)
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(cookieParser());                                         // Para leer refresh tokens en cookies

// ─── Logging de Requests ───
app.use(requestLogger);

// ─── Health Check (sin autenticación, para load balancers y orquestadores) ───
app.get("/health", async (_req, res) => {
  // Health check enriquecido: verifica conectividad a la BD
  try {
    const { default: pool } = await import("./utils/database");
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();

    res.status(200).json({
      status: "ok",
      service: config.apiName,
      version: config.apiVersion,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: "connected",
    });
  } catch {
    res.status(503).json({
      status: "error",
      service: config.apiName,
      timestamp: new Date().toISOString(),
      db: "disconnected",
    });
  }
});

// ─── Rutas de Autenticación ───
app.use("/auth", authRouter);

// ─── Rutas de la API (con prefijo de versión) ───
app.use(`/api/${config.apiVersion}`, router);

// ─── Manejo de errores (SIEMPRE al final, después de todas las rutas) ───
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

### server.ts

```typescript
// src/server.ts
import config from "./utils/config";
import logger from "./utils/logger";
import { testConnection } from "./utils/database";
import app from "./app";

async function startServer(): Promise<void> {
  // Verificar conexión a BD antes de aceptar requests
  // Si falla, el proceso termina con exit(1)
  await testConnection();

  const server = app.listen(config.apiPort, () => {
    logger.info(
      {
        port: config.apiPort,
        env: config.nodeEnv,
        version: config.apiVersion,
      },
      `${config.apiName} iniciado correctamente`,
    );
  });

  // ─── Graceful Shutdown ───
  const shutdown = async (signal: string) => {
    logger.info(`Señal ${signal} recibida. Cerrando servidor...`);

    server.close(async () => {
      logger.info("Servidor HTTP cerrado. Cerrando pool de BD...");

      try {
        const pool = (await import("./utils/database")).default;
        await pool.end();
        logger.info("Pool de base de datos cerrado. Saliendo.");
      } catch (err) {
        logger.error({ err }, "Error al cerrar pool de base de datos");
      }

      process.exit(0);
    });

    // Forzar cierre si las conexiones activas tardan más de 30 segundos
    setTimeout(() => {
      logger.error("Cierre forzado después de 30 segundos");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM")); // Kubernetes, Docker stop
  process.on("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C local

  // Capturar errores no manejados a nivel de proceso
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled Rejection — cerrando proceso");
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "Uncaught Exception — cerrando proceso");
    process.exit(1);
  });
}

startServer();
```

> **Graceful shutdown:** Crítico en Kubernetes y Docker. Al recibir `SIGTERM`, el servidor deja de aceptar conexiones nuevas, espera que las activas terminen, cierra el pool de BD, y sale limpiamente. Sin esto, las conexiones en vuelo se cortan abruptamente.

---

## 23. Docker

### .dockerignore

```dockerignore
node_modules
dist
.env
.env.*
.git
.gitignore
coverage
tests
migrations
*.md
.vscode
.idea
```

### Dockerfile (Multi-stage Build)

```dockerfile
# ─── Etapa 1: Build ───
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN yarn build

# ─── Etapa 2: Producción ───
FROM node:22-alpine AS production

RUN apk add --no-cache tzdata dumb-init
ENV TZ=America/Santiago

# Ejecutar como usuario no-root (principio de menor privilegio)
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/dist ./dist

# NUNCA copiar .env dentro de la imagen Docker
# Las variables de entorno se inyectan en runtime via orquestador o env_file

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# dumb-init maneja señales correctamente (graceful shutdown desde PID 1)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### docker-compose.yml (Solo para desarrollo local)

```yaml
# ATENCIÓN: Este archivo es SOLO para desarrollo local.
# En producción, las variables se inyectan via orquestador (K8s secrets, ECS task definition, etc.)
# y NUNCA se usa env_file con el .env real.
version: "3.8"

services:
  api:
    build:
      context: .
      target: production
    ports:
      - "3001:3001"
    env_file: .env         # Solo en desarrollo — en prod las variables se inyectan externamente
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d  # Ejecuta migrations al crear el contenedor
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

**Mejoras del Dockerfile:**
- **Multi-stage build:** Reduce tamaño de imagen ~60% al no incluir dependencias de build ni código TypeScript.
- **Usuario no-root:** El proceso corre como `appuser` (UID 1001), no como root.
- **NO se copia `.env`:** Las variables se inyectan en runtime.
- **HEALTHCHECK:** Permite a Docker/Kubernetes saber si el servicio está listo para recibir tráfico.
- **dumb-init:** Manejo correcto de señales en PID 1 para graceful shutdown.

---

## 24. Gestión del Schema de Base de Datos

El proyecto usa **migraciones SQL versionadas** en la carpeta `migrations/`. Cada archivo es incremental y se nombra con un número secuencial.

### Estructura de Migraciones

```
migrations/
├── 001_initial_schema.sql   # Schema base: tablas de usuarios y roles
├── 002_auth_tokens.sql      # Tablas para refresh tokens y blacklist
└── 003_areas.sql            # Ejemplo: entidad area
```

> **Convención:** Los números son secuenciales y nunca se reeditan. Si hay un error en una migración ya desplegada, se crea una nueva migración que lo corrige. Nunca modificar un archivo de migración existente.

### Migración Base: Schema de Auth y entidades

**No copiar SQL desde esta guía.** La fuente única y vigente del SQL es `rulesproyect.md`, Parte II:

| Migración | Qué copiar de `rulesproyect.md` Parte II |
|---|---|
| `001_initial_schema.sql` | `CREATE SCHEMA IF NOT EXISTS app;` + tabla `app.users` (§13.1, índice único parcial sobre `LOWER(TRIM(email))`) |
| `002_auth_tokens.sql` | `app.refresh_tokens` con índice único sobre `token_hash` (§13.2), `app.token_blacklist` (§13.3) y las funciones de auth (§13.4), incluida `user_refresh_token_get_by_hash` |
| `003_area.sql` (ejemplo) | Tabla en singular con columnas estándar `timestamptz` (§2) y funciones `area_get_all`, `area_get_by_id`, `area_upsert(p_name, p_id)`, `area_delete_by_id` (§7, §14) |

Recordatorios que esta guía tenía mal en versiones anteriores y que la Parte II ya corrige:
- Todas las fechas son `timestamptz`; `updated_at` es `NULL` al crear.
- Toda función es `SECURITY DEFINER` con `SET search_path = app, pg_temp` y retorna el sobre `jsonb` `{status, data}` (salvo las de auth, §13.4).
- Un índice parcial no puede usar `NOW()` en su `WHERE` (PostgreSQL exige funciones `IMMUTABLE`); el filtro de expiración va en la consulta.
- Tablas nuevas en singular (`app.area`, no `app.areas`).

### Limpieza Periódica

Configurar un job (pg_cron, cron del sistema, o task de Kubernetes) para limpiar tokens expirados diariamente:

```sql
-- Ejecutar diariamente (por ejemplo, a las 2 AM)
-- Excepción permitida al soft delete: son tablas técnicas de sesión, no datos de dominio.
DELETE FROM app.token_blacklist WHERE expires_at < NOW();
DELETE FROM app.refresh_tokens WHERE expires_at < NOW();  -- expirados ya no sirven para detectar reuso
```

---

## 25. Testing

### Configuración de Vitest

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "src/server.ts",           // Punto de entrada, difícil de testear
        "src/utils/config.ts",     // Configuración de entorno
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Setup de Tests

```typescript
// tests/setup.ts
import { vi } from "vitest";

// Mock del módulo de base de datos para tests unitarios
// Los tests unitarios nunca deben conectarse a una BD real
vi.mock("../src/utils/database", () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  },
}));
```

### Test Unitario de Service

```typescript
// tests/unit/services/area.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as AreaService from "../../../src/services/area";
import * as AreaModel from "../../../src/models/area";

vi.mock("../../../src/models/area");

const mockArea = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Tecnología",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AreaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("debería retornar el área si existe", async () => {
      vi.mocked(AreaModel.getById).mockResolvedValue(mockArea);

      const result = await AreaService.getById(mockArea.id);

      expect(result).toEqual(mockArea);
      expect(AreaModel.getById).toHaveBeenCalledWith(mockArea.id);
      expect(AreaModel.getById).toHaveBeenCalledTimes(1);
    });

    it("debería lanzar NotFoundError si no existe", async () => {
      vi.mocked(AreaModel.getById).mockResolvedValue(null);

      await expect(AreaService.getById("id-inexistente")).rejects.toThrow("Área no encontrado");
    });
  });

  describe("upsert", () => {
    it("debería crear un área sin id (INSERT)", async () => {
      vi.mocked(AreaModel.upsert).mockResolvedValue(mockArea);

      const result = await AreaService.upsert({ name: "Tecnología" });

      expect(AreaModel.upsert).toHaveBeenCalledWith(null, "Tecnología");
      expect(result).toEqual(mockArea);
    });

    it("debería actualizar un área con id (UPDATE)", async () => {
      vi.mocked(AreaModel.upsert).mockResolvedValue({ ...mockArea, name: "Tech" });

      const result = await AreaService.upsert({ id: mockArea.id, name: "Tech" });

      expect(AreaModel.upsert).toHaveBeenCalledWith(mockArea.id, "Tech");
      expect(result.name).toBe("Tech");
    });
  });

  describe("remove", () => {
    it("debería lanzar NotFoundError si el área a eliminar no existe", async () => {
      vi.mocked(AreaModel.getById).mockResolvedValue(null);

      await expect(AreaService.remove("id-inexistente")).rejects.toThrow("Área no encontrado");
      expect(AreaModel.remove).not.toHaveBeenCalled();
    });
  });
});
```

### Test de Integración (con supertest)

```typescript
// tests/integration/routes/area.test.ts
import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../../src/app";
import * as AreaService from "../../../src/services/area";
import * as jwt from "../../../src/utils/jwt";

// Mock del service para no necesitar BD real
vi.mock("../../../src/services/area");

// Mock de JWT para autenticar requests de prueba
const mockUser = {
  sub: "user-123",
  email: "test@example.com",
  role: "admin",
};

function getAuthHeader(): string {
  const token = jwt.generateTokenPair(mockUser).accessToken;
  return `Bearer ${token}`;
}

describe("GET /api/v1/areas/getAll", () => {
  const mockAreas = [
    { id: "1", name: "Tecnología", createdAt: new Date(), updatedAt: new Date() },
  ];

  it("debería retornar 200 con la lista de áreas", async () => {
    vi.mocked(AreaService.getAll).mockResolvedValue(mockAreas);

    const response = await request(app)
      .get("/api/v1/areas/getAll")
      .set("Authorization", getAuthHeader());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  it("debería retornar 401 sin token", async () => {
    const response = await request(app).get("/api/v1/areas/getAll");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
```

### Estructura de Tests

```
tests/
├── setup.ts                        # Setup global (mocks de BD)
├── unit/
│   ├── services/
│   │   ├── area.test.ts
│   │   └── auth.test.ts
│   └── utils/
│       ├── jwt.test.ts
│       └── errors.test.ts
└── integration/
    └── routes/
        ├── area.test.ts
        └── auth.test.ts
```

**Qué testear en cada capa:**

| Capa | Qué testear | Qué mockear |
|---|---|---|
| **Service** | Lógica de negocio, errores lanzados | Models (no BD real) |
| **Controller** | Códigos HTTP, formato de respuesta | Services |
| **Integration** | Flujo completo request → response | Services (o nada para tests E2E) |
| **Utils** | jwt, errors | Nada (son funciones puras) |

---

## 26. Scripts de Ejecución

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "db:migrate": "psql $DATABASE_URL -f migrations/$(ls migrations/ | tail -1)"
  }
}
```

| Script | Cuándo usarlo |
|---|---|
| `yarn dev` | Desarrollo local con hot reload |
| `yarn build` | Compilar TypeScript a JavaScript |
| `yarn start` | Producción (requiere `yarn build` previo) |
| `yarn test` | CI/CD y verificación previa al merge |
| `yarn test:watch` | Desarrollo de tests |
| `yarn test:coverage` | Verificar cobertura |
| `yarn typecheck` | Verificar tipos sin compilar |

---

## 27. Cómo Agregar una Nueva Entidad

Esta sección describe el proceso completo para agregar una nueva entidad al sistema. Usar como checklist en cada feature nueva.

**Ejemplo: agregar la entidad `Product`**

### Paso 1: Migración SQL

Crear `migrations/004_product.sql` siguiendo `rulesproyect.md` Parte II §14 (tabla en singular, columnas estándar `timestamptz`, índice único natural y funciones con el sobre `{status, data}`):

```sql
CREATE TABLE app.product (
  id          uuid DEFAULT gen_random_uuid() NOT NULL,
  name        varchar(255) NOT NULL,
  price       numeric(10, 2) NOT NULL,
  area_id     uuid NULL REFERENCES app.area(id),
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz NULL,
  deleted_at  timestamptz NULL,
  CONSTRAINT product_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX product_idx ON app.product (UPPER(TRIM(name))) WHERE deleted_at IS NULL;

-- Funciones: copiar los patrones de la Parte II §7 (todas RETURNS jsonb,
-- SECURITY DEFINER y SET search_path = app, pg_temp)
-- app.product_get_all()
-- app.product_get_by_id(p_id uuid)
-- app.product_upsert(p_name varchar, p_price numeric, p_area_id uuid, p_id uuid DEFAULT NULL)
-- app.product_delete_by_id(p_id uuid)
```

### Paso 2: Interface

```typescript
// src/interfaces/models/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  areaId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
```

### Paso 3: Schema de Validación

```typescript
// src/schemas/product.ts
import { z } from "zod";

export const upsertProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255).trim(),
  price: z.number().positive("El precio debe ser mayor a 0"),
  areaId: z.string().uuid().optional(),
});

export type UpsertProductInput = z.infer<typeof upsertProductSchema>;
```

### Paso 4: Queries

```typescript
// src/queries/product.ts
export const getAll = `SELECT app.product_get_all() AS data`;
export const getById = `SELECT app.product_get_by_id($1) AS data`;
export const upsert = `SELECT app.product_upsert($1, $2, $3, $4) AS data`; // name, price, areaId, id
export const deleteById = `SELECT app.product_delete_by_id($1) AS data`;
```

### Paso 5: Model

```typescript
// src/models/product.ts
import pool from "../utils/database";
import * as queries from "../queries/product";
import { Product } from "../interfaces/models/product";
import { UpsertProductInput } from "../schemas/product";
import { unwrap } from "../utils/dbResponse";

export async function getAll(): Promise<Product[]> {
  const result = await pool.query(queries.getAll);
  return unwrap<Product[]>(result.rows[0].data) ?? [];
}

export async function getById(id: string): Promise<Product | null> {
  const result = await pool.query(queries.getById, [id]);
  return unwrap<Product>(result.rows[0].data);
}

export async function upsert(data: UpsertProductInput): Promise<Product | null> {
  const result = await pool.query(queries.upsert, [
    data.name,
    data.price,
    data.areaId ?? null,
    data.id ?? null, // el id va al final, igual que en la función de BD
  ]);
  return unwrap<Product>(result.rows[0].data);
}

export async function deleteById(id: string): Promise<Product[] | null> {
  const result = await pool.query(queries.deleteById, [id]);
  return unwrap<Product[]>(result.rows[0].data);
}
```

### Paso 6: Service

```typescript
// src/services/product.ts
import * as ProductModel from "../models/product";
import { NotFoundError } from "../utils/errors";
import { Product } from "../interfaces/models/product";
import { UpsertProductInput } from "../schemas/product";

export async function getAll(): Promise<Product[]> {
  return ProductModel.getAll();
}

export async function getById(id: string): Promise<Product> {
  const item = await ProductModel.getById(id);
  if (!item) throw new NotFoundError("Producto");
  return item;
}

export async function upsert(data: UpsertProductInput): Promise<Product> {
  const item = await ProductModel.upsert(data);
  if (!item) throw new NotFoundError("Producto");
  return item;
}

export async function remove(id: string): Promise<Product[]> {
  const existing = await ProductModel.getById(id);
  if (!existing) throw new NotFoundError("Producto");
  // Validar dependencias activas antes de borrar (rulesproyect §10)
  return (await ProductModel.deleteById(id)) ?? [];
}
```

### Paso 7: Controller

```typescript
// src/controllers/product.ts
import { Request, Response, NextFunction } from "express";
import * as ProductService from "../services/product";
import { sendResponse } from "../utils/sendResponse";

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(req, res, await ProductService.getAll()); } catch (err) { next(err); }
}
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(req, res, await ProductService.getById(req.params.id)); } catch (err) { next(err); }
}
export async function upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(req, res, await ProductService.upsert(req.body), 201); } catch (err) { next(err); }
}
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(req, res, await ProductService.remove(req.params.id)); } catch (err) { next(err); }
}
```

### Paso 8: Router

```typescript
// src/routers/product.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validateRequest";
import { upsertProductSchema } from "../schemas/product";
import * as ProductController from "../controllers/product";

const router = Router();

router.get("/getAll", authenticate, ProductController.getAll);
router.get("/getById/:id", authenticate, ProductController.getById);
router.post("/upsert", authenticate, authorize("admin", "editor"), validateRequest(upsertProductSchema), ProductController.upsert);
router.delete("/remove/:id", authenticate, authorize("admin"), ProductController.remove);

export default router;
```

### Paso 9: Registrar en el Router Index

```typescript
// src/routers/index.ts — Agregar la nueva línea
import { Router } from "express";
import areaRouter from "./area";
import userRouter from "./user";
import productRouter from "./product"; // ← Agregar import

const router = Router();

router.use("/areas", areaRouter);
router.use("/users", userRouter);
router.use("/products", productRouter); // ← Registrar ruta

export default router;
```

### Paso 10: Tests

Crear `tests/unit/services/product.test.ts` siguiendo el mismo patrón de `area.test.ts`.

### Resumen — Archivos a crear por entidad nueva

| # | Archivo | Acción |
|---|---|---|
| 1 | `migrations/00N_{entity}.sql` | Crear tabla + stored procedures |
| 2 | `src/interfaces/models/{entity}.ts` | Definir interface TypeScript |
| 3 | `src/schemas/{entity}.ts` | Schema de validación Zod |
| 4 | `src/queries/{entity}.ts` | Strings de stored procedures |
| 5 | `src/models/{entity}.ts` | Acceso a BD |
| 6 | `src/services/{entity}.ts` | Lógica de negocio |
| 7 | `src/controllers/{entity}.ts` | Adaptador HTTP |
| 8 | `src/routers/{entity}.ts` | Definición de rutas |
| 9 | `src/routers/index.ts` | **Modificar:** registrar el nuevo router |
| 10 | `tests/unit/services/{entity}.test.ts` | Tests unitarios |

---

## 28. Checklist de Seguridad Pre-Deploy

Verificar antes de llevar cualquier servicio a producción:

**Variables y Secretos**
- [ ] `.env` NO está en el repositorio ni en la imagen Docker
- [ ] JWT secrets generados con al menos 64 caracteres aleatorios (dos claves distintas)
- [ ] `DB_PASSWORD` y otras credenciales provienen de un gestor de secretos

**Seguridad de la API**
- [ ] CSP NO contiene `unsafe-inline` ni `unsafe-eval`
- [ ] Rate limiting activo en todos los endpoints, estricto (10 intentos) en auth
- [ ] CORS configurado solo con orígenes explícitos (no wildcard `*`)
- [ ] Todas las queries usan parámetros posicionales (`$1`, `$2`, ...) — nunca concatenación de strings
- [ ] Ningún endpoint expone stack traces ni mensajes de error internos al cliente

**Autenticación y Tokens**
- [ ] Passwords hasheados con bcrypt (cost factor ≥ 12)
- [ ] Refresh tokens almacenados como SHA-256 en BD (nunca bcrypt ni plain text) y búsqueda por hash para detectar reuso
- [ ] Cookies de refresh con `httpOnly`, `secure`, `sameSite=strict`, `path=/auth/refresh`
- [ ] Blacklisting de access tokens implementado en logout

**Observabilidad**
- [ ] Logs no contienen passwords, tokens ni datos sensibles (`redact` activo en pino)
- [ ] Health check endpoint disponible y retornando estado de BD
- [ ] Request IDs en todos los logs para trazabilidad

**Infraestructura**
- [ ] Graceful shutdown implementado (SIGTERM/SIGINT)
- [ ] HTTPS obligatorio (TLS 1.3) — nunca HTTP en producción
- [ ] Headers de seguridad verificados con [securityheaders.com](https://securityheaders.com)
- [ ] Docker corre como usuario no-root (UID 1001)
- [ ] Dependencias auditadas (`yarn audit`) sin vulnerabilidades críticas
- [ ] Imagen Docker usa multi-stage build (sin código fuente en imagen final)

**Calidad**
- [ ] `yarn typecheck` pasa sin errores
- [ ] `yarn test` pasa con cobertura ≥ 70%
- [ ] Migraciones de BD probadas en staging antes de producción
- [ ] `UserRole` en `src/interfaces/response.ts` está sincronizado con el frontend y con la BD

---

## 29. Estructura Final del Proyecto

```
api-<nombre>/
├── src/
│   ├── interfaces/
│   │   ├── auth.ts
│   │   ├── response.ts
│   │   └── models/
│   │       ├── user.ts
│   │       └── {entity}.ts
│   ├── middlewares/
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   ├── errorHandler.ts
│   │   ├── notFoundHandler.ts
│   │   ├── rateLimiter.ts
│   │   ├── requestLogger.ts
│   │   ├── securityHeaders.ts
│   │   └── validateRequest.ts
│   ├── routers/
│   │   ├── index.ts          ← Registra todos los routers bajo /api/v1
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── controllers/
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── services/
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── models/
│   │   ├── user.ts           ← Siempre existe: auth lo necesita
│   │   └── {entity}.ts
│   ├── queries/
│   │   ├── user.ts
│   │   └── {entity}.ts
│   ├── schemas/
│   │   ├── auth.ts
│   │   └── {entity}.ts
│   ├── utils/
│   │   ├── config.ts
│   │   ├── database.ts
│   │   ├── errors.ts
│   │   ├── jwt.ts
│   │   ├── logger.ts
│   │   └── sendResponse.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── setup.ts
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   └── integration/
│       └── routes/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_auth_tokens.sql
│   └── 003_{entity}.sql
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── vitest.config.ts
```
