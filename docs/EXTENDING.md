# Guía para añadir funcionalidades

Esta guía explica, con ejemplos concretos y código completo, cómo extender el CRM con nuevos módulos, campos, acciones o integraciones. Sigue el mismo patrón que usan los módulos existentes.

---

## Índice

1. [Añadir un módulo completo](#1-añadir-un-módulo-completo)
2. [Añadir un campo a un módulo existente](#2-añadir-un-campo-a-un-módulo-existente)
3. [Añadir una acción de transición de estado](#3-añadir-una-acción-de-transición-de-estado)
4. [Añadir un nuevo PDF](#4-añadir-un-nuevo-pdf)
5. [Añadir un nuevo rol](#5-añadir-un-nuevo-rol)
6. [Añadir un KPI al dashboard](#6-añadir-un-kpi-al-dashboard)
7. [Añadir numeración automática a un nuevo tipo](#7-añadir-numeración-automática-a-un-nuevo-tipo)
8. [Patrones reutilizables](#8-patrones-reutilizables)

---

## 1. Añadir un módulo completo

**Ejemplo: módulo de "Incidencias"**

### Paso 1 — Modelo en Prisma

```prisma
// prisma/schema.prisma

enum EstadoIncidencia {
  ABIERTA
  EN_CURSO
  RESUELTA
  CERRADA
}

model Incidencia {
  id          String            @id @default(cuid())
  numero      String            @unique
  clienteId   String
  cliente     Cliente           @relation(fields: [clienteId], references: [id])
  usuarioId   String
  usuario     Usuario           @relation(fields: [usuarioId], references: [id])
  titulo      String
  descripcion String?
  estado      EstadoIncidencia  @default(ABIERTA)
  prioridad   Int               @default(1)  // 1=baja 2=media 3=alta
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

Añadir la relación inversa en `Cliente` y `Usuario`:
```prisma
model Cliente {
  // ... campos existentes
  incidencias Incidencia[]
}
```

Ejecutar la migración:
```bash
npx prisma migrate dev --name add_incidencias
```

### Paso 2 — API: listado y creación

```typescript
// src/app/api/incidencias/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nextNumero } from "@/lib/autonumber";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const estado = searchParams.get("estado");

  const incidencias = await prisma.incidencia.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { titulo: { contains: search, mode: "insensitive" } },
            { cliente: { nombre: { contains: search, mode: "insensitive" } } },
          ],
        } : {},
        estado ? { estado: estado as EstadoIncidencia } : {},
      ],
    },
    include: {
      cliente: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
    },
    orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(incidencias);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  if (!body.clienteId) return NextResponse.json({ error: "clienteId es obligatorio" }, { status: 400 });
  if (!body.titulo?.trim()) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });

  const numero = await nextNumero("INC");  // ver Paso 7 para añadir el prefijo

  const incidencia = await prisma.incidencia.create({
    data: {
      numero,
      clienteId: body.clienteId,
      usuarioId: session.user.id,
      titulo: body.titulo.trim(),
      descripcion: body.descripcion ?? null,
      prioridad: body.prioridad ?? 1,
    },
  });

  return NextResponse.json(incidencia, { status: 201 });
}
```

### Paso 3 — API: detalle, edición y borrado

```typescript
// src/app/api/incidencias/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const incidencia = await prisma.incidencia.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuario: { select: { nombre: true } },
    },
  });

  if (!incidencia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(incidencia);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const incidencia = await prisma.incidencia.update({
    where: { id },
    data: {
      titulo: body.titulo,
      descripcion: body.descripcion,
      estado: body.estado,
      prioridad: body.prioridad,
    },
  });

  return NextResponse.json(incidencia);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.incidencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

### Paso 4 — Permisos

```typescript
// src/lib/permissions.ts

type Module =
  | "clientes" | "proveedores" | "productos"
  | "presupuestos" | "pedidos" | "albaranes" | "facturas"
  | "compras" | "promociones" | "ajustes" | "usuarios"
  | "incidencias";  // ← añadir aquí

const PERMISSIONS: Record<Role, Record<Module, Permission>> = {
  ADMIN:    { /* ... */ incidencias: "rw" },
  VENDEDOR: { /* ... */ incidencias: "rw" },
  ALMACEN:  { /* ... */ incidencias: "r"  },
};
```

### Paso 5 — Sidebar

```typescript
// src/components/layout/Sidebar.tsx

import { AlertCircle } from "lucide-react";

const navItems = [
  // ... entradas existentes
  { separator: true },
  { label: "Incidencias", href: "/incidencias", icon: AlertCircle, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
];
```

### Paso 6 — Página de listado

```typescript
// src/app/(dashboard)/incidencias/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Incidencia {
  id: string;
  numero: string;
  titulo: string;
  estado: string;
  prioridad: number;
  cliente: { nombre: string };
  createdAt: string;
}

export default function IncidenciasPage() {
  const [items, setItems] = useState<Incidencia[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/incidencias?search=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(setItems)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidencias</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestión de incidencias de clientes</p>
        </div>
        <Link href="/incidencias/nuevo">
          <Button><Plus className="h-4 w-4 mr-2" />Nueva incidencia</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título o cliente..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Número</th>
              <th className="text-left px-4 py-3 font-medium">Título</th>
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-left px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            ) : items.map(i => (
              <tr key={i.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/incidencias/${i.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{i.numero}</td>
                <td className="px-4 py-3 font-medium">{i.titulo}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.cliente.nombre}</td>
                <td className="px-4 py-3">{i.estado}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(i.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Paso 7 — Página de creación y detalle

Seguir el mismo patrón de `src/app/(dashboard)/clientes/nuevo/page.tsx` y `[id]/page.tsx`.

---

## 2. Añadir un campo a un módulo existente

**Ejemplo: añadir `web` al modelo Cliente** (ya existe en el schema, este ejemplo muestra el proceso completo)

### Paso 1 — Schema

```prisma
model Cliente {
  // ... campos existentes
  web String?    // ← nuevo campo
}
```

```bash
npx prisma migrate dev --name add_cliente_web
```

### Paso 2 — API: incluir en GET y PUT

```typescript
// src/app/api/clientes/[id]/route.ts — en el PUT
const cliente = await prisma.cliente.update({
  where: { id },
  data: {
    nombre: body.nombre,
    // ... campos existentes
    web: body.web ?? null,   // ← añadir
  },
});
```

### Paso 3 — UI: formulario

```typescript
// src/app/(dashboard)/clientes/[id]/page.tsx — en el formulario de edición
<div>
  <Label>Web</Label>
  <Input
    value={form.web ?? ""}
    onChange={e => setForm(f => ({ ...f, web: e.target.value }))}
    placeholder="https://www.ejemplo.com"
  />
</div>
```

No se necesita tocar el middleware, la sidebar ni los permisos para añadir campos a módulos existentes.

---

## 3. Añadir una acción de transición de estado

**Ejemplo: marcar una incidencia como resuelta**

```typescript
// src/app/api/incidencias/[id]/resolver/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const incidencia = await prisma.incidencia.findUnique({ where: { id } });

  if (!incidencia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (incidencia.estado === "RESUELTA") {
    return NextResponse.json({ error: "Ya está resuelta" }, { status: 400 });
  }

  const actualizada = await prisma.incidencia.update({
    where: { id },
    data: { estado: "RESUELTA" },
  });

  return NextResponse.json(actualizada);
}
```

En la página de detalle, añadir el botón que llama a esta ruta:

```typescript
async function handleResolver() {
  const res = await fetch(`/api/incidencias/${id}/resolver`, { method: "POST" });
  if (res.ok) {
    toast({ title: "Incidencia resuelta" });
    router.refresh();
  }
}

// En el JSX:
<Button onClick={handleResolver} disabled={incidencia.estado === "RESUELTA"}>
  Marcar como resuelta
</Button>
```

El patrón es idéntico al de `presupuestos/[id]/convertir`, `pedidos/[id]/albaranear` y `albaranes/[id]/facturar`.

---

## 4. Añadir un nuevo PDF

**Ejemplo: PDF para incidencias**

### Paso 1 — Componente PDF

```typescript
// src/components/pdf/PDFIncidencia.tsx
import { Document, Page, Text, View, styles, PDFHeader, PDFClienteBlock, PDFFooter, formatDatePDF } from "./PDFBase";

export function PDFIncidencia({ incidencia, empresa }: {
  incidencia: Record<string, unknown>;
  empresa: Record<string, unknown> | null;
}) {
  const i = incidencia as { numero: string; titulo: string; descripcion?: string; estado: string; createdAt: string; cliente: Record<string, unknown> };
  const e = empresa as { nombre: string; /* ... */ } | null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader empresa={e} titulo="INCIDENCIA" numero={i.numero} fecha={formatDatePDF(i.createdAt)} />
        <PDFClienteBlock cliente={i.cliente as { nombre: string }} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i.titulo}</Text>
          {i.descripcion && <Text style={{ fontSize: 9, marginTop: 4 }}>{i.descripcion}</Text>}
        </View>

        <PDFFooter empresa={e} />
      </Page>
    </Document>
  );
}
```

### Paso 2 — Ruta PDF

```typescript
// src/app/api/incidencias/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { PDFIncidencia } from "@/components/pdf/PDFIncidencia";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const [incidencia, empresa] = await Promise.all([
    prisma.incidencia.findUnique({ where: { id }, include: { cliente: true } }),
    prisma.configuracionEmpresa.findFirst(),
  ]);

  if (!incidencia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const element = React.createElement(PDFIncidencia, { incidencia, empresa }) as unknown as React.ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${incidencia.numero}.pdf"`,
    },
  });
}
```

### Paso 3 — Botón de descarga en la página de detalle

```typescript
<a href={`/api/incidencias/${id}/pdf`} target="_blank" rel="noopener noreferrer">
  <Button variant="outline">
    <FileDown className="h-4 w-4 mr-2" />
    Descargar PDF
  </Button>
