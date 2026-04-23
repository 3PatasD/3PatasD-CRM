import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const promo = await prisma.codigoPromocion.findUnique({
      where: { id },
    });

    if (!promo) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    return NextResponse.json(promo);
  } catch (error) {
    console.error("GET /api/promociones/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener promoción" }, { status: 500 });
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

    const existing = await prisma.codigoPromocion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    if (body.tipo && !["PORCENTAJE", "FIJO"].includes(body.tipo)) {
      return NextResponse.json(
        { error: "El tipo debe ser PORCENTAJE o FIJO" },
        { status: 400 }
      );
    }

    if (body.valor !== undefined) {
      const valor = parseFloat(String(body.valor));
      if (isNaN(valor) || valor < 0) {
        return NextResponse.json({ error: "El valor no puede ser negativo" }, { status: 400 });
      }
      const tipoFinal = body.tipo ?? existing.tipo;
      if (tipoFinal === "PORCENTAJE" && valor > 100) {
        return NextResponse.json({ error: "El porcentaje no puede superar 100" }, { status: 400 });
      }
    }

    // If changing codigo, check uniqueness
    if (body.codigo && body.codigo.trim().toUpperCase() !== existing.codigo) {
      const conflict = await prisma.codigoPromocion.findUnique({
        where: { codigo: body.codigo.trim().toUpperCase() },
      });
      if (conflict) {
        return NextResponse.json({ error: "Ya existe una promoción con ese código" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.codigo !== undefined) updateData.codigo = body.codigo.trim().toUpperCase();
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.valor !== undefined) updateData.valor = parseFloat(String(body.valor));
    if (body.fechaInicio !== undefined) updateData.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
    if (body.fechaFin !== undefined) updateData.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;
    if (body.limiteUsos !== undefined) updateData.limiteUsos = body.limiteUsos ? parseInt(String(body.limiteUsos), 10) : null;
    if (body.activo !== undefined) updateData.activo = body.activo;

    const promo = await prisma.codigoPromocion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(promo);
  } catch (error) {
    console.error("PUT /api/promociones/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar promoción" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await prisma.codigoPromocion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    // If the promo has been used (usosActuales > 0), soft-delete by setting activo=false
    // to preserve referential integrity with existing presupuestos/pedidos
    if (existing.usosActuales > 0) {
      const promo = await prisma.codigoPromocion.update({
        where: { id },
        data: { activo: false },
      });
      return NextResponse.json({ ...promo, _softDeleted: true });
    }

    // No usage - safe to hard delete
    await prisma.codigoPromocion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/promociones/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar promoción" }, { status: 500 });
  }
}
