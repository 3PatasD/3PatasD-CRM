import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const compra = await prisma.compra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        lineas: {
          include: { producto: { select: { id: true, nombre: true, sku: true } } },
          orderBy: { orden: "asc" },
        },
      },
    });

    if (!compra) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
    return NextResponse.json({
      ...compra,
      subtotal: toDecimal(compra.subtotal),
      totalIva: toDecimal(compra.totalIva),
      total: toDecimal(compra.total),
    });
  } catch (error) {
    console.error("GET /api/compras/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener compra" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    const compra = await prisma.compra.findUnique({
      where: { id },
      include: { lineas: { include: { producto: true } } },
    });
    if (!compra) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });

    // Handle receiving goods (update cantidadRecibida and stock)
    if (body.recepcion && Array.isArray(body.recepcion)) {
      const updated = await prisma.$transaction(async (tx) => {
        for (const item of body.recepcion as { lineaId: string; cantidadRecibida: number }[]) {
          const linea = compra.lineas.find((l) => l.id === item.lineaId);
          if (!linea) continue;

          const nuevaRecibida = Math.min(
            toDecimal(linea.cantidadRecibida) + item.cantidadRecibida,
            toDecimal(linea.cantidad)
          );

          await tx.lineaCompra.update({
            where: { id: item.lineaId },
            data: { cantidadRecibida: nuevaRecibida },
          });

          // Update stock if product is linked
          if (linea.productoId && item.cantidadRecibida > 0) {
            await tx.producto.update({
              where: { id: linea.productoId },
              data: { stockActual: { increment: item.cantidadRecibida } },
            });
          }
        }

        // Re-fetch to determine new estado
        const updatedLineas = await tx.lineaCompra.findMany({ where: { compraId: id } });
        const allReceived = updatedLineas.every(
          (l) => toDecimal(l.cantidadRecibida) >= toDecimal(l.cantidad)
        );
        const anyReceived = updatedLineas.some((l) => toDecimal(l.cantidadRecibida) > 0);

        let estado = compra.estado;
        if (allReceived) estado = "RECIBIDA";
        else if (anyReceived) estado = "RECIBIDA_PARCIAL";

        return tx.compra.update({
          where: { id },
          data: {
            estado,
            fechaRecepcion: allReceived ? new Date() : compra.fechaRecepcion,
          },
          include: {
            proveedor: { select: { id: true, nombre: true } },
            lineas: { orderBy: { orden: "asc" } },
          },
        });
      });
      return NextResponse.json(updated);
    }

    // Simple status/field update
    const updateData: Record<string, unknown> = {};
    if (body.estado) updateData.estado = body.estado;
    if (body.notasInternas !== undefined) updateData.notasInternas = body.notasInternas;
    if (body.referenciaProveedor !== undefined) updateData.referenciaProveedor = body.referenciaProveedor;

    const result = await prisma.compra.update({ where: { id }, data: updateData });
    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT /api/compras/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar compra" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const compra = await prisma.compra.findUnique({ where: { id } });
    if (!compra) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
    if (!["PENDIENTE", "CANCELADA"].includes(compra.estado)) {
      return NextResponse.json({ error: "Solo se pueden eliminar compras en estado PENDIENTE o CANCELADA" }, { status: 400 });
    }
    await prisma.compra.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/compras/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar compra" }, { status: 500 });
  }
}
