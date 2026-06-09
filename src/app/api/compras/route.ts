import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nextNumero } from "@/lib/autonumber";
import { toDecimal } from "@/lib/utils";

function calcLinea(cant: number, precio: number, iva: number) {
  const base = cant * precio;
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

    const compras = await prisma.compra.findMany({
      where: {
        ...(estado ? { estado: estado as never } : {}),
        ...(search ? {
          OR: [
            { numero: { contains: search, mode: "insensitive" } },
            { proveedor: { nombre: { contains: search, mode: "insensitive" } } },
          ],
        } : {}),
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        _count: { select: { lineas: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(compras.map((c) => ({
      ...c,
      subtotal: toDecimal(c.subtotal),
      totalIva: toDecimal(c.totalIva),
      total: toDecimal(c.total),
    })));
  } catch (error) {
    console.error("GET /api/compras error:", error);
    return NextResponse.json({ error: "Error al obtener compras" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { proveedorId, fechaEsperada, referenciaProveedor, notasInternas, lineas = [] } = body;

    if (!proveedorId) return NextResponse.json({ error: "proveedorId es obligatorio" }, { status: 400 });
    if (!lineas.length) return NextResponse.json({ error: "Debe incluir al menos una línea" }, { status: 400 });

    const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!proveedor) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

    let subtotal = 0;
    let totalIva = 0;
    const lineasCalc = (lineas as { productoId?: string; descripcion: string; cantidad: number; precioUnitario: number; iva: number; orden: number }[]).map((l) => {
      const { base, ivaAmt, subtotal: sub } = calcLinea(l.cantidad, l.precioUnitario, l.iva);
      subtotal += base;
      totalIva += ivaAmt;
      return { ...l, calcSubtotal: sub };
    });

    const numero = await nextNumero("COM");

    const compra = await prisma.compra.create({
      data: {
        numero,
        proveedorId,
        fechaEsperada: fechaEsperada ? new Date(fechaEsperada) : null,
        referenciaProveedor: referenciaProveedor ?? null,
        notasInternas: notasInternas ?? null,
        subtotal,
        totalIva,
        total: subtotal + totalIva,
        lineas: {
          create: lineasCalc.map((l) => ({
            productoId: l.productoId ?? null,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            iva: l.iva,
            subtotal: l.calcSubtotal,
            orden: l.orden,
          })),
        },
      },
      include: {
        lineas: true,
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(compra, { status: 201 });
  } catch (error) {
    console.error("POST /api/compras error:", error);
    return NextResponse.json({ error: "Error al crear compra" }, { status: 500 });
  }
}
