import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const categoriaId = searchParams.get("categoriaId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const productos = await prisma.producto.findMany({
      where: {
        ...(!includeInactive ? { activo: true } : {}),
        ...(categoriaId ? { categoriaId } : {}),
        ...(search
          ? {
              OR: [
                { sku: { contains: search, mode: "insensitive" } },
                { nombre: { contains: search, mode: "insensitive" } },
                { descripcion: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        categoria: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(productos);
  } catch (error) {
    console.error("GET /api/productos error:", error);
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.sku || typeof body.sku !== "string" || !body.sku.trim()) {
      return NextResponse.json({ error: "El campo SKU es obligatorio" }, { status: 400 });
    }
    if (!body.nombre || typeof body.nombre !== "string" || !body.nombre.trim()) {
      return NextResponse.json({ error: "El campo nombre es obligatorio" }, { status: 400 });
    }
    if (body.precioCosto === undefined || body.precioCosto === null) {
      return NextResponse.json({ error: "El precio de costo es obligatorio" }, { status: 400 });
    }
    if (body.precioVenta === undefined || body.precioVenta === null) {
      return NextResponse.json({ error: "El precio de venta es obligatorio" }, { status: 400 });
    }

    // Check SKU uniqueness
    const existing = await prisma.producto.findUnique({ where: { sku: body.sku.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un producto con ese SKU" }, { status: 400 });
    }

    const producto = await prisma.producto.create({
      data: {
        sku: body.sku.trim(),
        nombre: body.nombre.trim(),
        descripcion: body.descripcion ?? null,
        categoriaId: body.categoriaId ?? null,
        precioCosto: body.precioCosto,
        precioVenta: body.precioVenta,
        iva: body.iva ?? 21,
        stockActual: body.stockActual ?? 0,
        stockMinimo: body.stockMinimo ?? 0,
        unidad: body.unidad ?? "ud",
        activo: true,
      },
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error("POST /api/productos error:", error);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
