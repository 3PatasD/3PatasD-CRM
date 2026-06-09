import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type FilaCSV = {
  nombre: string; descripcion?: string; categoria?: string; sku?: string;
  precio_costo: string; precio_venta: string; iva?: string;
  stock_actual?: string; stock_minimo?: string; unidad?: string;
};

function generarPrefijo(nombre: string): string {
  return nombre
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");
}

// POST /api/productos/importar — bulk create from CSV rows
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productos }: { productos: FilaCSV[] } = await req.json();
  if (!Array.isArray(productos) || productos.length === 0) {
    return NextResponse.json({ error: "No se recibieron productos" }, { status: 400 });
  }

  // Pre-load existing SKUs to avoid duplicates within the batch
  const skusExistentes = new Set(
    (await prisma.producto.findMany({ select: { sku: true } })).map((p) => p.sku)
  );
  // Cache category IDs by name
  const categoriaCache = new Map<string, string>();
  const catExistentes = await prisma.categoria.findMany({ select: { id: true, nombre: true } });
  for (const c of catExistentes) categoriaCache.set(c.nombre.toLowerCase(), c.id);

  const created: string[] = [];
  const errors: { fila: number; nombre: string; error: string }[] = [];

  for (let i = 0; i < productos.length; i++) {
    const fila = productos[i];
    const nombreRaw = fila.nombre?.trim();
    if (!nombreRaw) { errors.push({ fila: i + 2, nombre: "—", error: "Nombre vacío" }); continue; }

    const precioCosto = parseFloat(fila.precio_costo ?? "0");
    const precioVenta = parseFloat(fila.precio_venta ?? "0");
    if (isNaN(precioVenta) || precioVenta < 0) {
      errors.push({ fila: i + 2, nombre: nombreRaw, error: "Precio de venta inválido" }); continue;
    }

    // Resolve or auto-generate SKU
    let sku = fila.sku?.trim() ?? "";
    if (!sku) {
      const prefix = generarPrefijo(nombreRaw);
      const nums = [...skusExistentes]
        .filter((s) => s.startsWith(`${prefix}-`))
        .map((s) => parseInt(s.split("-")[1] ?? "0", 10))
        .filter((n) => !isNaN(n));
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      sku = `${prefix}-${String(next).padStart(3, "0")}`;
    }

    if (skusExistentes.has(sku)) {
      errors.push({ fila: i + 2, nombre: nombreRaw, error: `SKU duplicado: ${sku}` }); continue;
    }

    // Resolve category
    let categoriaId: string | null = null;
    const catNombre = fila.categoria?.trim();
    if (catNombre) {
      const key = catNombre.toLowerCase();
      if (categoriaCache.has(key)) {
        categoriaId = categoriaCache.get(key)!;
      } else {
        const nueva = await prisma.categoria.create({ data: { nombre: catNombre } });
        categoriaCache.set(key, nueva.id);
        categoriaId = nueva.id;
      }
    }

    try {
      await prisma.producto.create({
        data: {
          sku,
          nombre: nombreRaw,
          descripcion: fila.descripcion?.trim() || null,
          categoriaId,
          precioCosto: isNaN(precioCosto) ? 0 : precioCosto,
          precioVenta,
          iva: parseFloat(fila.iva ?? "21") || 21,
          stockActual: parseFloat(fila.stock_actual ?? "0") || 0,
          stockMinimo: parseFloat(fila.stock_minimo ?? "0") || 0,
          unidad: fila.unidad?.trim() || "ud",
          activo: true,
        },
      });
      skusExistentes.add(sku);
      created.push(nombreRaw);
    } catch (err) {
      errors.push({ fila: i + 2, nombre: nombreRaw, error: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  return NextResponse.json({ created: created.length, errors });
}
