import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

function calcLinea(cant: number, precio: number, dto: number, iva: number) {
  const base = cant * precio * (1 - dto / 100);
  const ivaAmt = base * (iva / 100);
  return { base, ivaAmt, subtotal: base + ivaAmt };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        lineas: { orderBy: { orden: "asc" } },
        cliente: true,
        usuario: { select: { id: true, nombre: true, email: true } },
        codigoPromo: true,
        pedido: { select: { id: true, numero: true, estado: true } },
      },
    });

    if (!presupuesto) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

    const result = {
      ...presupuesto,
      subtotal: toDecimal(presupuesto.subtotal),
      descuentoPromo: toDecimal(presupuesto.descuentoPromo),
      descuentoGlobal: toDecimal(presupuesto.descuentoGlobal),
      totalIva: toDecimal(presupuesto.totalIva),
      total: toDecimal(presupuesto.total),
      lineas: presupuesto.lineas.map((l) => ({
        ...l,
        cantidad: toDecimal(l.cantidad),
        precioUnitario: toDecimal(l.precioUnitario),
        descuento: toDecimal(l.descuento),
        iva: toDecimal(l.iva),
        subtotal: toDecimal(l.subtotal),
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/presupuestos/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener presupuesto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.presupuesto.findUnique({
      where: { id },
      include: { lineas: true, codigoPromo: true },
    });
    if (!existing) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

    const updateData: Record<string, unknown> = {};

    if (body.estado !== undefined) updateData.estado = body.estado;
    if (body.fechaValidez !== undefined) updateData.fechaValidez = body.fechaValidez ? new Date(body.fechaValidez) : null;
    if (body.notasInternas !== undefined) updateData.notasInternas = body.notasInternas;
    if (body.notasCliente !== undefined) updateData.notasCliente = body.notasCliente;

    // Recalculate only if lineas are provided
    if (body.lineas && Array.isArray(body.lineas)) {
      const descuentoGlobal = body.descuentoGlobal ?? toDecimal(existing.descuentoGlobal);
      const codigoPromoId = body.codigoPromoId !== undefined ? body.codigoPromoId : existing.codigoPromoId;

      let subtotalBase = 0;
      let totalIva = 0;
      type LineaInput = { productoId?: string; descripcion: string; cantidad: number; precioUnitario: number; descuento: number; iva: number; orden: number };
      const lineasCalc = (body.lineas as LineaInput[]).map((l) => {
        const { base, ivaAmt, subtotal } = calcLinea(l.cantidad, l.precioUnitario, l.descuento ?? 0, l.iva);
        subtotalBase += base;
        totalIva += ivaAmt;
        return { ...l, calcSubtotal: subtotal };
      });

      const subtotalAfterGlobal = subtotalBase * (1 - (descuentoGlobal ?? 0) / 100);
      let descuentoPromo = 0;
      if (codigoPromoId && existing.codigoPromo) {
        const promo = existing.codigoPromo;
        if (promo.tipo === "PORCENTAJE") {
          descuentoPromo = subtotalAfterGlobal * (toDecimal(promo.valor) / 100);
        } else {
          descuentoPromo = toDecimal(promo.valor);
        }
      }
      const total = subtotalAfterGlobal - descuentoPromo + totalIva;

      updateData.descuentoGlobal = descuentoGlobal;
      updateData.descuentoPromo = descuentoPromo;
      updateData.subtotal = subtotalBase;
      updateData.totalIva = totalIva;
      updateData.total = total;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.lineaPresupuesto.deleteMany({ where: { presupuestoId: id } });
        return tx.presupuesto.update({
          where: { id },
          data: {
            ...updateData,
            lineas: {
              create: lineasCalc.map((l) => ({
                productoId: l.productoId ?? null,
                descripcion: l.descripcion,
                cantidad: l.cantidad,
                precioUnitario: l.precioUnitario,
                descuento: l.descuento ?? 0,
                iva: l.iva,
                subtotal: l.calcSubtotal,
                orden: l.orden,
              })),
            },
          },
          include: {
            lineas: { orderBy: { orden: "asc" } },
            cliente: true,
            usuario: { select: { id: true, nombre: true } },
            codigoPromo: true,
          },
        });
      });

      return NextResponse.json(updated);
    }

    const updated = await prisma.presupuesto.update({
      where: { id },
      data: updateData,
      include: {
        lineas: { orderBy: { orden: "asc" } },
        cliente: true,
        usuario: { select: { id: true, nombre: true } },
        codigoPromo: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/presupuestos/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar presupuesto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const presupuesto = await prisma.presupuesto.findUnique({ where: { id } });
    if (!presupuesto) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

    if (presupuesto.estado !== "BORRADOR" && presupuesto.estado !== "RECHAZADO") {
      return NextResponse.json({ error: "Solo se pueden eliminar presupuestos en estado BORRADOR o RECHAZADO" }, { status: 400 });
    }

    await prisma.presupuesto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/presupuestos/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar presupuesto" }, { status: 500 });
  }
}
