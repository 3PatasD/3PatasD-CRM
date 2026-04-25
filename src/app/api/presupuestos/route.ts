import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nextNumero } from "@/lib/autonumber";
import { toDecimal } from "@/lib/utils";

function calcLinea(cant: number, precio: number, dto: number, iva: number) {
  const base = cant * precio * (1 - dto / 100);
  const ivaAmt = base * (iva / 100);
  return { base, ivaAmt, subtotal: base + ivaAmt };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const estado = searchParams.get("estado") ?? "";

    const presupuestos = await prisma.presupuesto.findMany({
      where: {
        ...(estado ? { estado: estado as never } : {}),
        ...(search
          ? {
              OR: [
                { numero: { contains: search, mode: "insensitive" } },
                { cliente: { nombre: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = presupuestos.map((p) => ({
      ...p,
      subtotal: toDecimal(p.subtotal),
      descuentoPromo: toDecimal(p.descuentoPromo),
      descuentoGlobal: toDecimal(p.descuentoGlobal),
      totalIva: toDecimal(p.totalIva),
      total: toDecimal(p.total),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/presupuestos error:", error);
    return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    type LineaInput = { productoId?: string; descripcion: string; cantidad: number; precioUnitario: number; descuento: number; iva: number; orden: number };
    const { clienteNombre, fechaValidez, notasInternas, notasCliente, descuentoGlobal = 0, codigoPromoId } = body;
    const lineas: LineaInput[] = body.lineas ?? [];

    if (!clienteNombre?.trim()) return NextResponse.json({ error: "El nombre del cliente es obligatorio" }, { status: 400 });
    if (!lineas.length) return NextResponse.json({ error: "Debe incluir al menos una línea" }, { status: 400 });

    // Find existing client by name (case-insensitive) or create a new one
    let cliente = await prisma.cliente.findFirst({ where: { nombre: { equals: clienteNombre.trim(), mode: "insensitive" } } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { nombre: clienteNombre.trim(), activo: true } });
    }
    const clienteId = cliente.id;

    // Validate and load promo code
    let promo = null;
    if (codigoPromoId) {
      promo = await prisma.codigoPromocion.findUnique({ where: { id: codigoPromoId } });
      if (!promo || !promo.activo) return NextResponse.json({ error: "Código promocional no válido" }, { status: 400 });
      if (promo.limiteUsos !== null && promo.usosActuales >= promo.limiteUsos) {
        return NextResponse.json({ error: "El código promocional ha alcanzado su límite de usos" }, { status: 400 });
      }
      const now = new Date();
      if (promo.fechaInicio && now < promo.fechaInicio) return NextResponse.json({ error: "El código promocional aún no es válido" }, { status: 400 });
      if (promo.fechaFin && now > promo.fechaFin) return NextResponse.json({ error: "El código promocional ha caducado" }, { status: 400 });
    }

    // Calculate totals
    let subtotalBase = 0;
    let totalIva = 0;
    const lineasCalc = lineas.map((l) => {
      const { base, ivaAmt, subtotal } = calcLinea(l.cantidad, l.precioUnitario, l.descuento ?? 0, l.iva);
      subtotalBase += base;
      totalIva += ivaAmt;
      return { ...l, calcBase: base, calcSubtotal: subtotal };
    });

    // Apply global discount on subtotal base
    const subtotalAfterGlobal = subtotalBase * (1 - (descuentoGlobal ?? 0) / 100);

    // Apply promo discount
    let descuentoPromo = 0;
    if (promo) {
      if (promo.tipo === "PORCENTAJE") {
        descuentoPromo = subtotalAfterGlobal * (toDecimal(promo.valor) / 100);
      } else {
        descuentoPromo = toDecimal(promo.valor);
      }
    }

    const total = subtotalAfterGlobal - descuentoPromo + totalIva;

    const numero = await nextNumero("PRS");

    const presupuesto = await prisma.$transaction(async (tx) => {
      const prs = await tx.presupuesto.create({
        data: {
          numero,
          clienteId,
          usuarioId: session.user.id,
          fechaValidez: fechaValidez ? new Date(fechaValidez) : null,
          notasInternas: notasInternas ?? null,
          notasCliente: notasCliente ?? null,
          descuentoGlobal: descuentoGlobal ?? 0,
          codigoPromoId: codigoPromoId ?? null,
          descuentoPromo,
          subtotal: subtotalBase,
          totalIva,
          total,
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
          lineas: true,
          cliente: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
        },
      });

      if (promo) {
        await tx.codigoPromocion.update({
          where: { id: promo.id },
          data: { usosActuales: { increment: 1 } },
        });
      }

      return prs;
    });

    return NextResponse.json(presupuesto, { status: 201 });
  } catch (error) {
    console.error("POST /api/presupuestos error:", error);
    return NextResponse.json({ error: "Error al crear presupuesto" }, { status: 500 });
  }
}
