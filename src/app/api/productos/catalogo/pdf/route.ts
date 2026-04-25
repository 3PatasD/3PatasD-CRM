import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { PDFCatalogo } from "@/components/pdf/PDFCatalogo";
import type { DocumentProps } from "@react-pdf/renderer";
import { formatDatePDF } from "@/components/pdf/PDFBase";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const [productos, empresa] = await Promise.all([
      prisma.producto.findMany({
        where: { activo: true },
        orderBy: [{ categoria: { nombre: "asc" } }, { nombre: "asc" }],
        include: { categoria: { select: { nombre: true } } },
      }),
      prisma.configuracionEmpresa.findFirst(),
    ]);

    // Group by category
    const categoriaMap = new Map<string, typeof productos>();
    const sinCategoria: typeof productos = [];

    for (const p of productos) {
      if (p.categoria) {
        const key = p.categoria.nombre;
        if (!categoriaMap.has(key)) categoriaMap.set(key, []);
        categoriaMap.get(key)!.push(p);
      } else {
        sinCategoria.push(p);
      }
    }

    const categorias = Array.from(categoriaMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nombre, prods]) => ({
        nombre,
        productos: prods.map((p) => ({
          sku: p.sku,
          nombre: p.nombre,
          precioVenta: Number(p.precioVenta),
          precioCosto: Number(p.precioCosto),
          iva: Number(p.iva),
          stockActual: Number(p.stockActual),
          stockMinimo: Number(p.stockMinimo),
          unidad: p.unidad,
        })),
      }));

    const sinCategoriaData = sinCategoria.map((p) => ({
      sku: p.sku,
      nombre: p.nombre,
      precioVenta: Number(p.precioVenta),
      precioCosto: Number(p.precioCosto),
      iva: Number(p.iva),
      stockActual: Number(p.stockActual),
      stockMinimo: Number(p.stockMinimo),
      unidad: p.unidad,
    }));

    const fecha = formatDatePDF(new Date());
    const element = React.createElement(PDFCatalogo, { categorias, sinCategoria: sinCategoriaData, empresa, fecha }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="catalogo-productos-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF catalogo error:", error);
    return NextResponse.json({ error: "Error al generar catálogo PDF" }, { status: 500 });
  }
}
