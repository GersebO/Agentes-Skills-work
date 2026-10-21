# Referencia Técnica — Aplicación FrontEnd

> **Versión:** 2.3 — Alineada con rulesproyect.md (Skeleton, `finally`, Zod, AlertDialog, tokens) y corrección de bugs
> **Stack:** Next.js (última versión estable) · TypeScript · Zustand · Axios · Tailwind CSS · shadcn/ui · Vitest
> **Propósito:** Guía de andamiaje para proyectos frontend nuevos. Explica **cómo funciona el sistema**, las decisiones de diseño y los patrones adoptados. Cada sección incluye el código completo y listo para usar.
>
> **Jerarquía:** ante cualquier diferencia manda `rulesproyect.md` (estándar de la empresa) y, dentro de un proyecto, su propio estándar de UI si existe (p. ej. `docs/ui-standard.md`). Esta guía se alineó con ambos en la versión 2.3.

---

## Tabla de Contenidos

1. [Visión General y Arquitectura](#1-visión-general-y-arquitectura)
2. [Creación del Proyecto](#2-creación-del-proyecto)
3. [Configuración de TypeScript](#3-configuración-de-typescript)
4. [Dependencias](#4-dependencias)
5. [Variables de Entorno](#5-variables-de-entorno)
6. [Estructura de Directorios](#6-estructura-de-directorios)
7. [Configuración Next.js](#7-configuración-nextjs)
8. [Utilidades (utils)](#8-utilidades-utils)
9. [Interfaces y Tipos](#9-interfaces-y-tipos)
10. [Services](#10-services)
11. [Zustand (Store)](#11-zustand-store)
    - 11.1 [Store de Autenticación](#111-store-de-autenticación)
    - 11.2 [Store de Entidad](#112-store-de-entidad)
12. [Hooks](#12-hooks)
13. [Protección de Rutas (Middleware)](#13-protección-de-rutas-middleware)
14. [Componentes UI (shadcn/ui)](#14-componentes-ui)
15. [Componentes Layout](#15-componentes-layout)
16. [Componentes Functional](#16-componentes-functional)
17. [App y Pages](#17-app-y-pages)
18. [Flujo Completo de Datos](#18-flujo-completo-de-datos)
    - 18.1 [Flujo de Autenticación](#181-flujo-de-autenticación)
    - 18.2 [GET (lectura)](#182-get-lectura)
    - 18.3 [POST / PUT / DELETE (escritura)](#183-post--put--delete-escritura)
19. [Convenciones de Naming](#19-convenciones-de-naming)
20. [Cómo Agregar una Nueva Entidad](#20-cómo-agregar-una-nueva-entidad)
21. [Docker](#21-docker)
22. [Testing](#22-testing)
23. [Scripts de Ejecución](#23-scripts-de-ejecución)
24. [Checklist Pre-Deploy](#24-checklist-pre-deploy)
25. [Estructura Final del Proyecto](#25-estructura-final-del-proyecto)

---

## 1. Visión General y Arquitectura

Cada proyecto frontend es una aplicación Next.js que se comunica exclusivamente con el servicio `api` (gateway). Nunca se conecta directamente a microservicios como `api-pdf` o `api-email`.

### Arquitectura por Capas

```
Page (Next.js App Router)
  └── Functional Component
        └── Hook
              └── Zustand Store
                    └── Service (Axios)
                          └── API (backend)
```

| Capa | Directorio | Responsabilidad única |
|---|---|---|
| **Page** | `src/app/{feature}/page.tsx` | Punto de entrada por ruta. Solo invoca el componente functional. |
| **Functional** | `src/components/functional/` | Componentes del dominio. Consumen hooks y componen UI. |
| **UI** | `src/components/ui/` | Componentes de shadcn/ui. Sin lógica de negocio. No se modifican directamente. |
| **Layout** | `src/components/layout/` | Piezas estructurales (Header, Sidebar). Usadas desde `layout.tsx`. |
| **Hook** | `src/store/hooks/` | Encapsulamiento del store de Zustand. Única interfaz que consume el componente. |
| **Zustand** | `src/store/zustand/` | Estado global. Llama al service y almacena la respuesta. |
| **Service** | `src/store/services/` | Llamadas HTTP con Axios. Sin lógica de negocio. |
| **Interface** | `src/store/interfaces/` | Tipado de requests, responses y modelos. |
| **Utils** | `src/utils/` | Funciones y configuraciones transversales al proyecto. |

**Por qué esta separación:** Permite que cualquier desarrollador que conozca el flujo estándar pueda navegar y resolver problemas en cualquier proyecto del repositorio sin necesidad de explicaciones adicionales. La consistencia entre proyectos es el valor principal.

> **REGLA ESTRICTA:** Ninguna capa puede saltarse a otra. El componente functional nunca importa un service directamente. El store nunca importa nada de React. Si algo no encaja, es señal de que pertenece a otra capa.

> **NOTA:** El árbol de `src/app/` refleja exactamente la estructura del menú del sistema. Cada sección del menú tiene su carpeta correspondiente. Esto permite ubicar el código de cualquier sección de forma inmediata.

---

## 2. Creación del Proyecto

```bash
npx create-next-app@latest app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd app
```

> **NOTA:** Las opciones `--app` y `--src-dir` habilitan el App Router y el directorio `src/` respectivamente. El alias `@/*` permite importar desde `src/` sin rutas relativas (`@/utils/api` en lugar de `../../utils/api`).

> **IMPORTANTE para asistentes de IA:** No asumir la versión de Next.js (ni la de otras dependencias) por memoria del modelo. El training cutoff puede quedar desactualizado respecto a los lanzamientos reales, generando proyectos con versiones antiguas aunque el comando use `@latest`. Verificar la versión mayor estable vigente (ej. ejecutando `npm view next version` o consultando la documentación oficial) antes de generar el proyecto, y usarla explícitamente si no se puede ejecutar `create-next-app@latest` de forma real en una terminal.

---

## 3. Configuración de TypeScript

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

> **Nota:** `noUnusedLocals`, `noUnusedParameters` y `noImplicitReturns` elevan la calidad del código y previenen errores silenciosos. `moduleResolution: bundler` es el modo correcto para proyectos Next.js con Turbopack.

---

## 4. Dependencias

### Producción

```bash
yarn add axios zustand jwt-decode zod react-hook-form @hookform/resolvers
```

### shadcn/ui

shadcn/ui no es una dependencia tradicional: sus componentes se **copian al proyecto** vía CLI. Esto permite modificarlos directamente sin mantener un fork.

```bash
# 1. Inicializar shadcn en el proyecto (solo una vez)
npx shadcn@latest init
```

Al ejecutar `init`, el CLI pregunta:
- **Style:** New York (recomendado — bordes más compactos)
- **Base color:** Slate
- **CSS variables:** Yes

Esto genera `components.json` y configura `src/components/ui/` como destino de los componentes.

```bash
# 2. Agregar los componentes que el proyecto necesita
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add alert
npx shadcn@latest add badge
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add card
npx shadcn@latest add skeleton
npx shadcn@latest add alert-dialog
```

> **¿Por qué shadcn/ui sobre componentes custom?** Los componentes propios requieren mantener accesibilidad (ARIA), manejo de teclado, focus traps, portals y animaciones — trabajo significativo y propenso a errores. shadcn/ui delega todo eso a Radix UI (probado en producción) y permite personalizar el estilo via Tailwind sin restricciones. El resultado es código más simple en los componentes functional y mejor UX sin esfuerzo adicional.

### Desarrollo

```bash
yarn add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

> **NOTA:** Next.js, TypeScript, Tailwind CSS, PostCSS y ESLint son instalados por `create-next-app`. Solo se agregan las dependencias propias del stack.

### Decisiones de dependencias

| Paquete | Razón |
|---|---|
| `axios` | Instancia configurable con `axios.create`, interceptores de request/response y manejo centralizado de errores HTTP |
| `zustand` | Estado global minimalista, sin boilerplate, compatible con SSR de Next.js |
| `jwt-decode` | Decodificación de tokens JWT en el cliente sin necesidad de verificar la firma (la verificación ocurre en el backend) |
| `zod` + `react-hook-form` + `@hookform/resolvers` | Validación de formularios con schemas tipados (estándar de la empresa: Zod en el frontend) |
| `shadcn/ui` | Biblioteca de componentes construida sobre Radix UI y Tailwind CSS. Los componentes se copian al proyecto (no se instalan como dependencia), permitiendo modificarlos libremente |
| `vitest` | Testing moderno y rápido, compatible con TypeScript sin configuración extra. Mismo ecosistema que el backend |

> **¿Por qué `jwt-decode` en lugar de `jsonwebtoken`?** En el cliente solo necesitamos *leer* el payload del token (para obtener email, rol, expiración), no *firmar* ni *verificar*. `jwt-decode` es 10x más liviano y no tiene dependencias nativas que generen problemas en el browser.

---

## 5. Variables de Entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```bash
# ─── API ───
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

> **IMPORTANTE:** Solo las variables con prefijo `NEXT_PUBLIC_` son accesibles en el browser. Las variables sin ese prefijo solo están disponibles en el servidor (SSR, Server Actions, API Routes). **Nunca exponer secretos con el prefijo `NEXT_PUBLIC_`.**

### .env.example

Mantener siempre este archivo en el repositorio con las claves pero sin valores reales:

```bash
# ─── API ───
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_API_BASE_URL=
```

### .gitignore

```gitignore
# Dependencias
node_modules/

# Build
.next/
out/

# Entorno
.env.local
.env.*.local
!.env.example

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
```

---

## 6. Estructura de Directorios

```
src/
├── app/                              # Enrutador de Next.js (App Router)
│   ├── layout.tsx                        # Layout raíz (autenticado: Header + Sidebar)
│   ├── page.tsx                          # Página de inicio → redirige a /dashboard
│   ├── login/
│   │   └── page.tsx                      # Página de login (layout público, sin Sidebar)
│   └── {feature}/
│       └── page.tsx                      # Página del feature (delgada, solo invoca Functional)
├── components/
│   ├── functional/                   # Componentes del dominio
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   └── {Feature}/
│   │       ├── {Feature}List.tsx
│   │       └── {Feature}Form.tsx
│   ├── layout/                       # Piezas estructurales
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── ui/                           # Componentes de shadcn/ui (ver sección 14)
│       ├── button.tsx
│       ├── input.tsx
│       ├── table.tsx
│       ├── dialog.tsx
│       ├── alert-dialog.tsx
│       ├── skeleton.tsx
│       └── ...
├── store/
│   ├── hooks/                        # Encapsulamiento de Zustand
│   │   ├── useAuth.hook.ts
│   │   └── use{Entity}.hook.ts
│   ├── interfaces/                   # Tipos, interfaces y schemas Zod de formularios
│   │   ├── response.interface.ts
│   │   ├── auth.interface.ts
│   │   └── {entity}.interface.ts     # I{Entity}, I{Entity}UpsertPayload y {entity}FormSchema
│   ├── services/                     # Llamadas Axios a la API
│   │   ├── auth.service.ts
│   │   └── {entity}.service.ts
│   └── zustand/                      # Estados globales
│       ├── auth.store.ts
│       └── {entity}.store.ts
├── styles/
│   └── globals.css
└── utils/
    ├── api.ts                        # Instancia de Axios con interceptores
    └── config.ts                     # Variables de entorno centralizadas y validadas
middleware.ts                         # Protección de rutas (Next.js middleware)
```

---

## 7. Configuración Next.js

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Requerido para Docker: genera un servidor Node.js standalone sin node_modules completos
  output: 'standalone',

  // Configuración de imágenes externas (agregar dominios según necesidad)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com', // reemplazar con el dominio real
      },
    ],
  },

  // Headers de seguridad para todas las respuestas
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
```

> **Nota sobre `output: 'standalone'`:** Genera una carpeta `.next/standalone` que contiene solo los archivos necesarios para producción. Reduce el tamaño de la imagen Docker en un 60-70%. **Requerido** para que el Dockerfile funcione correctamente (ver sección 21).

---

## 8. Utilidades (utils)

### config.ts

Centraliza y **valida** todas las variables de entorno. Ningún otro archivo accede a `process.env` directamente.

**Por qué:** Si una variable crítica falta o cambia de nombre, el error aparece en un único lugar con un mensaje claro, en lugar de fallar silenciosamente con un `undefined` en runtime.

```typescript
// src/utils/config.ts

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Variable de entorno requerida no encontrada: ${key}`)
  }
  return value
}

export const config = {
  apiUrl:     requireEnv('NEXT_PUBLIC_API_URL'),
  apiBaseUrl: requireEnv('NEXT_PUBLIC_API_BASE_URL'),
} as const
```

### api.ts

Instancia única de Axios configurada con la URL base de la API y dos interceptores: uno de *request* (adjuntar token) y uno de *response* (manejar 401 con refresh automático). Todos los services importan esta instancia, nunca crean la propia.

**Por qué:** Centraliza la configuración HTTP. El refresh automático de token se implementa aquí una sola vez y aplica a todos los services automáticamente.

```typescript
// src/utils/api.ts
import axios, { AxiosError } from 'axios'
import { config } from './config'

export const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true, // Necesario para enviar la cookie httpOnly del refresh token
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor: attach access token ───
// The access token lives in memory (Zustand), not in localStorage.
// Read from the store on each request to always have the latest value.
api.interceptors.request.use((axiosConfig) => {
  // Dynamic import to avoid circular dependency with the store
  const { useAuthStore } = require('@/store/zustand/auth.store')
  const token = useAuthStore.getState().accessToken

  if (token && axiosConfig.headers) {
    axiosConfig.headers.Authorization = `Bearer ${token}`
  }
  return axiosConfig
})

// ─── Response Interceptor: handle token expiration (401) ───
// If a request receives 401, attempt to renew the access token using the
// refresh token (httpOnly cookie sent automatically by the browser).
// If refresh fails, clear session and redirect to login.
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    // Only attempt refresh on 401, and only once per request
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request and wait
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest?.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return api(originalRequest!)
        })
      }

      originalRequest!._retry = true
      isRefreshing = true

      try {
        // Call the refresh endpoint (httpOnly cookie is sent automatically)
        const { data } = await axios.post(
          `${config.apiBaseUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        )

        const newToken: string = data.data.accessToken
        const { useAuthStore } = require('@/store/zustand/auth.store')
        useAuthStore.getState().setAccessToken(newToken)

        processQueue(null, newToken)

        if (originalRequest?.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        // Si se usa la Opción A de protección de rutas (middleware), sincronizar la cookie:
        // await fetch('/api/auth/set-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: newToken }) })
        return api(originalRequest!)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Refresh failed: clear session and redirect to login
        const { useAuthStore } = require('@/store/zustand/auth.store')
        useAuthStore.getState().logout()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)
```

```typescript
// src/utils/api.ts (al final) — mensaje de error legible para el usuario
// Axios lanza una excepción en respuestas 4xx/5xx, así que `response.success === false`
// casi nunca llega al store: el mensaje real del backend viene en err.response.data.error.
export function getErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (axios.isAxiosError(err)) {
    const apiError = (err.response?.data as { error?: unknown } | undefined)?.error
    if (typeof apiError === 'string') return apiError
    if (Array.isArray(apiError)) return apiError.map((e) => e.message ?? String(e)).join('. ')
  }
  return err instanceof Error ? err.message : fallback
}
```

> **¿Por qué el access token en memoria (Zustand) y no en `localStorage`?**
> `localStorage` es accesible desde JavaScript, lo que lo hace vulnerable a ataques XSS. Un access token de vida corta (15 min) en memoria ofrece mejor protección: si la pestaña se cierra, el token desaparece. El refresh token, de vida larga, vive en una cookie `httpOnly` completamente inaccesible desde JavaScript, enviada automáticamente por el browser gracias a `withCredentials: true`.

> **Convención `isLoading / hasError / errorMessage`:** Todos los stores usan estos tres nombres de campo para el estado de carga y error, en lugar de `onLoading / onError / error`. La convención inglesa es más expresiva (`isLoading` es un booleano que describe un estado, `onLoading` suena a un evento) y es la estándar en el ecosistema React.

> **¿Qué es la cola de requests fallidos (`failedQueue`)?** Si expiran varios requests simultáneos con 401, sin la cola, cada uno intentaría hacer su propio refresh generando condiciones de carrera. La cola asegura que solo se hace un refresh a la vez y todos los requests en espera se reanudan con el nuevo token.

---

## 9. Interfaces y Tipos

Las interfaces viven en `src/store/interfaces/`. El backend es siempre la **fuente de verdad**: ante cualquier cambio en el contrato de la API, actualizar ambos lados manualmente.

### Interfaz base de respuesta

```typescript
// src/store/interfaces/response.interface.ts
//
// CONTRATO DE API — debe estar sincronizado con: api/src/utils/sendResponse.ts
// Formato estándar de todas las respuestas del backend:
//   { success: true,  data: T,    error: null,  requestId?: string }  → éxito
//   { success: false, data: null, error: "msg", requestId?: string }  → error
//
// Si el backend cambia este formato, actualizar esta interfaz de inmediato.
// T es el tipo del campo `data`. Ejemplo: IDataResponse<IUser[]>
export interface IDataResponse<T = unknown> {
  success: boolean
  data: T | null
  // string en errores de negocio; lista { field, message } cuando falla la validación Zod del backend
  error: string | Array<{ field: string; message: string }> | null
  requestId?: string
}

// Roles disponibles en el sistema.
// SINCRONIZAR con: api/src/interfaces/models/user.ts → campo `role`
// Si se agrega un rol en el backend, agregarlo aquí también.
export type UserRole = 'admin' | 'editor' | 'viewer'
```

> **¿Por qué genérico `<T>` en lugar de `any`?** El tipo `any` anula por completo los beneficios de TypeScript. Con `IDataResponse<IUser[]>` el compilador sabe exactamente qué viene en `data` y puede detectar errores en tiempo de compilación.

### Interfaces de autenticación

```typescript
// src/store/interfaces/auth.interface.ts
import type { UserRole } from './response.interface'

export interface ILoginPayload {
  email: string
  password: string
}

export interface ITokenPayload {
  sub: string    // user id
  email: string
  role: UserRole // sincronizado con UserRole en response.interface.ts
  exp: number    // timestamp de expiración
  iat: number    // timestamp de emisión
}

export interface IAuthUser {
  id: string
  email: string
  role: UserRole // sincronizado con UserRole en response.interface.ts
}
```

### Interfaces de modelos

```typescript
// src/store/interfaces/user.interface.ts
// Sincronizar con: api/src/interfaces/models/user.ts
import type { UserRole } from './response.interface'

export interface IUser {
  id: string
  email: string
  role: UserRole // sincronizado con UserRole en response.interface.ts
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface IUserUpsertPayload {
  id?: string           // ausente → INSERT, presente → UPDATE
  email: string
  role: UserRole        // sincronizado con UserRole en response.interface.ts
  password?: string     // solo requerido en creación
}
```

```typescript
// src/store/interfaces/area.interface.ts
// Sincronizar con: api/src/interfaces/models/area.ts
export interface IArea {
  id: string
  name: string
  createdAt: string
  updatedAt: string | null // NULL al crear (rulesproyect Parte II §2)
}

export interface IAreaUpsertPayload {
  id?: string
  name: string
}

// Schema del formulario (rulesproyect §9: trim, regex sin emojis/control, largos mín/máx)
import { z } from 'zod'

export const areaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[\p{L}\p{N} .,()\-]+$/u, 'Solo letras, números y puntuación básica'),
})

export type AreaFormValues = z.infer<typeof areaFormSchema>
```

> **Convención:** Los payloads de escritura tienen el sufijo `Payload`. Las interfaces de modelos (lo que retorna la API) no tienen sufijo. Esto distingue visualmente qué se envía al backend y qué se recibe.

---

## 10. Services

Los services son la **única capa que realiza llamadas HTTP**. Usan la instancia `api` de `utils/api.ts` y retornan la respuesta tipada. No contienen lógica de negocio ni manejan errores: esa responsabilidad es del store de Zustand.

**Convención de endpoints:** Los endpoints del frontend deben coincidir exactamente con los definidos en el backend. El backend define `/users/getAll`, `/users/upsert`, `/users/remove/:id`. El frontend replica esa misma estructura.

```typescript
// src/store/services/auth.service.ts
import { api } from '@/utils/api'
import { IDataResponse } from '@/store/interfaces/response.interface'
import { ILoginPayload, IAuthUser } from '@/store/interfaces/auth.interface'

export const authService = {
  login: (payload: ILoginPayload) =>
    api.post<IDataResponse<{ accessToken: string }>>('/auth/login', payload),

  // El refresh no va por el api instance para evitar loops con el interceptor
  // Se llama directamente desde api.ts cuando se detecta un 401
  logout: () =>
    api.post<IDataResponse<{ message: string }>>('/auth/logout'),

  me: () =>
    api.get<IDataResponse<IAuthUser>>('/auth/me'),
}
```

```typescript
// src/store/services/user.service.ts
import { api } from '@/utils/api'
import { IDataResponse } from '@/store/interfaces/response.interface'
import { IUser, IUserUpsertPayload } from '@/store/interfaces/user.interface'

export const userService = {
  getAll: () =>
    api.get<IDataResponse<IUser[]>>('/users/getAll'),

  getById: (id: string) =>
    api.get<IDataResponse<IUser>>(`/users/getById/${id}`),

  upsert: (payload: IUserUpsertPayload) =>
    api.post<IDataResponse<IUser>>('/users/upsert', payload),

  remove: (id: string) =>
    api.delete<IDataResponse<IUser[]>>(`/users/remove/${id}`),
}
```

```typescript
// src/store/services/area.service.ts
import { api } from '@/utils/api'
import { IDataResponse } from '@/store/interfaces/response.interface'
import { IArea, IAreaUpsertPayload } from '@/store/interfaces/area.interface'

export const areaService = {
  getAll: () =>
    api.get<IDataResponse<IArea[]>>('/areas/getAll'),

  getById: (id: string) =>
    api.get<IDataResponse<IArea>>(`/areas/getById/${id}`),

  upsert: (payload: IAreaUpsertPayload) =>
    api.post<IDataResponse<IArea>>('/areas/upsert', payload),

  remove: (id: string) =>
    api.delete<IDataResponse<IArea[]>>(`/areas/remove/${id}`),
}
```

---

## 11. Zustand (Store)

El store de Zustand es la **única fuente de verdad en el cliente**. Almacena el estado derivado de la API y expone las acciones que lo modifican. Siempre incluye los estados `isLoading`, `hasError` y `errorMessage` para que el componente pueda reaccionar al ciclo de vida de cada petición.

**Patrón estándar del ciclo de vida de una acción:**

1. `set({ isLoading: true, hasError: false, errorMessage: '' })` — antes de la llamada HTTP
2. Llamada al service
3. Si `response.success === false` → lanzar error con el mensaje del backend
4. `set({ ...data })` — en éxito
5. `set({ hasError: true, errorMessage: getErrorMessage(err) })` — en el `catch`
6. `set({ isLoading: false })` — **siempre en `finally`** (rulesproyect §9: liberación garantizada del estado)

Las acciones de escritura (`upsert`, `remove`) **retornan `true`/`false`**. Así el componente sabe si cerrar el diálogo sin tener que leer el store directamente.

### 11.1 Store de Autenticación

El store de auth es especial: gestiona el `accessToken` en memoria, decodifica el JWT para exponer los datos del usuario y expone las acciones de login/logout.

```typescript
// src/store/zustand/auth.store.ts
import { create } from 'zustand'
import { jwtDecode } from 'jwt-decode'
import { authService } from '@/store/services/auth.service'
import { getErrorMessage } from '@/utils/api'
import { IAuthUser, ILoginPayload, ITokenPayload } from '@/store/interfaces/auth.interface'

interface AuthState {
  // State
  accessToken: string | null
  user: IAuthUser | null
  isLoading: boolean
  hasError: boolean
  errorMessage: string

  // Actions
  authLogin: (payload: ILoginPayload) => Promise<void>
  authLogout: () => Promise<void>
  authMe: () => Promise<void>
  setAccessToken: (token: string) => void  // Called by the Axios interceptor on token refresh
  logout: () => void                        // Local session cleanup (no API call)
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isLoading: false,
  hasError: false,
  errorMessage: '',

  authLogin: async (payload: ILoginPayload) => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await authService.login(payload)
      if (!response.success || !response.data) throw new Error(typeof response.error === 'string' ? response.error : 'Authentication error')

      const token = response.data.accessToken
      const decoded = jwtDecode<ITokenPayload>(token)

      set({
        accessToken: token,
        user: { id: decoded.sub, email: decoded.email, role: decoded.role },
      })
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err, 'Login failed') })
    } finally {
      set({ isLoading: false })
    }
  },

  authLogout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
    } catch {
      // Ignore server error on logout; clear local state anyway
    } finally {
      set({ accessToken: null, user: null, isLoading: false, hasError: false, errorMessage: '' })
    }
  },

  authMe: async () => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await authService.me()
      if (!response.success || !response.data) throw new Error(typeof response.error === 'string' ? response.error : 'Not authenticated')
      set({ user: response.data })
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err, 'Failed to fetch profile'), accessToken: null, user: null })
    } finally {
      set({ isLoading: false })
    }
  },

  // Called by the Axios interceptor when the access token is refreshed
  setAccessToken: (token: string) => {
    const decoded = jwtDecode<ITokenPayload>(token)
    set({
      accessToken: token,
      user: { id: decoded.sub, email: decoded.email, role: decoded.role },
    })
  },

  // Local cleanup without API call (used when refresh fails)
  logout: () => {
    set({ accessToken: null, user: null, isLoading: false, hasError: false, errorMessage: '' })
  },
}))
```

> **¿Por qué `useAuthStore.getState()` en `api.ts` en lugar de `useAuthStore()`?** El hook `useAuthStore()` solo funciona dentro de componentes React. Para acceder al store desde `api.ts` (que vive fuera del árbol de React), se usa `.getState()`, que accede directamente al estado actual sin suscripciones.

### 11.2 Store de Entidad

```typescript
// src/store/zustand/area.store.ts
import { create } from 'zustand'
import { IArea, IAreaUpsertPayload } from '@/store/interfaces/area.interface'
import { areaService } from '@/store/services/area.service'
import { getErrorMessage } from '@/utils/api'

interface AreaState {
  // State
  areaList: IArea[]
  selectedArea: IArea | null
  isLoading: boolean
  hasError: boolean
  errorMessage: string

  // Actions
  areaGetAll:     () => Promise<void>
  areaGetById:    (id: string) => Promise<void>
  areaUpsert:     (payload: IAreaUpsertPayload) => Promise<boolean>
  areaRemove:     (id: string) => Promise<boolean>
  areaSelect:     (area: IArea | null) => void  // Local selection, no HTTP call
  areaClearError: () => void
}

export const useAreaStore = create<AreaState>((set) => ({
  areaList: [],
  selectedArea: null,
  isLoading: false,
  hasError: false,
  errorMessage: '',

  areaGetAll: async () => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await areaService.getAll()
      if (!response.success) throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch areas')
      set({ areaList: response.data ?? [] })
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err, 'Failed to fetch areas') })
    } finally {
      set({ isLoading: false })
    }
  },

  areaGetById: async (id: string) => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await areaService.getById(id)
      if (!response.success) throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch area')
      set({ selectedArea: response.data })
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err, 'Failed to fetch area') })
    } finally {
      set({ isLoading: false })
    }
  },

  areaUpsert: async (payload: IAreaUpsertPayload) => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await areaService.upsert(payload)
      if (!response.success || !response.data) throw new Error(typeof response.error === 'string' ? response.error : 'Failed to save area')
      const saved = response.data
      // Update list locally without an additional getAll call
      set((state) => ({
        areaList: payload.id
          ? state.areaList.map((a) => (a.id === saved.id ? saved : a))
          : [...state.areaList, saved],
        selectedArea: null,
      }))
      return true
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err, 'Failed to save area') })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  areaRemove: async (id: string) => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await areaService.remove(id)
      if (!response.success) throw new Error(typeof response.error === 'string' ? response.error : 'Failed to delete area')
      // Backend returns the updated list after deletion
      set({ areaList: response.data ?? [] })
      return true
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err, 'Failed to delete area') })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  areaSelect: (area: IArea | null) => set({ selectedArea: area }),
  areaClearError: () => set({ hasError: false, errorMessage: '' }),
}))
```

---

## 12. Hooks

El hook encapsula el store de Zustand y expone únicamente lo que el componente necesita. **El componente nunca importa el store directamente.**

**Por qué:** El hook es la interfaz pública del estado. Si el store cambia internamente (se renombra una acción, se agrega un campo), el componente no se ve afectado. Además, facilita el testing y simplifica el código del componente.

```typescript
// src/store/hooks/useAuth.hook.ts
import { useAuthStore } from '@/store/zustand/auth.store'