</a>
```

---

## 5. Añadir un nuevo rol

**Ejemplo: rol `SOPORTE`**

### Paso 1 — Enum en Prisma

```prisma
enum Role {
  ADMIN
  VENDEDOR
  ALMACEN
  SOPORTE    // ← nuevo
}
```

```bash
npx prisma migrate dev --name add_role_soporte
```

### Paso 2 — Permisos

```typescript
// src/lib/permissions.ts
const PERMISSIONS: Record<Role, Record<Module, Permission>> = {
  // ... roles existentes
  SOPORTE: {
    clientes:     "r",
    proveedores:  "-",
    productos:    "-",
    presupuestos: "-",
    pedidos:      "-",
    albaranes:    "-",
    facturas:     "-",
    compras:      "-",
    promociones:  "-",
    ajustes:      "-",
    usuarios:     "-",
    incidencias:  "rw",
  },
};
```

### Paso 3 — Label en el Header

```typescript
// src/components/layout/Header.tsx
const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  ALMACEN: "Almacén",
  SOPORTE: "Soporte",   // ← añadir
};
```

### Paso 4 — Selector en gestión de Usuarios

```typescript
// src/app/(dashboard)/usuarios/page.tsx — en el select de rol
<option value="SOPORTE">Soporte</option>
```

---

## 6. Añadir un KPI al dashboard

**Ejemplo: mostrar el número de incidencias abiertas**

### Paso 1 — API dashboard

```typescript
// src/app/api/dashboard/route.ts — añadir dentro del try
const incidenciasAbiertas = await prisma.incidencia.count({
  where: { estado: "ABIERTA" },
});

