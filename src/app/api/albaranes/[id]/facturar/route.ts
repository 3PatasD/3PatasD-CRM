import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nextNumero } from "@/lib/autonumber";
import { toDecimal } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    // The [id] param is unused here since we accept albaranIds in the body,
    // but we keep the route under albaranes/[id]/facturar for REST consistency.
    await params; // consume params promise

    const body = await req.json();
    const {
      albaranIds,
      metodoPago,
      fechaVencimiento,
      notasCliente,
      notasInternas,
    } = body as {
      albaranIds: string[];
      metodoPago?: string;
      fechaVencimiento?: string;
      notasCliente?: string;
      notasInternas?: string;
    };

    if (!albaranIds || !Array.isArray(albaranIds) || albaranIds.length === 0) {
      return NextResponse.json({ error: "albaranIds es obligatorio y debe ser un array no vacío" }, { status: 400 });
    }

    // Load all albaranes with their lines and pedido (for clienteId)
    const albaranes = await prisma.albaran.findMany({
      where: { id: { in: albaranIds } },
      include: {
        lineas: { orderBy: { orden: "asc" } },
        pedido: { select: { id: true, clienteId: true } },
        factura: { select: { id: true } },
      },
    });

    if (albaranes.length !== albaranIds.length) {
      return NextResponse.json({ error: "Uno o más albaranes no fueron encontrados" }, { status: 404 });
    }

    // Verify none are already invoiced
    const yaFacturado = albaranes.find((a) => a.facturaId !== null);
    if (yaFacturado) {
      return NextResponse.json({
        error: `El albarán ${yaFacturado.numero} ya está asociado a una factura`,
      }, { status: 400 });
    }

    // Verify all share the same clienteId
    const clienteIds = [...new Set(albaranes.map((a) => a.pedido.clienteId))];
    if (clienteIds.length !== 1) {
      return NextResponse.json({
        error: "Todos los albaranes deben pertenecer al mismo cliente",
      }, { status: 400 });
    }
    const clienteId = clienteIds[0];

    // Calculate totals from all albaran lines combined
    let subtotalBase = 0;
    let totalIva = 0;

    for (const albaran of albaranes) {
      for (const linea of albaran.lineas) {
        const cantidad = toDecimal(linea.cantidad);
        const precio = toDecimal(linea.precioUnitario);
        const iva = toDecimal(linea.iva);
        const base = cantidad * precio;
        const ivaAmt = base * (iva / 100);
        subtotalBase += base;
        totalIva += ivaAmt;
      }
    }

    const total = subtotalBase + totalIva;

    const numero = await nextNumero("FAC");

    const factura = await prisma.$transaction(async (tx) => {
      const fac = await tx.factura.create({
        data: {
          numero,
          clienteId,
          estado: "EMITIDA",
          fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
          metodoPago: metodoPago ?? null,
          notasCliente: notasCliente ?? null,
          notasInternas: notasInternas ?? null,
          subtotal: subtotalBase,
          totalIva,
          total,
        },
        include: {
          cliente: { select: { id: true, nombre: true } },
          albaranes: {
            include: {
              lineas: { orderBy: { orden: "asc" } },
              pedido: { select: { id: true, numero: true } },
            },
          },
        },
      });

      // Link all albaranes to this factura
      await tx.albaran.updateMany({
        where: { id: { in: albaranIds } },
        data: { facturaId: fac.id },
      });

      return fac;
    });

    return NextResponse.json(factura, { status: 201 });
  } catch (error) {
    console.error("POST /api/albaranes/[id]/facturar error:", error);
    return NextResponse.json({ error: "Error al crear factura" }, { status: 500 });
  }
}
