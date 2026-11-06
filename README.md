# PH Control

Interfaz web responsive en español para administrar conjuntos residenciales con la API NestJS del proyecto.

## Requisitos

- Node.js compatible con Vite 8.
- API NestJS ejecutándose y accesible desde el navegador o mediante el proxy de desarrollo.

## Configuración y ejecución

```bash
npm install
npm run dev
```

La aplicación se sirve en la URL que indique Vite. La URL pública de la API se configura con `VITE_API_BASE_URL`; no hay hosts ni credenciales fijados en el código. Para desarrollo local, copia `.env.example` a `.env.local` y configura `API_PROXY_TARGET` con la URL del backend. El proxy de Vite evita depender de CORS durante el desarrollo:

```dotenv
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:3002
```

Las llamadas REST y de autenticación usan el prefijo `/api`; el proxy lo conserva al reenviar a NestJS (que configura ese prefijo globalmente). Esto separa los endpoints de las rutas de pantalla (por ejemplo, `/users` y `/properties`) para que la navegación directa y las recargas de React Router no terminen en el backend. En producción, conserva el prefijo con un reverse proxy o configura `VITE_API_BASE_URL` con la URL completa de la API, incluido `/api`.

El backend NestJS de este proyecto escucha por defecto en el puerto `3002` (`PORT` puede cambiarlo). Para producción, define `VITE_API_BASE_URL` con la URL pública de la API o sirve la aplicación detrás de un proxy del mismo origen. Si se conecta directamente desde el navegador, el backend debe permitir el origen del frontend mediante CORS.

## Acceso

- La pantalla de inicio de sesión está en `/login`; las demás rutas requieren una sesión válida.
- La autenticación usa `POST /api/auth/login`, `GET /api/auth/me` y `POST /api/auth/logout`.
- La sesión se mantiene en una cookie `HttpOnly`; el navegador la envía con las solicitudes y JavaScript no recibe ni guarda el token.
- Configura `JWT_SECRET` en el backend con un secreto de al menos 32 bytes y `FRONTEND_ORIGINS` con el origen exacto del frontend. En desarrollo, el backend permite `http://localhost:5173` por defecto.
- No existe registro público: las cuentas se crean mediante la administración de usuarios.

## Módulos

- **Resumen** (`/`): indicadores calculados con datos reales de la API.
- **Conjuntos** (`/complexes`): CRUD de conjuntos residenciales.
- **Propiedades** (`/properties`): CRUD de propiedades y bloques.
- **Documentos** (`/documents`): consulta, detalle, alta, edición y anulación de F, ND, RC y NC.
- **Aplicaciones** (`/applications`): cruce de documentos activos, disponibilidad estimada y confirmación de la API.
- **Propietarios** (`/owners`): CRUD de personas, contacto y asociación con una o varias propiedades.
- **Usuarios** (`/users`): CRUD de cuentas, estado, contraseña y asignación/quita de roles.
- **Roles** (`/roles`): CRUD de roles globales y asociados a un conjunto.
- **Conceptos** (`/concepts`): CRUD de conceptos globales y asociados a un conjunto.

El frontend consume `/complex`, `/blocks`, `/properties`, `/users`, `/roles`, `/owners`, `/financial-concepts`, `/financial-documents` y `/document-applications`, así como las rutas anidadas de roles de usuario. Los tipos y métodos se contrastaron con los controladores y DTOs de la API.

Las pantallas se organizan por funcionalidad en `src/features/<módulo>/`, comparten controles y helpers tipados desde `src/shared/` y cargan cada ruta bajo demanda con React Router. El cliente HTTP y los contratos de la API están centralizados en `src/api.ts` y `src/types.ts`.

Los importes se validan y suman en centavos; los cuerpos HTTP envían números con hasta dos decimales. Las respuestas de usuario se normalizan a una lista permitida de campos y descartan siempre `password`.

### Límite del backend: usuarios inquilinos

Un inquilino se representa como un usuario al que se asigna el rol `TENANT`. El backend actual no define una relación ni un endpoint para vincular una cuenta de usuario con una propiedad. Por eso la interfaz no simula esa asociación; se necesita añadirla al backend si se requiere persistir la unidad del inquilino.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm test
npm run preview
```

El build y las pruebas no requieren una API activa. La interfaz sí requiere una API accesible para cargar o guardar información.
# ph-front
