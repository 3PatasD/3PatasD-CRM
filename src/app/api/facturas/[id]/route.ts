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

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        cliente: true,
        albaranes: {
          include: {
            lineas: { orderBy: { orden: "asc" } },
            pedido: { select: { id: true, numero: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    const result = {
      ...factura,
      subtotal: toDecimal(factura.subtotal),
      totalIva: toDecimal(factura.totalIva),
      total: toDecimal(factura.total),
      albaranes: factura.albaranes.map((a) => ({
        ...a,
        lineas: a.lineas.map((l) => ({
          ...l,
          cantidad: toDecimal(l.cantidad),
          precioUnitario: toDecimal(l.precioUnitario),
          iva: toDecimal(l.iva),
          subtotal: toDecimal(l.subtotal),
        })),
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/facturas/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener factura" }, { status: 500 });
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

    const existing = await prisma.factura.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    const allowedEstados = ["EMITIDA", "PAGADA", "VENCIDA", "ANULADA"];
    if (body.estado !== undefined && !allowedEstados.includes(body.estado)) {
      return NextResponse.json({
        error: `Estado no válido. Debe ser uno de: ${allowedEstados.join(", ")}`,
      }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.estado !== undefined) updateData.estado = body.estado;
    if (body.metodoPago !== undefined) updateData.metodoPago = body.metodoPago;
    if (body.fechaVencimiento !== undefined) {
      updateData.fechaVencimiento = body.fechaVencimiento ? new Date(body.fechaVencimiento) : null;
    }
    if (body.notasInternas !== undefined) updateData.notasInternas = body.notasInternas;
    if (body.notasCliente !== undefined) updateData.notasCliente = body.notasCliente;

    const updated = await prisma.factura.update({
      where: { id },
      data: updateData,
      include: {
        cliente: { select: { id: true, nombre: true } },
        albaranes: {
          select: {
            id: true,
            numero: true,
            estado: true,
            fechaEmision: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/facturas/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar factura" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const factura = await prisma.factura.findUnique({ where: { id } });
    if (!factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    if (factura.estado === "PAGADA") {
      return NextResponse.json({ error: "No se pueden eliminar facturas pagadas" }, { status: 400 });
    }
    // Unlink albaranes before deleting
    await prisma.$transaction(async (tx) => {
      await tx.albaran.updateMany({ where: { facturaId: id }, data: { facturaId: null } });
      await tx.factura.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/facturas/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar factura" }, { status: 500 });
  }
}
