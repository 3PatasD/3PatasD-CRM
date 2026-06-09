import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { PDFFactura } from "@/components/pdf/PDFFactura";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const [factura, empresa] = await Promise.all([
      prisma.factura.findUnique({
        where: { id },
        include: {
          cliente: true,
          albaranes: { include: { lineas: { orderBy: { orden: "asc" } } } },
        },
      }),
      prisma.configuracionEmpresa.findFirst(),
    ]);

    if (!factura) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const element = React.createElement(PDFFactura, { factura, empresa }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${factura.numero}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF factura error:", error);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
