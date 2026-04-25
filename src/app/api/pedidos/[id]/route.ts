import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        lineas: { orderBy: { orden: "asc" } },
        cliente: true,
        usuario: { select: { id: true, nombre: true, email: true } },
        codigoPromo: true,
        albaranes: {
          include: {
            lineas: { orderBy: { orden: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
        presupuesto: { select: { id: true, numero: true, estado: true } },
      },
    });

    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    const result = {
      ...pedido,
      subtotal: toDecimal(pedido.subtotal),
      descuentoPromo: toDecimal(pedido.descuentoPromo),
      descuentoGlobal: toDecimal(pedido.descuentoGlobal),
      totalIva: toDecimal(pedido.totalIva),
      total: toDecimal(pedido.total),
      lineas: pedido.lineas.map((l) => ({
        ...l,
        cantidad: toDecimal(l.cantidad),
        cantidadServida: toDecimal(l.cantidadServida),
        precioUnitario: toDecimal(l.precioUnitario),
        descuento: toDecimal(l.descuento),
        iva: toDecimal(l.iva),
        subtotal: toDecimal(l.subtotal),
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/pedidos/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener pedido" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.pedido.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    const updateData: Record<string, unknown> = {};

    if (body.estado !== undefined) updateData.estado = body.estado;
    if (body.fechaEntrega !== undefined) updateData.fechaEntrega = body.fechaEntrega ? new Date(body.fechaEntrega) : null;
    if (body.direccionEntrega !== undefined) updateData.direccionEntrega = body.direccionEntrega;
    if (body.notasInternas !== undefined) updateData.notasInternas = body.notasInternas;
    if (body.notasCliente !== undefined) updateData.notasCliente = body.notasCliente;

    const updated = await prisma.pedido.update({
      where: { id },
      data: updateData,
      include: {
        lineas: { orderBy: { orden: "asc" } },
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        albaranes: { select: { id: true, numero: true, estado: true } },
        presupuesto: { select: { id: true, numero: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/pedidos/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const pedido = await prisma.pedido.findUnique({ where: { id } });
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (!["PENDIENTE", "CANCELADO"].includes(pedido.estado)) {
      return NextResponse.json({ error: "Solo se pueden eliminar pedidos en estado PENDIENTE o CANCELADO" }, { status: 400 });
    }
    await prisma.pedido.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/pedidos/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar pedido" }, { status: 500 });
  }
}
