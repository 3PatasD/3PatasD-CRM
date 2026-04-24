# 3PatasD CRM

Sistema de gestión de pedidos, facturas, stock, compras y promociones. Construido para uso en entorno local con acceso remoto vía Cloudflare Tunnel.

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Arranque rápido](#arranque-rápido)
3. [Módulos y funcionalidades](#módulos-y-funcionalidades)
4. [Flujo documental](#flujo-documental)
5. [Roles y permisos](#roles-y-permisos)
6. [Acceso desde internet](#acceso-desde-internet-cloudflare-tunnel)
7. [Estructura del proyecto](#estructura-del-proyecto)
8. [Cómo añadir funcionalidades](#cómo-añadir-funcionalidades)
9. [Variables de entorno](#variables-de-entorno)
10. [Base de datos](#base-de-datos)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Base de datos | PostgreSQL 16 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Autenticación | NextAuth v5 (Credentials + JWT) |
| UI | Tailwind CSS + Radix UI |
| Gráficas | Recharts |
| PDF | @react-pdf/renderer |
| Despliegue | Docker + Cloudflare Tunnel |

---

## Arranque rápido

### Opción A — Docker (recomendado)

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar NEXTAUTH_SECRET con un valor seguro:
#   openssl rand -base64 32

# 2. Levantar todos los servicios
docker compose up --build -d

# 3. Migraciones y seed (primera vez)
docker compose exec app npx prisma migrate deploy
docker compose exec app npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

La URL pública del tunnel aparece en los logs:
```bash
docker compose logs cloudflared | grep trycloudflare
```

### Opción B — Local (sin Docker)

**Requisitos:** Node.js 18+, PostgreSQL 16

```bash
npm install
cp .env.example .env          # ajustar DATABASE_URL si es necesario

createdb 3patasd_crm

npx prisma migrate dev --name init
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts

npm run dev                   # http://localhost:3000
```

### Credenciales iniciales (seed)

| Usuario | Email | Contraseña | Rol |
|---------|-------|-----------|-----|
| Admin | `admin@3patasd.com` | `admin123` | ADMIN |
| Vendedor | `vendedor@3patasd.com` | `vendedor123` | VENDEDOR |
| Almacén | `almacen@3patasd.com` | `almacen123` | ALMACEN |

> Cambiar estas contraseñas en producción desde **Ajustes → Usuarios**.

---

## Módulos y funcionalidades

### Dashboard
- KPIs en tiempo real: ventas del mes vs mes anterior (%), pedidos pendientes, facturas por cobrar, productos con stock bajo
- Gráfica de área: ingresos vs gastos en los últimos 12 meses
- Top 5 clientes por volumen facturado con barra proporcional
- Lista de alertas de stock bajo con enlace al producto

### Clientes
- Listado con búsqueda en tiempo real (nombre, CIF, email)
- Campos: nombre, CIF/NIF, email, teléfono, móvil, dirección completa, notas
- Soft-delete (`activo = false`) — preserva el historial de documentos
- Vista de detalle con edición en línea

### Proveedores
- CRUD completo con los mismos campos que Clientes
- Vinculación de productos con referencia y precio de compra por proveedor

### Productos / Materiales
- SKU único por producto
- Categorías para clasificar el catálogo
- Control de stock: `stockActual` y `stockMinimo`
- Precios: `precioCosto`, `precioVenta`, IVA por producto
- Vinculación con proveedores (referencia + precio de compra)

### Presupuestos
- Numeración automática anual: `PRS-2026-001`
- Formulario con líneas: autocompletado desde catálogo, descuento por línea, IVA
- Descuento global (%) y código promocional con validación en tiempo real
- Estados: `BORRADOR → ENVIADO → ACEPTADO → RECHAZADO / CADUCADO`
- Acción **Convertir a Pedido** (un clic)
- Exportación a PDF con logo y datos de empresa

### Pedidos
- Numeración automática: `PED-2026-001`
- Creación directa o desde presupuesto aceptado
- Seguimiento de `cantidadServida` por línea para albaranes parciales
- Estados: `PENDIENTE → EN_PROCESO → PREPARADO → ENTREGADO / CANCELADO`
- Acción **Crear Albarán** (un clic)
- Exportación a PDF

### Albaranes
- Numeración automática: `ALB-2026-001`
- Snapshot de precios en el momento de creación (inmutable)
- **Stock se decrementa al marcar ENTREGADO** (no en la creación)
- Estado `DEVUELTO` revierte el stock
- Pueden agruparse varios albaranes del mismo cliente en una factura
- Exportación a PDF con campos de firma y dirección de entrega

### Facturas
- Numeración automática: `FAC-2026-001`
- Generadas agrupando uno o varios albaranes del mismo cliente
- Estados: `EMITIDA → PAGADA / VENCIDA / ANULADA`
- Fecha de vencimiento y método de pago
- Exportación a PDF con datos bancarios de la empresa en el pie

### Compras
- Numeración automática: `COM-2026-001`
- Órdenes de compra a proveedores con líneas de producto
- Recepción parcial o total (`cantidadRecibida` por línea)
- **Stock se incrementa al registrar recepción**
- Estados: `PENDIENTE → RECIBIDA_PARCIAL → RECIBIDA / CANCELADA`

### Promociones
- Código único (normalizado a mayúsculas automáticamente)
- Tipo `PORCENTAJE` (%) o `FIJO` (€)
- Fecha de inicio y fin opcionales
- Límite de usos con contador automático
- Validación en tiempo real al escribir el código en presupuestos/pedidos

### Ajustes de empresa
- Nombre, CIF, dirección, teléfono, email, web
- Logo: subida de imagen, se renderiza en todos los PDF
- Datos bancarios: aparecen en el pie de las facturas PDF
- IVA por defecto para nuevos productos
- Solo accesible por rol ADMIN

### Usuarios
- Crear, editar y desactivar usuarios del sistema
- Asignación de rol (ADMIN, VENDEDOR, ALMACEN)
- Solo accesible por rol ADMIN

---

## Flujo documental

```
PRESUPUESTO  ──[Aceptado + Convertir]──►  PEDIDO  ──[Albaranear]──►  ALBARÁN
PRS-2026-001                              PED-2026-001               ALB-2026-001
BORRADOR                                  PENDIENTE                  PENDIENTE
ENVIADO                                   EN_PROCESO                 ENTREGADO ──► stock -
ACEPTADO                                  PREPARADO                  DEVUELTO  ──► stock +
RECHAZADO                                 ENTREGADO                      │
CADUCADO                                  CANCELADO               [Facturar]
                                                                         │
                                                                         ▼
                                                                    FACTURA
                                                                    FAC-2026-001
                                                                    EMITIDA → PAGADA
                                                                             → VENCIDA
                                                                             → ANULADA

COMPRA ──[Recepción parcial/total]──► stock +
COM-2026-001
PENDIENTE → RECIBIDA_PARCIAL → RECIBIDA / CANCELADA
```

**Reglas de stock:**
- **Salida** → Albarán pasa a `ENTREGADO`
- **Entrada** → Compra registra recepción de mercancía
- **Devolución** → Albarán pasa a `DEVUELTO` (revierte la salida)

---

## Roles y permisos

| Módulo | ADMIN | VENDEDOR | ALMACEN |
|--------|:-----:|:--------:|:-------:|
| Clientes | RW | RW | R |
| Proveedores | RW | R | R |
| Productos | RW | R | RW |
| Presupuestos | RW | RW | R |
| Pedidos | RW | RW | R |
| Albaranes | RW | R | RW |
| Facturas | RW | R | — |
| Compras | RW | R | RW |
| Promociones | RW | R | — |
| Ajustes | RW | — | — |
| Usuarios | RW | — | — |

**R** = solo lectura · **RW** = lectura y escritura · **—** = sin acceso

La matriz se define en `src/lib/permissions.ts`. El middleware en `src/middleware.ts` protege todas las rutas del dashboard a nivel de servidor.

---

## Acceso desde internet (Cloudflare Tunnel)

### URL temporal para pruebas (sin cuenta Cloudflare)

El `docker-compose.yml` usa por defecto un quick tunnel que genera una URL pública temporal:

```bash
docker compose logs cloudflared | grep trycloudflare
# → https://xxxx-xxxx.trycloudflare.com
```

Esa URL funciona en cualquier dispositivo (móvil, tablet, PC) sin configuración adicional.

### Dominio propio permanente (producción)

```bash
# 1. Instalar y autenticar cloudflared
cloudflared tunnel login
cloudflared tunnel create 3patasd-crm

# 2. Copiar el JSON de credenciales a cloudflared/
#    Editar cloudflared/config.yml con el UUID del tunnel

# 3. Crear registro DNS
cloudflared tunnel route dns 3patasd-crm crm.tudominio.com

# 4. En docker-compose.yml activar "Option A" (comentado en el archivo)
docker compose up -d
```

---

## Estructura del proyecto

```
3PatasD-CRM/
├── prisma/
│   ├── schema.prisma          # Modelos y relaciones (fuente de verdad)
│   ├── migrations/            # Historial de migraciones SQL
│   └── seed.ts                # Datos iniciales de desarrollo
│
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Página de login pública
│   │   ├── (dashboard)/       # Páginas protegidas por sesión
│   │   │   ├── layout.tsx     # Shell: Sidebar + Header
│   │   │   ├── page.tsx       # Dashboard KPI
│   │   │   └── <modulo>/
│   │   │       ├── page.tsx        # Listado
│   │   │       ├── nuevo/page.tsx  # Formulario de creación
│   │   │       └── [id]/page.tsx   # Detalle y edición
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── <modulo>/route.ts          # GET (lista) + POST (crear)
│   │       ├── <modulo>/[id]/route.ts     # GET + PUT + DELETE
│   │       ├── <modulo>/[id]/pdf/route.ts # Genera PDF
│   │       └── <modulo>/[id]/<accion>/    # Transiciones de estado
│   │
│   ├── components/
│   │   ├── dashboard/    # KPICard, SalesChart, TopClientesTable, LowStockAlert
│   │   ├── documentos/   # DocumentoForm (compartido presupuestos/pedidos)
│   │   ├── layout/       # Sidebar, Header, SessionProvider
│   │   ├── pdf/          # PDFBase + un componente por tipo de documento
│   │   ├── shared/       # ConfirmDialog, PageHeader, StatusBadge
│   │   └── ui/           # Button, Card, Input, Select, Dialog, Toast…
│   │
│   ├── lib/
│   │   ├── prisma.ts       # Singleton PrismaClient con adapter-pg
│   │   ├── auth.ts         # NextAuth v5: provider + callbacks JWT
│   │   ├── autonumber.ts   # nextNumero() — numeración atómica
│   │   ├── permissions.ts  # Matriz de permisos por rol
│   │   └── utils.ts        # cn(), formatEuro(), formatDate(), toDecimal()
│   │
│   ├── hooks/use-toast.ts
│   └── middleware.ts        # Protección global /(dashboard)/*
│
├── docs/
│   └── EXTENDING.md         # Guía para añadir nuevas funcionalidades
│
├── docker-compose.yml
├── Dockerfile
├── cloudflared/config.yml
├── prisma.config.ts
└── .env
```

---

## Cómo añadir funcionalidades

Ver [`docs/EXTENDING.md`](docs/EXTENDING.md) para la guía paso a paso con ejemplos completos.

Resumen del proceso para añadir un módulo nuevo:

1. **Modelo** → `prisma/schema.prisma` + `npx prisma migrate dev`
2. **API** → `src/app/api/<modulo>/route.ts` y `[id]/route.ts`
3. **Permisos** → `src/lib/permissions.ts`
4. **Sidebar** → `src/components/layout/Sidebar.tsx`
5. **Páginas** → `src/app/(dashboard)/<modulo>/page.tsx` y `nuevo/page.tsx`
6. **PDF** (opcional) → `src/components/pdf/PDF<Modulo>.tsx` + ruta `[id]/pdf/route.ts`

---

## Variables de entorno

Copiar `.env.example` a `.env`:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://crm_user:crm_password@localhost:5432/3patasd_crm` |
| `NEXTAUTH_SECRET` | Clave JWT (mín. 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL base de la app | `http://localhost:3000` |

---

## Base de datos

El esquema completo está en `prisma/schema.prisma`. Decisiones de diseño clave:

- **Campos monetarios en `Decimal`** — nunca `Float`, para evitar errores de coma flotante con euros
- **Snapshots en líneas** — descripción y precio se guardan en el momento de creación; el historial es inmutable aunque el producto cambie después
- **Soft-delete** en clientes, proveedores y productos (`activo = false`) — preserva todas las relaciones históricas
- **Numeración anual atómica** — tabla `Contador` con `INSERT ON CONFLICT DO UPDATE` en `$transaction`; sin race conditions bajo carga
- **Stock en dos puntos únicos** — salida al entregar albarán, entrada al recibir compra
