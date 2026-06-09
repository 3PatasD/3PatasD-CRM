import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const validRoles = ["ADMIN", "VENDEDOR", "ALMACEN"];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // Prevent admin from deactivating themselves
    if (id === session.user.id && body.activo === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
    if (body.email !== undefined) {
      const emailTrim = body.email.trim().toLowerCase();
      const clash = await prisma.usuario.findFirst({ where: { email: emailTrim, NOT: { id } } });
      if (clash) return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 400 });
      updateData.email = emailTrim;
    }
    if (body.role !== undefined) updateData.role = body.role;
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.password && typeof body.password === "string" && body.password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("PUT /api/usuarios/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}