export const useAuth = () => {
  const authLogin      = useAuthStore((s) => s.authLogin)
  const authLogout     = useAuthStore((s) => s.authLogout)
  const user           = useAuthStore((s) => s.user)
  const isLoading      = useAuthStore((s) => s.isLoading)
  const hasError       = useAuthStore((s) => s.hasError)
  const errorMessage   = useAuthStore((s) => s.errorMessage)

  return { authLogin, authLogout, user, isLoading, hasError, errorMessage }
}
```

```typescript
// src/store/hooks/useArea.hook.ts
import { useAreaStore } from '@/store/zustand/area.store'

export const useArea = () => {
  const areaGetAll    = useAreaStore((s) => s.areaGetAll)
  const areaUpsert    = useAreaStore((s) => s.areaUpsert)
  const areaRemove    = useAreaStore((s) => s.areaRemove)
  const areaSelect    = useAreaStore((s) => s.areaSelect)
  const areaClearError = useAreaStore((s) => s.areaClearError)
  const areaList      = useAreaStore((s) => s.areaList)
  const selectedArea  = useAreaStore((s) => s.selectedArea)
  const isLoading     = useAreaStore((s) => s.isLoading)
  const hasError      = useAreaStore((s) => s.hasError)
  const errorMessage   = useAreaStore((s) => s.errorMessage)

  return {
    areaGetAll, areaUpsert, areaRemove, areaSelect, areaClearError,
    areaList, selectedArea, isLoading, hasError, errorMessage,
  }
}
```

> **Nota sobre suscripciones selectivas:** Cada `useAreaStore((s) => s.field)` es una suscripción independiente. Zustand solo re-renderiza el componente cuando el campo específico cambia, no ante cualquier cambio del store. Esto evita re-renders innecesarios.

---

## 13. Protección de Rutas (Middleware)

El middleware de Next.js se ejecuta en el Edge antes de que cualquier page o API route se procese. Es la capa que protege las rutas autenticadas.

**Por qué middleware y no un HOC en cada page:** El middleware corre en el servidor, antes de renderizar nada. Un HOC en el cliente genera un flash de contenido no autorizado antes de redirigir. El middleware es más seguro y tiene mejor UX.

```typescript
// middleware.ts  (en la raíz del proyecto, fuera de src/)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'
import type { ITokenPayload } from '@/store/interfaces/auth.interface'

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ['/login']