return NextResponse.json({
  // ... datos existentes
  incidenciasAbiertas,   // ← añadir al objeto de respuesta
});
```

### Paso 2 — Página del dashboard

```typescript
// src/app/(dashboard)/page.tsx — en el tipo DashboardData
interface DashboardData {
  // ... campos existentes
  incidenciasAbiertas: number;
}

// En el JSX, añadir una KPICard:
import { AlertCircle } from "lucide-react";

<KPICard
  title="Incidencias abiertas"
  value={String(data.incidenciasAbiertas)}
  icon={AlertCircle}
  descripcion="Pendientes de resolver"
  colorClass="text-red-600"
/>
```

---

## 7. Añadir numeración automática a un nuevo tipo

El prefijo se define en `src/lib/autonumber.ts`. Para añadir `INC` (incidencias):

```typescript
// src/lib/autonumber.ts
type Prefix = "PRS" | "PED" | "ALB" | "FAC" | "COM" | "INC";  // ← añadir

// El resto del código no cambia — nextNumero("INC") generará INC-2026-001
```

La tabla `Contador` en la base de datos se rellena automáticamente en el primer uso gracias al `INSERT ON CONFLICT DO UPDATE`.

---

## 8. Patrones reutilizables

### Autenticación en una API route

Siempre la primera línea del handler:
```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
```

### Paginación en listados

```typescript
const page = parseInt(searchParams.get("page") ?? "1");
const limit = 20;
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  prisma.incidencia.findMany({ skip, take: limit, orderBy: { createdAt: "desc" } }),
  prisma.incidencia.count(),
]);

