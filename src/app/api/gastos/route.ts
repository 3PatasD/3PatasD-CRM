import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const tipo = searchParams.get("tipo") ?? "";
    const estado = searchParams.get("estado") ?? "";
    const categoria = searchParams.get("categoria") ?? "";

    const gastos = await prisma.gasto.findMany({
      where: {
        ...(tipo ? { tipo: tipo as never } : {}),
        ...(estado ? { estado: estado as never } : {}),
        ...(categoria ? { categoria: categoria as never } : {}),
        ...(search ? {
          OR: [
            { concepto: { contains: search, mode: "insensitive" } },
            { proveedorNombre: { contains: search, mode: "insensitive" } },
            { numeroFactura: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json(gastos.map((g) => ({
      ...g,
      importe: toDecimal(g.importe),
      iva: toDecimal(g.iva),
      importeTotal: toDecimal(g.importeTotal),
    })));
  } catch (error) {
    console.error("GET /api/gastos error:", error);
    return NextResponse.json({ error: "Error al obtener gastos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      tipo, concepto, categoria, proveedorId, proveedorNombre,
      importe, iva = 21, fecha, fechaVencimiento, estado = "PENDIENTE",
      metodoPago, numeroFactura, notas,
      esRecurrente = false, periodicidad, proximaRenovacion,
    } = body;

    if (!tipo) return NextResponse.json({ error: "El tipo es obligatorio" }, { status: 400 });
    if (!concepto?.trim()) return NextResponse.json({ error: "El concepto es obligatorio" }, { status: 400 });
    if (importe === undefined || importe === null) return NextResponse.json({ error: "El importe es obligatorio" }, { status: 400 });

    const importeNum = parseFloat(importe);
    const ivaNum = parseFloat(iva);
    const importeTotal = importeNum * (1 + ivaNum / 100);

    // Resolve proveedor by name if not linked
    let resolvedProveedorId = proveedorId ?? null;
    if (!resolvedProveedorId && proveedorNombre?.trim()) {
      const found = await prisma.proveedor.findFirst({
        where: { nombre: { equals: proveedorNombre.trim(), mode: "insensitive" } },
      });
      if (found) resolvedProveedorId = found.id;
    }

    const gasto = await prisma.gasto.create({
      data: {
        tipo,
        concepto: concepto.trim(),
        categoria: categoria || null,
        proveedorId: resolvedProveedorId,
        proveedorNombre: proveedorNombre?.trim() || null,
        importe: importeNum,
        iva: ivaNum,
        importeTotal,
        fecha: fecha ? new Date(fecha) : new Date(),
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        estado,
        metodoPago: metodoPago || null,
        numeroFactura: numeroFactura?.trim() || null,
        notas: notas?.trim() || null,
        esRecurrente,
        periodicidad: periodicidad || null,
        proximaRenovacion: proximaRenovacion ? new Date(proximaRenovacion) : null,
        usuarioId: session.user.id,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(gasto, { status: 201 });
  } catch (error) {
    console.error("POST /api/gastos error:", error);
    return NextResponse.json({ error: "Error al crear gasto" }, { status: 500 });
  }
}