// Rutas solo para admin
const ADMIN_ROUTES = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas sin verificación
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Leer el access token desde la cookie (solo si se implementa persistencia de token)
  // ALTERNATIVA: Si el token vive solo en memoria, las rutas protegidas se validan
  // en el componente functional usando el store de Zustand.
  // Ver nota al pie de esta sección.
  const tokenCookie = request.cookies.get('access_token')?.value

  if (!tokenCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const decoded = jwtDecode<ITokenPayload>(tokenCookie)
    const isExpired = decoded.exp * 1000 < Date.now()

    if (isExpired) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar acceso a rutas de admin
    if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
      if (decoded.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    // Token malformado
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  // Aplicar el middleware a todas las rutas excepto archivos estáticos y API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```

> **Nota sobre token en memoria vs cookie:** El middleware de Next.js corre en el servidor y no puede acceder al estado de Zustand (que vive en el browser). Para que el middleware funcione, el access token debe estar disponible en una cookie. Hay dos estrategias:
>
> **Opción A (recomendada para SSR seguro):** Al hacer login, además de guardar el `accessToken` en el store de Zustand, se persiste en una cookie `httpOnly` vía una API Route de Next.js. El middleware lee esa cookie. Ver implementación completa más abajo.
>
> **Opción B (más simple):** Proteger las rutas directamente en el componente functional: si `user === null` en el store de auth, redirigir al login con `router.push('/login')`. Esta opción genera un breve flash antes de redirigir.
>
> **Para la mayoría de los proyectos internos del equipo, la Opción B es suficiente.** Usar la Opción A si la seguridad a nivel de SSR es un requisito explícito.

### Implementación de la Opción A — API Route para persistir el token en cookie

```typescript
// src/app/api/auth/set-token/route.ts
// Esta API Route recibe el accessToken desde el cliente y lo guarda en una cookie
// httpOnly de sesión. El middleware puede leerla en el servidor.
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { accessToken } = await request.json() as { accessToken: string }

  if (!accessToken) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })

  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',   // 'lax' permite navegación desde links externos (correo, Slack)
    path:     '/',
    maxAge:   60 * 15, // 15 minutos — igual que el access token del backend
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('access_token')
  return response
}
```

> **¿Por qué `sameSite: 'lax'` y no `'strict'`?** Con `'strict'`, si el usuario llega desde un link externo (correo, Slack), el browser no envía la cookie y el middleware redirige al login aunque el usuario esté autenticado. `'lax'` permite esa navegación mientras sigue bloqueando requests cross-site no seguros (POST desde otro dominio).

```typescript
// src/store/zustand/auth.store.ts — authLogin y authLogout actualizados para Opción A
// Solo aplicar estos cambios si se usa la Opción A. Con Opción B no es necesario.

authLogin: async (payload: ILoginPayload) => {
  set({ isLoading: true, hasError: false, errorMessage: '' })
  try {
    const { data: response } = await authService.login(payload)
    if (!response.success || !response.data) throw new Error(typeof response.error === 'string' ? response.error : 'Authentication error')

    const token = response.data.accessToken
    const decoded = jwtDecode<ITokenPayload>(token)

    // 1. Save in memory (Zustand)
    set({
      accessToken: token,
      user: { id: decoded.sub, email: decoded.email, role: decoded.role },
    })

    // 2. Persist in httpOnly cookie so the middleware can read it
    await fetch('/api/auth/set-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ accessToken: token }),
    })
  } catch (err: unknown) {
    set({ hasError: true, errorMessage: getErrorMessage(err, 'Login failed') })
  } finally {
    set({ isLoading: false })
  }
},

authLogout: async () => {
  set({ isLoading: true })
  try {
    await authService.logout()
  } catch {
    // Ignore server error; clear local state anyway
  } finally {
    // Clear middleware session cookie
    await fetch('/api/auth/set-token', { method: 'DELETE' })
    set({ accessToken: null, user: null, isLoading: false, hasError: false, errorMessage: '' })
  }
},
```

> **Nota sobre la estructura de directorios:** Al usar la Opción A, agregar la carpeta `src/app/api/auth/set-token/` a la estructura de directorios (sección 6) y al árbol final del proyecto (sección 25).

---

## 14. Componentes UI

Los componentes de `src/components/ui/` son los archivos generados por **shadcn/ui**. No se modifican directamente — se usan tal como los instala el CLI. Si se necesita una variante no contemplada, se crea un componente wrapper en `components/functional/` o se agrega la variante al archivo shadcn siguiendo su convención.

> **Regla:** Los componentes en `src/components/ui/` son de shadcn. Los componentes propios del proyecto van en `src/components/functional/` o `src/components/layout/`. Nunca mezclar.

### Componentes disponibles tras la instalación

Después de `npx shadcn@latest add ...`, estos archivos quedan en `src/components/ui/`:

```
src/components/ui/
├── alert.tsx          # Alertas y mensajes de error/éxito
├── avatar.tsx         # Avatar de usuario
├── badge.tsx          # Etiquetas de estado (roles, estados)
├── button.tsx         # Botón con variantes (default, outline, ghost, destructive)
├── dialog.tsx         # Modal/diálogo accesible (reemplaza Modal custom)
├── dropdown-menu.tsx  # Menú desplegable (acciones de tabla, menú de usuario)
├── input.tsx          # Input de texto base
├── label.tsx          # Label accesible para formularios
├── select.tsx         # Select/dropdown de opciones
└── table.tsx          # Tabla estructurada (thead, tbody, th, td)
```

### Cómo usar shadcn en componentes functional

Los componentes shadcn se importan directamente desde `@/components/ui/`:

```typescript
// src/components/functional/area/AreaForm.tsx
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useArea } from '@/store/hooks/useArea.hook'
import { areaFormSchema, type AreaFormValues } from '@/store/interfaces/area.interface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AreaFormProps {
  onSuccess: () => void
}

export const AreaForm: React.FC<AreaFormProps> = ({ onSuccess }) => {
  const { areaUpsert, selectedArea, isLoading, hasError, errorMessage } = useArea()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    reset({ name: selectedArea?.name ?? '' })
  }, [selectedArea, reset])

  // handleSubmit de react-hook-form no llama a onSubmit si el schema falla,
  // así que Enter en un input inválido no dispara la petición (rulesproyect §9).
  const onSubmit = async (values: AreaFormValues) => {
    if (isLoading) return
    const ok = await areaUpsert({ id: selectedArea?.id, name: values.name })
    if (ok) onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* fieldset deshabilita TODOS los controles durante la mutación */}
      <fieldset disabled={isLoading} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del área <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            placeholder="Ej: Tecnología"
            aria-invalid={!!errors.name}
            className={errors.name ? 'border-destructive' : ''}
            {...register('name')}
          />
          {/* Espacio reservado: el error no desplaza el layout */}
          <p className="min-h-5 text-xs text-destructive">{errors.name?.message ?? ''}</p>
        </div>

        {hasError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onSuccess}>
            Cancelar
          </Button>
          <Button type="submit">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedArea ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
```

### Uso del Dialog (reemplaza Modal custom)

```typescript
// Patrón estándar para dialogs en componentes functional
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Uso:
<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{selectedArea ? 'Editar área' : 'Nueva área'}</DialogTitle>
    </DialogHeader>
    <AreaForm onSuccess={() => setIsFormOpen(false)} />
  </DialogContent>
</Dialog>
```

> **¿Por qué Dialog de shadcn sobre un Modal custom?** El Dialog de Radix UI maneja automáticamente: focus trap (el foco no sale del modal), cierre con Escape, scroll lock del body, aria-modal y aria-labelledby. Reimplementar todo eso manualmente es propenso a errores de accesibilidad.

### Uso de la Table de shadcn

```typescript
// Patrón para tablas con shadcn
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'

// Ejemplo de tabla de áreas con acciones (menú ⋮, destructivas al final y separadas).
// Si el proyecto ya tiene un DataTable con búsqueda, paginación y renderMobileCard, usar ese.
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nombre</TableHead>
      <TableHead>Fecha creación</TableHead>
      <TableHead className="w-[80px]">Acciones</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {areaList.map((area) => (
      <TableRow key={area.id}>
        <TableCell className="font-medium">{area.name}</TableCell>
        <TableCell>{new Date(area.createdAt).toLocaleDateString('es-CL')}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Más opciones">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(area)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setAreaToDelete(area)}  // abre un AlertDialog, nunca confirm()
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Componentes de feedback (loading y error)

Regla de `rulesproyect.md` §4:
- **Carga inicial de datos → `Skeleton`** (obligatorio). Mantiene la estructura visual mientras llegan los datos.
- **Spinner → solo en acciones de guardado o procesos de IA**, dentro del botón (`Loader2` de `lucide-react`).

```typescript
// src/components/functional/area/AreaListSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'

export function AreaListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="space-y-2 rounded-md border p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
```

> **`lucide-react` ya está disponible** porque shadcn lo instala como dependencia al hacer `init`.

> **`cn()`** es la función helper de shadcn que combina `clsx` y `tailwind-merge`. Vive en `src/lib/utils.ts` (generada por `shadcn init`). Usarla siempre para combinar clases Tailwind condicionales.

### Login Form con shadcn

```typescript
// src/components/functional/auth/LoginForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/hooks/useAuth.hook'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const LoginForm: React.FC = () => {
  const router = useRouter()
  const { authLogin, user, isLoading, hasError, errorMessage } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await authLogin({ email, password })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          {hasError && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

> **`Card`, `CardContent`, `CardHeader`, `CardTitle`** son componentes adicionales de shadcn. Agregar con: `npx shadcn@latest add card`

---

## 15. Componentes Layout

Los componentes de layout son piezas estructurales. Son consumidos desde `src/app/layout.tsx`. El layout raíz incluye `Sidebar` y `Header` para páginas autenticadas.

```typescript
// src/components/layout/Sidebar.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon?: React.ReactNode
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users',     label: 'Usuarios'  },
  { href: '/areas',     label: 'Áreas'     },
]

export const Sidebar: React.FC = () => {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b px-6">
        <span className="font-bold">Mi Aplicación</span>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
```

```typescript
// src/components/layout/Header.tsx
'use client'

import React from 'react'
import { useAuth } from '@/store/hooks/useAuth.hook'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Header: React.FC = () => {
  const { user, authLogout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await authLogout()
    router.push('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
      <div /> {/* Espacio izquierdo — agregar breadcrumbs si se necesita */}
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Badge variant="secondary">{user.role}</Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
```

```typescript
// src/app/layout.tsx
// Layout raíz: aplica a todas las páginas bajo /
// Las páginas públicas (login) pueden usar su propio layout anidado
import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Mi Aplicación',
  description: 'Sistema de gestión',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-muted/30">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### Layout público para páginas sin Sidebar

Las páginas que no deben mostrar el Sidebar (como `/login`) usan un `layout.tsx` propio dentro de su carpeta. Next.js App Router aplica layouts de forma anidada, por lo que un layout dentro de `/login/` **reemplaza** el layout raíz para esa ruta.

```typescript
// src/app/login/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      {children}
    </div>
  )
}
```

> **IMPORTANTE:** Este layout solo se aplica a la ruta `/login` y sus sub-rutas. El layout raíz (`app/layout.tsx`) aplica a todo lo demás.

---

## 16. Componentes Functional

Los componentes functional son **específicos del dominio del proyecto**. Se arman componiendo componentes UI. Consumen hooks para acceder al estado y las acciones. No son reutilizables fuera del contexto del negocio.

**Regla:** Si la page tiene más de una línea de JSX propio, ese contenido debe moverse a un componente functional.

> **Directiva `'use client'`:** Los componentes functional siempre necesitan `'use client'` porque consumen hooks (`useEffect`, hooks de Zustand, `useRouter`).

El `LoginForm` y el `AreaForm` de referencia están en la sección 14. Este es el listado completo:

```typescript
// src/components/functional/area/AreaList.tsx
'use client'

import { useEffect, useState } from 'react'
import { MoreVertical, Plus } from 'lucide-react'
import { useArea } from '@/store/hooks/useArea.hook'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AreaForm } from './AreaForm'
import { AreaListSkeleton } from './AreaListSkeleton'
import { IArea } from '@/store/interfaces/area.interface'

