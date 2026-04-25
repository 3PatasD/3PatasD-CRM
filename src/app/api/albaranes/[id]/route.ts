import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const albaran = await prisma.albaran.findUnique({
      where: { id },
      include: {
        lineas: {
          include: { producto: { select: { id: true, sku: true, nombre: true } } },
          orderBy: { orden: "asc" },
        },
        pedido: {
          include: {
            cliente: true,
          },
        },
        factura: { select: { id: true, numero: true, estado: true } },
      },
    });

    if (!albaran) {
      return NextResponse.json({ error: "Albarán no encontrado" }, { status: 404 });
    }

    const result = {
      ...albaran,
      lineas: albaran.lineas.map((l) => ({
        ...l,
        cantidad: toDecimal(l.cantidad),
        precioUnitario: toDecimal(l.precioUnitario),
        iva: toDecimal(l.iva),
        subtotal: toDecimal(l.subtotal),
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/albaranes/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener albarán" }, { status: 500 });
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

    const existing = await prisma.albaran.findUnique({
      where: { id },
      include: {
        lineas: {
          include: { producto: true },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Albarán no encontrado" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.estado !== undefined) updateData.estado = body.estado;

    // Handle stock updates when estado changes
    const estadoNuevo = body.estado as string | undefined;

    if (estadoNuevo && estadoNuevo !== existing.estado) {
      if (estadoNuevo === "ENTREGADO" && existing.estado !== "ENTREGADO") {
        // Decrement stock for each line with a product
        const updated = await prisma.$transaction(async (tx) => {
          for (const linea of existing.lineas) {
            if (linea.productoId) {
              await tx.producto.update({
                where: { id: linea.productoId },
                data: { stockActual: { decrement: toDecimal(linea.cantidad) } },
              });
            }
          }
          return tx.albaran.update({
            where: { id },
            data: updateData,
            include: {
              lineas: { orderBy: { orden: "asc" } },
              pedido: { select: { id: true, numero: true, clienteId: true } },
              factura: { select: { id: true, numero: true } },
            },
          });
        });
        return NextResponse.json(updated);
      }

      if (estadoNuevo === "DEVUELTO" && existing.estado !== "DEVUELTO") {
        // Increment stock for each line with a product
        const updated = await prisma.$transaction(async (tx) => {
          for (const linea of existing.lineas) {
            if (linea.productoId) {
              await tx.producto.update({
                where: { id: linea.productoId },
                data: { stockActual: { increment: toDecimal(linea.cantidad) } },
              });
            }
          }
          return tx.albaran.update({
            where: { id },
            data: updateData,
            include: {
              lineas: { orderBy: { orden: "asc" } },
              pedido: { select: { id: true, numero: true, clienteId: true } },
              factura: { select: { id: true, numero: true } },
            },
          });
        });
        return NextResponse.json(updated);
      }
    }

    const updated = await prisma.albaran.update({
      where: { id },
      data: updateData,
      include: {
        lineas: { orderBy: { orden: "asc" } },
        pedido: { select: { id: true, numero: true, clienteId: true } },
        factura: { select: { id: true, numero: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/albaranes/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar albarán" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const albaran = await prisma.albaran.findUnique({
      where: { id },
      include: { lineas: true },
    });
    if (!albaran) return NextResponse.json({ error: "Albarán no encontrado" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Restore stock if the albaran was already delivered
      if (albaran.estado === "ENTREGADO") {
        for (const linea of albaran.lineas) {
          if (linea.productoId) {
            await tx.producto.update({
              where: { id: linea.productoId },
              data: { stockActual: { increment: Number(linea.cantidad) } },
            });
          }
        }
      }
      await tx.albaran.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/albaranes/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar albarán" }, { status: 500 });
  }
}
