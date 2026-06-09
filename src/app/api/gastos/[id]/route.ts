import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const gasto = await prisma.gasto.findUnique({
      where: { id },
      include: {
        proveedor: { select: { id: true, nombre: true, cifNif: true, email: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });
    if (!gasto) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    return NextResponse.json({
      ...gasto,
      importe: toDecimal(gasto.importe),
      iva: toDecimal(gasto.iva),
      importeTotal: toDecimal(gasto.importeTotal),
    });
  } catch (error) {
    console.error("GET /api/gastos/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener gasto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.gasto.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.concepto !== undefined) updateData.concepto = body.concepto.trim();
    if (body.categoria !== undefined) updateData.categoria = body.categoria || null;
    if (body.proveedorId !== undefined) updateData.proveedorId = body.proveedorId || null;
    if (body.proveedorNombre !== undefined) updateData.proveedorNombre = body.proveedorNombre?.trim() || null;
    if (body.fecha !== undefined) updateData.fecha = new Date(body.fecha);
    if (body.fechaVencimiento !== undefined) updateData.fechaVencimiento = body.fechaVencimiento ? new Date(body.fechaVencimiento) : null;
    if (body.estado !== undefined) updateData.estado = body.estado;
    if (body.metodoPago !== undefined) updateData.metodoPago = body.metodoPago || null;
    if (body.numeroFactura !== undefined) updateData.numeroFactura = body.numeroFactura?.trim() || null;
    if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null;
    if (body.periodicidad !== undefined) updateData.periodicidad = body.periodicidad || null;
    if (body.proximaRenovacion !== undefined) updateData.proximaRenovacion = body.proximaRenovacion ? new Date(body.proximaRenovacion) : null;

    // Recalculate totals if amounts changed
    if (body.importe !== undefined || body.iva !== undefined) {
      const importeNum = parseFloat(body.importe ?? toDecimal(existing.importe));
      const ivaNum = parseFloat(body.iva ?? toDecimal(existing.iva));
      updateData.importe = importeNum;
      updateData.iva = ivaNum;
      updateData.importeTotal = importeNum * (1 + ivaNum / 100);
    }

    const gasto = await prisma.gasto.update({
      where: { id },
      data: updateData,
      include: {
        proveedor: { select: { id: true, nombre: true, cifNif: true, email: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });
    return NextResponse.json(gasto);
  } catch (error) {
    console.error("PUT /api/gastos/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar gasto" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const gasto = await prisma.gasto.findUnique({ where: { id } });
    if (!gasto) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    await prisma.gasto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/gastos/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar gasto" }, { status: 500 });
  }
}
