"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { formatEuro } from "@/lib/utils";

interface Producto {
  id: string; sku: string; nombre: string; unidad: string;
  precioCosto: number; precioVenta: number; iva: number;
  stockActual: number; stockMinimo: number; activo: boolean;
  categoria: { nombre: string } | null;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() =>
      fetch(`/api/productos?search=${encodeURIComponent(search)}`)
        .then((r) => r.json()).then(setProductos).finally(() => setLoading(false))
    , 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground text-sm mt-1">Catálogo de productos y control de stock</p>
        </div>
        <Link href="/productos/nuevo">
          <Button><Plus className="h-4 w-4 mr-2" />Nuevo producto</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o SKU..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Producto</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categoría</th>
              <th className="text-right px-4 py-3 font-medium">P. venta</th>
              <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">P. costo</th>
              <th className="text-right px-4 py-3 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No se encontraron productos</td></tr>
            ) : productos.map((p) => {
              const lowStock = p.stockActual <= p.stockMinimo;
              return (
                <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/productos/${p.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-2">
                      {p.nombre}
                      {lowStock && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.categoria ? <Badge variant="secondary">{p.categoria.nombre}</Badge> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatEuro(p.precioVenta)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">{formatEuro(p.precioCosto)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${lowStock ? "text-destructive" : ""}`}>
                      {Number(p.stockActual)} {p.unidad}
                    </span>
                    {lowStock && <div className="text-xs text-muted-foreground">mín: {Number(p.stockMinimo)}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
