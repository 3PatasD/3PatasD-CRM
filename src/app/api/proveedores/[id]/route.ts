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

    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
      include: {
        compras: {
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
        productos: {
          include: {
            producto: {
              select: {
                id: true,
                sku: true,
                nombre: true,
              },
            },
          },
        },
        _count: {
          select: { compras: true },
        },
      },
    });

    if (!proveedor) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    return NextResponse.json(proveedor);
  } catch (error) {
    console.error("GET /api/proveedores/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener proveedor" }, { status: 500 });
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

    const existing = await prisma.proveedor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: {
        nombre: body.nombre !== undefined ? body.nombre : existing.nombre,
        cifNif: body.cifNif !== undefined ? body.cifNif : existing.cifNif,
        email: body.email !== undefined ? body.email : existing.email,
        telefono: body.telefono !== undefined ? body.telefono : existing.telefono,
        contacto: body.contacto !== undefined ? body.contacto : existing.contacto,
        direccion: body.direccion !== undefined ? body.direccion : existing.direccion,
        ciudad: body.ciudad !== undefined ? body.ciudad : existing.ciudad,
        codigoPostal: body.codigoPostal !== undefined ? body.codigoPostal : existing.codigoPostal,
        pais: body.pais !== undefined ? body.pais : existing.pais,
        notas: body.notas !== undefined ? body.notas : existing.notas,
        activo: body.activo !== undefined ? body.activo : existing.activo,
      },
    });

    return NextResponse.json(proveedor);
  } catch (error) {
    console.error("PUT /api/proveedores/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar proveedor" }, { status: 500 });
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

    const existing = await prisma.proveedor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json(proveedor);
  } catch (error) {
    console.error("DELETE /api/proveedores/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar proveedor" }, { status: 500 });
  }
}