return NextResponse.json({ items, total, pages: Math.ceil(total / limit) });
```

### Búsqueda insensible a mayúsculas

```typescript
where: {
  OR: [
    { nombre: { contains: search, mode: "insensitive" } },
    { email:  { contains: search, mode: "insensitive" } },
  ],
}
```

### Transacción atómica en Prisma

Para operaciones que deben ejecutarse juntas o ninguna:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.incidencia.update({ where: { id }, data: { estado: "RESUELTA" } });
  await tx.notificacion.create({ data: { incidenciaId: id, mensaje: "Resuelta" } });
});
```

### Formato de moneda en cliente

```typescript
import { formatEuro } from "@/lib/utils";
formatEuro(123.45)  // → "123,45 €"
```

### Confirmación antes de borrar

```typescript
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

<ConfirmDialog
  trigger={<Button variant="destructive">Eliminar</Button>}
  title="¿Eliminar incidencia?"
  description="Esta acción no se puede deshacer."
  onConfirm={handleDelete}
/>
```

### Notificación toast

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({ title: "Guardado" });
toast({ title: "Error", description: mensaje, variant: "destructive" });
```

---

## Checklist al añadir un módulo nuevo

- [ ] Modelo añadido en `schema.prisma` y migración ejecutada
- [ ] `GET /api/<modulo>` con filtros de búsqueda
- [ ] `POST /api/<modulo>` con validación de campos obligatorios
- [ ] `GET /api/<modulo>/[id]` con includes necesarios
- [ ] `PUT /api/<modulo>/[id]` para edición
- [ ] `DELETE /api/<modulo>/[id]` si aplica (o soft-delete con `activo = false`)
- [ ] Módulo añadido en `src/lib/permissions.ts` con permisos por rol
- [ ] Entrada añadida en `src/components/layout/Sidebar.tsx`
- [ ] Página de listado en `src/app/(dashboard)/<modulo>/page.tsx`
- [ ] Página de creación en `src/app/(dashboard)/<modulo>/nuevo/page.tsx`
- [ ] Página de detalle/edición en `src/app/(dashboard)/<modulo>/[id]/page.tsx`
- [ ] PDF (si aplica): componente + ruta + botón de descarga
- [ ] KPI en dashboard (si aplica)
- [ ] TypeScript compila sin errores: `npx tsc --noEmit`
