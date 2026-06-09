import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nextNumero } from "@/lib/autonumber";
import { toDecimal } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        lineas: { orderBy: { orden: "asc" } },
        pedido: true,
      },
    });

    if (!presupuesto) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

    if (presupuesto.estado !== "ACEPTADO") {
      return NextResponse.json({ error: "Solo se pueden convertir presupuestos en estado ACEPTADO" }, { status: 400 });
    }

    if (presupuesto.pedido !== null) {
      return NextResponse.json({ error: "Este presupuesto ya ha sido convertido en pedido" }, { status: 400 });
    }

    const numero = await nextNumero("PED");

    const pedido = await prisma.$transaction(async (tx) => {
      return tx.pedido.create({
        data: {
          numero,
          clienteId: presupuesto.clienteId,
          usuarioId: presupuesto.usuarioId,
          presupuestoId: presupuesto.id,
          estado: "PENDIENTE",
          descuentoGlobal: toDecimal(presupuesto.descuentoGlobal),
          codigoPromoId: presupuesto.codigoPromoId ?? null,
          descuentoPromo: toDecimal(presupuesto.descuentoPromo),
          subtotal: toDecimal(presupuesto.subtotal),
          totalIva: toDecimal(presupuesto.totalIva),
          total: toDecimal(presupuesto.total),
          notasInternas: presupuesto.notasInternas ?? null,
          notasCliente: presupuesto.notasCliente ?? null,
          lineas: {
            create: presupuesto.lineas.map((l) => ({
              productoId: l.productoId ?? null,
              descripcion: l.descripcion,
              cantidad: toDecimal(l.cantidad),
              cantidadServida: 0,
              precioUnitario: toDecimal(l.precioUnitario),
              descuento: toDecimal(l.descuento),
              iva: toDecimal(l.iva),
              subtotal: toDecimal(l.subtotal),
              orden: l.orden,
            })),
          },
        },
        include: {
          lineas: { orderBy: { orden: "asc" } },
          cliente: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          presupuesto: { select: { id: true, numero: true } },
        },
      });
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error("POST /api/presupuestos/[id]/convertir error:", error);
    return NextResponse.json({ error: "Error al convertir presupuesto en pedido" }, { status: 500 });
  }
}
