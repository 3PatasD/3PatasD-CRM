import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        proveedores: {
          include: {
            proveedor: {
              select: {
                id: true,
                nombre: true,
                contacto: true,
              },
            },
          },
        },
      },
    });

    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error("GET /api/productos/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.producto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // Check SKU uniqueness if changing
    if (body.sku && body.sku !== existing.sku) {
      const skuConflict = await prisma.producto.findUnique({ where: { sku: body.sku.trim() } });
      if (skuConflict) {
        return NextResponse.json({ error: "Ya existe un producto con ese SKU" }, { status: 400 });
      }
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        sku: body.sku !== undefined ? body.sku.trim() : existing.sku,
        nombre: body.nombre !== undefined ? body.nombre : existing.nombre,
        descripcion: body.descripcion !== undefined ? body.descripcion : existing.descripcion,
        categoriaId: body.categoriaId !== undefined ? body.categoriaId : existing.categoriaId,
        precioCosto: body.precioCosto !== undefined ? body.precioCosto : existing.precioCosto,
        precioVenta: body.precioVenta !== undefined ? body.precioVenta : existing.precioVenta,
        iva: body.iva !== undefined ? body.iva : existing.iva,
        stockActual: body.stockActual !== undefined ? body.stockActual : existing.stockActual,
        stockMinimo: body.stockMinimo !== undefined ? body.stockMinimo : existing.stockMinimo,
        unidad: body.unidad !== undefined ? body.unidad : existing.unidad,
        activo: body.activo !== undefined ? body.activo : existing.activo,
      },
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error("PUT /api/productos/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await prisma.producto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error("DELETE /api/productos/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
