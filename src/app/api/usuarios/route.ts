import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("GET /api/usuarios error:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.nombre || typeof body.nombre !== "string" || !body.nombre.trim()) {
      return NextResponse.json({ error: "El campo nombre es obligatorio" }, { status: 400 });
    }
    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json({ error: "El campo email es obligatorio" }, { status: 400 });
    }
    if (!body.password || typeof body.password !== "string" || body.password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const validRoles = ["ADMIN", "VENDEDOR", "ALMACEN"];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await prisma.usuario.findUnique({ where: { email: body.email.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: body.nombre.trim(),
        email: body.email.trim().toLowerCase(),
        passwordHash,
        role: body.role ?? "VENDEDOR",
        activo: true,
      },
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

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    console.error("POST /api/usuarios error:", error);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