export const AreaList: React.FC = () => {
  const {
    areaGetAll, areaRemove, areaSelect,
    areaList, selectedArea, isLoading, hasError, errorMessage,
  } = useArea()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<IArea | null>(null)

  useEffect(() => {
    areaGetAll()
  }, [areaGetAll]) // las acciones de Zustand son referencias estables: incluirlas no causa re-ejecuciones

  // Skeleton solo en la carga inicial; al recargar con datos ya visibles no se reemplaza la tabla
  const isInitialLoad = isLoading && areaList.length === 0

  const handleEdit = (area: IArea) => {
    areaSelect(area)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    areaSelect(null)
    setIsFormOpen(true)
  }

  const handleConfirmRemove = async () => {
    if (!areaToDelete) return
    const ok = await areaRemove(areaToDelete.id)
    if (ok) setAreaToDelete(null)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    areaSelect(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Áreas</h2>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nueva área
        </Button>
      </div>

      {hasError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isInitialLoad ? (
        <AreaListSkeleton />  // carga inicial: Skeleton, nunca spinner
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha creación</TableHead>
                <TableHead className="w-[60px]"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areaList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                    Aún no hay áreas. Crea la primera con "Nueva área".
                  </TableCell>
                </TableRow>
              ) : (
                areaList.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell>{new Date(area.createdAt).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Más opciones">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(area)}>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setAreaToDelete(area)}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open: boolean) => (open ? setIsFormOpen(true) : handleCloseForm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedArea ? 'Editar área' : 'Nueva área'}</DialogTitle>
          </DialogHeader>
          <AreaForm onSuccess={handleCloseForm} />
        </DialogContent>
      </Dialog>

      {/* Confirmación destructiva: AlertDialog, nunca window.confirm() */}
      <AlertDialog open={!!areaToDelete} onOpenChange={(open: boolean) => !open && setAreaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el área "{areaToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              El área dejará de aparecer en los listados. Esta acción se puede revertir desde la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              onClick={(e: React.MouseEvent) => { e.preventDefault(); handleConfirmRemove() }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

---

## 17. App y Pages

Las pages son la **capa más delgada** del proyecto. Su único propósito es ser el punto de entrada de una ruta y renderizar el componente functional correspondiente.

```typescript
// src/app/login/page.tsx
import { LoginForm } from '@/components/functional/auth/LoginForm'

export default function LoginPage() {
  return <LoginForm />
}
```

```typescript
// src/app/areas/page.tsx
import { AreaList } from '@/components/functional/area/AreaList'

export default function AreasPage() {
  return <AreaList />
}
```

```typescript
// src/app/page.tsx
// La raíz redirige al dashboard (o al login si no está autenticado)
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/dashboard')
}
```

> **NOTA:** Las pages son Server Components por defecto en Next.js App Router. No agregar `'use client'` a las pages: esa directiva va en los componentes functional que consumen hooks.

---

## 18. Flujo Completo de Datos

### 18.1 Flujo de Autenticación

```
LoginForm → useAuth → authLogin (store) → authService.login (HTTP POST)
                                               ↓
                           backend retorna { accessToken } en body
                           + cookie httpOnly refreshToken automática
                                               ↓
                       store decodes JWT → saves user + accessToken in memory
                                               ↓
                       useEffect detects user ≠ null → router.push('/dashboard')
```

**Renovación automática de token:**

```
request con accessToken expirado → API retorna 401
      ↓
interceptor de response detecta 401
      ↓
POST /auth/refresh (cookie httpOnly se envía automáticamente)
      ↓
new accessToken → store.setAccessToken(newToken)
      ↓
request original se reintenta con el nuevo token
```

### 18.2 GET (lectura)

```
componente monta → useEffect → hook → store.areaGetAll() → areaService.getAll()
                                              ↓
                                   set({ isLoading: true })
                                              ↓
                                   backend response
                                              ↓
                                   set({ areaList: data, isLoading: false })
                                              ↓
                           componente re-renderiza con datos nuevos
```

**Carga automática al montar el componente:**

```typescript
const { areaGetAll, areaList, isLoading, hasError, errorMessage } = useArea()

useEffect(() => {
  areaGetAll()
}, [areaGetAll])
```

> **Dependencias del `useEffect`:** las acciones de Zustand son referencias estables (no cambian entre renders), así que incluirlas en el arreglo de dependencias es seguro y deja contento al linter. No hace falta `eslint-disable`.

### 18.3 POST / PUT / DELETE (escritura)

```
handleSubmit → hook → store.areaUpsert(payload) → areaService.upsert(payload)
                              ↓
                    set({ isLoading: true })
                              ↓
                    backend response (area created/updated)
                              ↓
                    set({ areaList: [updated list] }) → return true
                              ↓
                    finally → set({ isLoading: false })
                              ↓
              component receives ok === true → calls onSuccess() → closes dialog
```

---

## 19. Convenciones de Naming

### Idioma en el código

**Todo el código se escribe en inglés:** nombres de variables, funciones, interfaces, archivos, rutas, acciones del store, props, claves de objetos. El español se reserva exclusivamente para el texto que el usuario ve en pantalla (labels, mensajes, títulos, placeholders).

```typescript
// ✅ Correcto
const [isLoading, setIsLoading] = useState(false)
const handleSubmit = async () => { ... }
interface IAreaUpsertPayload { name: string }
export const areaService = { getAll: () => ... }

// ❌ Incorrecto
const [cargando, setCargando] = useState(false)
const manejarEnvio = async () => { ... }
interface IPayloadCrearArea { nombre: string }
```

```typescript
// ✅ Texto visible en pantalla → español
<Button>Guardar</Button>
<p>El nombre es requerido</p>
placeholder="Ingrese el nombre del área"

// ❌ Variable/función → nunca en español
onClick={guardar}
const mensajeError = 'El nombre es requerido'  // ❌ nombre de variable en español
const errorMessage = 'El nombre es requerido'   // ✅
```

### Tabla de convenciones

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos de interface | `{entity}.interface.ts` | `user.interface.ts` |
| Archivos de service | `{entity}.service.ts` | `user.service.ts` |
| Archivos de store | `{entity}.store.ts` | `user.store.ts` |
| Archivos de hook | `use{Entity}.hook.ts` | `useUser.hook.ts` |
| Componentes UI | PascalCase en inglés | `Button.tsx`, `DataTable.tsx` |
| Componentes Functional | PascalCase en inglés | `AreaList.tsx`, `AreaForm.tsx` |
| Componentes Layout | PascalCase en inglés | `Header.tsx`, `Sidebar.tsx` |
| Interfaces | Prefijo `I` + PascalCase en inglés | `IUser`, `IDataResponse` |
| Payloads de escritura | `I{Entity}{Action}Payload` | `IAreaUpsertPayload` |
| Acciones del store | `{entity}{Action}` en inglés | `areaGetAll`, `areaUpsert` |
| Hook exportado | `use{Entity}` | `useArea` |
| Store exportado | `use{Entity}Store` | `useAreaStore` |
| Variables de estado | camelCase en inglés | `isLoading`, `hasError`, `errorMessage` |
| Handlers | `handle{Action}` en inglés | `handleSubmit`, `handleEdit`, `handleClose` |
| Pages | carpeta en minúscula en inglés | `src/app/areas/page.tsx` |

### Cuándo usar `'use client'`

| Situación | Directiva |
|---|---|
| Componente usa `useState`, `useEffect`, o cualquier hook de React | `'use client'` |
| Componente consume un hook de Zustand | `'use client'` |
| Componente maneja eventos del browser (`onClick`, `onChange`) | `'use client'` |
| Page que solo renderiza un componente functional | ❌ No necesita (el functional ya la tiene) |
| Componente de layout que usa `usePathname` o `useRouter` | `'use client'` |
| Componente UI puramente estático (sin interactividad) | ❌ No necesita |

---

## 20. Cómo Agregar una Nueva Entidad

Esta sección describe el proceso completo para agregar una nueva entidad al sistema. Usar como checklist en cada feature nueva.

**Ejemplo: agregar la entidad `Product`**

### Paso 1: Interface

```typescript
// src/store/interfaces/product.interface.ts
// Sincronizar con: api/src/interfaces/models/product.ts
export interface IProduct {
  id: string
  name: string
  price: number
  areaId: string | null
  createdAt: string
  updatedAt: string | null
}

export interface IProductUpsertPayload {
  id?: string
  name: string
  price: number
  areaId?: string
}
```

### Paso 2: Service

```typescript
// src/store/services/product.service.ts
import { api } from '@/utils/api'
import { IDataResponse } from '@/store/interfaces/response.interface'
import { IProduct, IProductUpsertPayload } from '@/store/interfaces/product.interface'

export const productService = {
  getAll:   ()                              => api.get<IDataResponse<IProduct[]>>('/products/getAll'),
  getById:  (id: string)                   => api.get<IDataResponse<IProduct>>(`/products/getById/${id}`),
  upsert:   (payload: IProductUpsertPayload) => api.post<IDataResponse<IProduct>>('/products/upsert', payload),
  remove:   (id: string)                   => api.delete<IDataResponse<IProduct[]>>(`/products/remove/${id}`),
}
```

### Paso 3: Store de Zustand

```typescript
// src/store/zustand/product.store.ts
import { create } from 'zustand'
import { IProduct, IProductUpsertPayload } from '@/store/interfaces/product.interface'
import { productService } from '@/store/services/product.service'
import { getErrorMessage } from '@/utils/api'

interface ProductState {
  productList: IProduct[]
  selectedProduct: IProduct | null
  isLoading: boolean
  hasError: boolean
  errorMessage: string

  productGetAll:     () => Promise<void>
  productUpsert:     (payload: IProductUpsertPayload) => Promise<boolean>
  productRemove:     (id: string) => Promise<boolean>
  productSelect:     (product: IProduct | null) => void
  productClearError: () => void
}

export const useProductStore = create<ProductState>((set) => ({
  productList: [],
  selectedProduct: null,
  isLoading: false,
  hasError: false,
  errorMessage: '',

  productGetAll: async () => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await productService.getAll()
      if (!response.success) throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch products')
      set({ productList: response.data ?? [] })
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err) })
    } finally {
      set({ isLoading: false })
    }
  },

  productUpsert: async (payload) => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await productService.upsert(payload)
      if (!response.success || !response.data) throw new Error(typeof response.error === 'string' ? response.error : 'Failed to save product')
      const saved = response.data
      set((state) => ({
        productList: payload.id
          ? state.productList.map((p) => (p.id === saved.id ? saved : p))
          : [...state.productList, saved],
        selectedProduct: null,
      }))
      return true
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err) })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  productRemove: async (id) => {
    set({ isLoading: true, hasError: false, errorMessage: '' })
    try {
      const { data: response } = await productService.remove(id)
      if (!response.success) throw new Error(typeof response.error === 'string' ? response.error : 'Failed to delete product')
      set({ productList: response.data ?? [] })
      return true
    } catch (err: unknown) {
      set({ hasError: true, errorMessage: getErrorMessage(err) })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  productSelect:     (product) => set({ selectedProduct: product }),
  productClearError: ()        => set({ hasError: false, errorMessage: '' }),
}))
```

### Paso 4: Hook

```typescript
// src/store/hooks/useProduct.hook.ts
import { useProductStore } from '@/store/zustand/product.store'

export const useProduct = () => {
  const productGetAll    = useProductStore((s) => s.productGetAll)
  const productUpsert    = useProductStore((s) => s.productUpsert)
  const productRemove    = useProductStore((s) => s.productRemove)
  const productSelect    = useProductStore((s) => s.productSelect)
  const productClearError = useProductStore((s) => s.productClearError)
  const productList      = useProductStore((s) => s.productList)
  const selectedProduct  = useProductStore((s) => s.selectedProduct)
  const isLoading        = useProductStore((s) => s.isLoading)
  const hasError         = useProductStore((s) => s.hasError)
  const errorMessage     = useProductStore((s) => s.errorMessage)

  return {
    productGetAll, productUpsert, productRemove, productSelect, productClearError,
    productList, selectedProduct, isLoading, hasError, errorMessage,
  }
}
```

### Paso 5: Componentes Functional

Crear `src/components/functional/product/ProductList.tsx` y `ProductForm.tsx` siguiendo el mismo patrón de `AreaList.tsx` y `AreaForm.tsx`.

### Paso 6: Page

```typescript
// src/app/products/page.tsx
import { ProductList } from '@/components/functional/product/ProductList'

export default function ProductsPage() {
  return <ProductList />
}
```

### Paso 7: Agregar al Sidebar

```typescript
// src/components/layout/Sidebar.tsx — agregar la nueva ruta
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users',     label: 'Usuarios'  },
  { href: '/areas',     label: 'Áreas'     },
  { href: '/products',  label: 'Productos' }, // ← nueva línea
]
```

### Paso 8: Tests

Crear `tests/unit/store/product.store.test.ts` siguiendo el patrón de la sección 22.

### Resumen — Archivos a crear por entidad nueva

| # | Archivo | Acción |
|---|---|---|
| 1 | `src/store/interfaces/{entity}.interface.ts` | Definir `I{Entity}`, `I{Entity}UpsertPayload` y `{entity}FormSchema` (Zod) |
| 2 | `src/store/services/{entity}.service.ts` | Service con `getAll`, `getById`, `upsert`, `remove` |
| 3 | `src/store/zustand/{entity}.store.ts` | Store con estado y acciones |
| 4 | `src/store/hooks/use{Entity}.hook.ts` | Hook que encapsula el store |
| 5 | `src/components/functional/{entity}/{Entity}List.tsx` | Componente de lista |
| 6 | `src/components/functional/{entity}/{Entity}Form.tsx` | Componente de formulario |
| 7 | `src/app/{entity}/page.tsx` | Page (una línea) |
| 8 | `src/components/layout/Sidebar.tsx` | **Modificar:** agregar ítem de navegación |
| 9 | `tests/unit/store/{entity}.store.test.ts` | Tests unitarios del store |

---

## 21. Docker

### .dockerignore

```dockerignore
node_modules
.next
.env.local
.env.*.local
.git
.gitignore
coverage
tests
*.md
.vscode
.idea
```

### Dockerfile (Multi-stage Build)

```dockerfile
# ─── Etapa 1: Dependencias ───
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ─── Etapa 2: Build ───
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desactivar telemetría de Next.js en build
ENV NEXT_TELEMETRY_DISABLED=1

# Las variables NEXT_PUBLIC_ deben estar disponibles en el build
# En CI/CD, inyectar vía --build-arg o variables del pipeline
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN yarn build

# ─── Etapa 3: Producción ───
FROM node:22-alpine AS production

RUN apk add --no-cache tzdata dumb-init
ENV TZ=America/Santiago
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Ejecutar como usuario no-root
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copiar solo los artefactos del build standalone
COPY --from=builder /app/public         ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static   ./.next/static

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health 2>/dev/null || \
      wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# dumb-init maneja señales correctamente (graceful shutdown desde PID 1)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

> **IMPORTANTE:** Las variables `NEXT_PUBLIC_*` se incrustan en el bundle de JavaScript en tiempo de **build**, no en runtime. Por eso el Dockerfile las recibe como `ARG`. En runtime, las variables del servidor (sin `NEXT_PUBLIC_`) sí pueden inyectarse vía orquestador.

### docker-compose.yml (solo desarrollo local)

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      target: production
      args:
        NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1
    ports:
      - "3000:3000"
    restart: unless-stopped
```

---

## 22. Testing

### Configuración de Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'tests/',
        'src/app/',            // Pages son demasiado delgadas para testear directamente
        'src/components/layout/', // Layout tiene dependencias de navegación difíciles de mockear
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Setup de Tests

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de next/navigation para tests que usen useRouter, usePathname, etc.
vi.mock('next/navigation', () => ({
  useRouter:   () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  redirect:    vi.fn(),
}))

// Mock del módulo api para que los tests no hagan llamadas HTTP reales
vi.mock('@/utils/api', () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    put:    vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request:  { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))
```

### Test del Store

```typescript
// tests/unit/store/area.store.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { useAreaStore } from '@/store/zustand/area.store'
import { areaService } from '@/store/services/area.service'

vi.mock('@/store/services/area.service')

const mockArea = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Tecnología',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('useAreaStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Resetear el store antes de cada test
    useAreaStore.setState({
      areaList: [], selectedArea: null,
      isLoading: false, hasError: false, errorMessage: '',
    })
  })

  describe('areaGetAll', () => {
    it('debería cargar la lista de áreas correctamente', async () => {
      vi.mocked(areaService.getAll).mockResolvedValue({
        data: { success: true, data: [mockArea], error: null },
      } as never)

      await act(async () => {
        await useAreaStore.getState().areaGetAll()
      })

      const state = useAreaStore.getState()
      expect(state.areaList).toHaveLength(1)
      expect(state.areaList[0].name).toBe('Tecnología')
      expect(state.isLoading).toBe(false)
      expect(state.hasError).toBe(false)
    })

    it('debería manejar error del servidor', async () => {
      vi.mocked(areaService.getAll).mockResolvedValue({
        data: { success: false, data: null, error: 'Error de servidor' },
      } as never)

      await act(async () => {
        await useAreaStore.getState().areaGetAll()
      })

      const state = useAreaStore.getState()
      expect(state.hasError).toBe(true)
      expect(state.errorMessage).toBe('Error de servidor')
      expect(state.areaList).toHaveLength(0)
    })

    it('debería manejar errores de red', async () => {
      vi.mocked(areaService.getAll).mockRejectedValue(new Error('Network Error'))

      await act(async () => {
        await useAreaStore.getState().areaGetAll()
      })

      const state = useAreaStore.getState()
      expect(state.hasError).toBe(true)
      expect(state.errorMessage).toBe('Network Error')
    })
  })

  describe('areaUpsert', () => {
    it('debería crear un área y agregarla a la lista', async () => {
      vi.mocked(areaService.upsert).mockResolvedValue({
        data: { success: true, data: mockArea, error: null },
      } as never)

      await act(async () => {
        await useAreaStore.getState().areaUpsert({ name: 'Tecnología' })
      })

      const state = useAreaStore.getState()
      expect(state.areaList).toHaveLength(1)
      expect(state.areaList[0].name).toBe('Tecnología')
    })

    it('debería actualizar un área existente en la lista', async () => {
      const updatedArea = { ...mockArea, name: 'Tech' }

      useAreaStore.setState({ areaList: [mockArea] })

      vi.mocked(areaService.upsert).mockResolvedValue({
        data: { success: true, data: updatedArea, error: null },
      } as never)

      await act(async () => {
        await useAreaStore.getState().areaUpsert({ id: mockArea.id, name: 'Tech' })
      })

      const state = useAreaStore.getState()
      expect(state.areaList).toHaveLength(1)
      expect(state.areaList[0].name).toBe('Tech')
    })
  })
})
```

### Test de Componente Functional

```typescript
// tests/unit/components/area/AreaList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AreaList } from '@/components/functional/area/AreaList'
import { useArea } from '@/store/hooks/useArea.hook'

// Mock del hook para aislar el componente del store real
vi.mock('@/store/hooks/useArea.hook')

const mockUseArea = {
  areaGetAll:     vi.fn(),
  areaUpsert:     vi.fn(),
  areaRemove:     vi.fn(),
  areaSelect:     vi.fn(),
  areaClearError: vi.fn(),
  areaList:       [],
  selectedArea:   null,
  isLoading:      false,
  hasError:       false,
  errorMessage:   '',
}

describe('AreaList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useArea).mockReturnValue(mockUseArea)
  })

  it('debería llamar a areaGetAll al montar', () => {
    render(<AreaList />)
    expect(mockUseArea.areaGetAll).toHaveBeenCalledTimes(1)
  })

  it('debería mostrar Skeleton en la carga inicial', () => {
    vi.mocked(useArea).mockReturnValue({ ...mockUseArea, isLoading: true })
    render(<AreaList />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('debería mostrar Alert cuando hay error', () => {
    vi.mocked(useArea).mockReturnValue({
      ...mockUseArea, hasError: true, errorMessage: 'Error de conexión',
    })
    render(<AreaList />)
    expect(screen.getByText('Error de conexión')).toBeInTheDocument() // text shown to user stays in Spanish
  })

  it('debería mostrar la tabla con datos', () => {
    vi.mocked(useArea).mockReturnValue({
      ...mockUseArea,
      areaList: [{ id: '1', name: 'Tecnología', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
    })
    render(<AreaList />)
    expect(screen.getByText('Tecnología')).toBeInTheDocument()
  })

  it('debería abrir el modal al hacer clic en "Nueva área"', async () => {
    render(<AreaList />)
    fireEvent.click(screen.getByText('Nueva área'))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
```

### Estructura de Tests

```
tests/
├── setup.ts                            # Setup global (mocks de next/navigation y api)
├── unit/
│   ├── store/
│   │   ├── auth.store.test.ts
│   │   └── area.store.test.ts
│   └── components/
│       ├── auth/
│       │   └── LoginForm.test.tsx
│       └── area/
│           └── AreaList.test.tsx
```

**Qué testear en cada capa:**

| Capa | Qué testear | Qué mockear |
|---|---|---|
| **Store** | Ciclo de vida de acciones, manejo de errores, actualización del estado | Services |
| **Functional** | Render condicional (loading/error/datos), interacciones del usuario | Hooks |
| **UI** | Props, variantes, accesibilidad | Nada (son funciones puras) |

---

## 23. Scripts de Ejecución

```json
{
  "scripts": {
    "dev":           "next dev --turbopack -p 3020",
    "build":         "next build",
    "start":         "next start -p 3020",
    "lint":          "next lint",
    "typecheck":     "tsc --noEmit",
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

| Script | Cuándo usarlo |
|---|---|
| `yarn dev` | Desarrollo local con hot reload (Turbopack) |
| `yarn build` | Verificar que el build de producción compila sin errores |
| `yarn start` | Correr el build de producción localmente |
| `yarn lint` | Verificar reglas de ESLint (obligatorio antes de PR) |
| `yarn typecheck` | Verificar tipos sin compilar (obligatorio antes de PR) |
| `yarn test` | CI/CD y verificación previa al merge |
| `yarn test:watch` | Desarrollo de tests con re-ejecución automática |
| `yarn test:coverage` | Verificar cobertura de tests |

---

## 24. Checklist Pre-Deploy

Verificar antes de llevar cualquier frontend a producción:

**Variables y Seguridad**
- [ ] `.env.local` NO está en el repositorio ni en la imagen Docker
- [ ] Ningún secreto tiene el prefijo `NEXT_PUBLIC_`
- [ ] No hay `console.log` de depuración en el código (`yarn lint` pasa sin errores)
- [ ] Ninguna variable de entorno está hardcodeada fuera de `utils/config.ts`

**Build y Calidad**
- [ ] `yarn typecheck` pasa sin errores
- [ ] `yarn build` completa sin errores ni warnings críticos
- [ ] `yarn lint` pasa sin errores
- [ ] `yarn test` pasa con cobertura ≥ 70%
- [ ] Todas las interfaces del frontend están sincronizadas con el backend
- [ ] No hay código en español en variables, funciones, ni nombres de archivo (solo en textos visibles al usuario)
- [ ] Los componentes shadcn en `src/components/ui/` no fueron modificados directamente (salvo `spinner.tsx`)

**Next.js**
- [ ] `output: 'standalone'` activo en `next.config.ts`
- [ ] `NEXT_TELEMETRY_DISABLED=1` configurado en el Dockerfile
- [ ] Headers de seguridad configurados en `next.config.ts`
- [ ] Variables `NEXT_PUBLIC_*` inyectadas como `ARG` en el Dockerfile (no hardcodeadas)

**Docker e Infraestructura**
- [ ] Docker corre como usuario no-root (UID 1001)
- [ ] HEALTHCHECK activo y respondiendo
- [ ] `dumb-init` instalado para graceful shutdown
- [ ] Headers de seguridad verificados con [securityheaders.com](https://securityheaders.com)
- [ ] HTTPS obligatorio en producción (nunca HTTP)

---

## 25. Estructura Final del Proyecto

```
app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Layout raíz (autenticado)
│   │   ├── page.tsx                      # Redirige a /dashboard
│   │   ├── login/
│   │   │   ├── layout.tsx                # Layout público (sin Sidebar)
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   └── page.tsx
│   │   └── {feature}/
│   │       └── page.tsx
│   ├── components/
│   │   ├── functional/
│   │   │   ├── auth/
│   │   │   │   └── LoginForm.tsx
│   │   │   └── {entity}/
│   │   │       ├── {Entity}List.tsx
│   │   │       └── {Entity}Form.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/                           # archivos generados por shadcn (button.tsx, table.tsx, skeleton.tsx, alert-dialog.tsx...)
│   ├── lib/
│   │   └── utils.ts                      # cn() helper (generado por shadcn init)
│   ├── store/
│   │   ├── hooks/
│   │   │   ├── useAuth.hook.ts
│   │   │   └── use{Entity}.hook.ts
│   │   ├── interfaces/
│   │   │   ├── response.interface.ts
│   │   │   ├── auth.interface.ts
│   │   │   └── {entity}.interface.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── {entity}.service.ts
│   │   └── zustand/
│   │       ├── auth.store.ts
│   │       └── {entity}.store.ts
│   ├── lib/
│   │   └── utils.ts                      # cn() helper de shadcn (generado por init)
│   ├── styles/
│   │   └── globals.css
│   └── utils/
│       ├── api.ts
│       └── config.ts
├── tests/
│   ├── setup.ts
│   └── unit/
│       ├── store/
│       │   └── {entity}.store.test.ts
│       └── components/
│           └── {entity}/
│               └── {Entity}List.test.tsx
├── middleware.ts                          # Protección de rutas
├── .dockerignore
├── .env.local
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```
