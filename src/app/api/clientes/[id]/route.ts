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

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        presupuestos: {
          orderBy: { fechaEmision: "desc" },
          take: 5,
          select: {
            id: true,
            numero: true,
            estado: true,
            fechaEmision: true,
            total: true,
          },
        },
        pedidos: {
          orderBy: { fechaEmision: "desc" },
          take: 5,
          select: {
            id: true,
            numero: true,
            estado: true,
            fechaEmision: true,
            total: true,
          },
        },
        facturas: {
          orderBy: { fechaEmision: "desc" },
          take: 5,
          select: {
            id: true,
            numero: true,
            estado: true,
            fechaEmision: true,
            total: true,
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("GET /api/clientes/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 });
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

    const existing = await prisma.cliente.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: body.nombre !== undefined ? body.nombre : existing.nombre,
        cifNif: body.cifNif !== undefined ? body.cifNif : existing.cifNif,
        email: body.email !== undefined ? body.email : existing.email,
        telefono: body.telefono !== undefined ? body.telefono : existing.telefono,
        movil: body.movil !== undefined ? body.movil : existing.movil,
        direccion: body.direccion !== undefined ? body.direccion : existing.direccion,
        ciudad: body.ciudad !== undefined ? body.ciudad : existing.ciudad,
        codigoPostal: body.codigoPostal !== undefined ? body.codigoPostal : existing.codigoPostal,
        pais: body.pais !== undefined ? body.pais : existing.pais,
        notas: body.notas !== undefined ? body.notas : existing.notas,
        activo: body.activo !== undefined ? body.activo : existing.activo,
      },
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("PUT /api/clientes/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
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

    const existing = await prisma.cliente.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("DELETE /api/clientes/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}
