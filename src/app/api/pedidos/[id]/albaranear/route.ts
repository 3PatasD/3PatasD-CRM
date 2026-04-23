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
    const body = await req.json();
    const { lineas = [], fechaEntrega, direccionEntrega, notasCliente, notasInternas } = body;

    if (!lineas.length) return NextResponse.json({ error: "Debe incluir al menos una línea" }, { status: 400 });

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { lineas: true },
    });
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    if (pedido.estado === "CANCELADO" || pedido.estado === "ENTREGADO") {
      return NextResponse.json({ error: "No se puede albaranar un pedido en estado " + pedido.estado }, { status: 400 });
    }

    // Validate requested quantities
    for (const item of lineas as { lineaPedidoId: string; cantidad: number }[]) {
      const lineaPedido = pedido.lineas.find((l) => l.id === item.lineaPedidoId);
      if (!lineaPedido) {
        return NextResponse.json({ error: `Línea ${item.lineaPedidoId} no encontrada en el pedido` }, { status: 400 });
      }
      const disponible = toDecimal(lineaPedido.cantidad) - toDecimal(lineaPedido.cantidadServida);
      if (item.cantidad <= 0) {
        return NextResponse.json({ error: `La cantidad para la línea ${item.lineaPedidoId} debe ser mayor que 0` }, { status: 400 });
      }
      if (item.cantidad > disponible) {
        return NextResponse.json({
          error: `Cantidad solicitada (${item.cantidad}) supera la disponible (${disponible}) para la línea ${item.lineaPedidoId}`,
        }, { status: 400 });
      }
    }

    const numero = await nextNumero("ALB");

    const albaran = await prisma.$transaction(async (tx) => {
      // Build albaran lines from pedido lines
      const lineasAlbaran: { productoId: string | null; descripcion: string; cantidad: number; precioUnitario: number; iva: number; subtotal: number; orden: number }[] = [];
      let orden = 1;

      for (const item of lineas as { lineaPedidoId: string; cantidad: number }[]) {
        const lineaPedido = pedido.lineas.find((l) => l.id === item.lineaPedidoId)!;
        const precio = toDecimal(lineaPedido.precioUnitario);
        const iva = toDecimal(lineaPedido.iva);
        const base = item.cantidad * precio;
        const ivaAmt = base * (iva / 100);
        const subtotal = base + ivaAmt;

        lineasAlbaran.push({
          productoId: lineaPedido.productoId ?? null,
          descripcion: lineaPedido.descripcion,
          cantidad: item.cantidad,
          precioUnitario: precio,
          iva,
          subtotal,
          orden: orden++,
        });

        // Update cantidadServida
        await tx.lineaPedido.update({
          where: { id: item.lineaPedidoId },
          data: { cantidadServida: { increment: item.cantidad } },
        });
      }

      const alb = await tx.albaran.create({
        data: {
          numero,
          pedidoId: id,
          fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
          direccionEntrega: direccionEntrega ?? null,
          notasCliente: notasCliente ?? null,
          notasInternas: notasInternas ?? null,
          lineas: {
            create: lineasAlbaran.map((l, idx) => ({
              productoId: l.productoId,
              descripcion: l.descripcion,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
              iva: l.iva,
              subtotal: l.subtotal,
              orden: idx + 1,
            })),
          },
        },
        include: {
          lineas: { orderBy: { orden: "asc" } },
          pedido: { select: { id: true, numero: true, clienteId: true } },
        },
      });

      // Check if pedido is fully served
      const updatedLineas = await tx.lineaPedido.findMany({ where: { pedidoId: id } });
      const fullyServed = updatedLineas.every(
        (l) => toDecimal(l.cantidadServida) >= toDecimal(l.cantidad)
      );

      await tx.pedido.update({
        where: { id },
        data: { estado: fullyServed ? "PREPARADO" : "EN_PROCESO" },
      });

      return alb;
    });

    return NextResponse.json(albaran, { status: 201 });
  } catch (error) {
    console.error("POST /api/pedidos/[id]/albaranear error:", error);
    return NextResponse.json({ error: "Error al crear albarán" }, { status: 500 });
  }
}
