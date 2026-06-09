import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { PDFPedido } from "@/components/pdf/PDFPedido";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const [pedido, empresa] = await Promise.all([
      prisma.pedido.findUnique({
        where: { id },
        include: {
          cliente: true,
          usuario: { select: { nombre: true } },
          lineas: { orderBy: { orden: "asc" } },
        },
      }),
      prisma.configuracionEmpresa.findFirst(),
    ]);

    if (!pedido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const element = React.createElement(PDFPedido, { pedido, empresa }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pedido.numero}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF pedido error:", error);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
