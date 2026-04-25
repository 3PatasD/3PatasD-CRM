"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, AlertTriangle, FolderPlus, FileDown, Loader2 } from "lucide-react";
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

  // Modal nueva categoría
  const [modalOpen, setModalOpen] = useState(false);
  const [nombreCat, setNombreCat] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [catError, setCatError] = useState("");

  // PDF download
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const t = setTimeout(() =>
      fetch(`/api/productos?search=${encodeURIComponent(search)}`)
        .then((r) => r.json()).then(setProductos).finally(() => setLoading(false))
    , 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleCrearCategoria(e: React.FormEvent) {
    e.preventDefault();
    setCatError("");
    setSavingCat(true);
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombreCat.trim() }),
    });
    setSavingCat(false);
    if (res.ok) {
      setModalOpen(false);
      setNombreCat("");
    } else {
      const data = await res.json();
      setCatError(data.error ?? "Error al crear categoría");
    }
  }

  async function handleDescargarPDF() {
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/productos/catalogo/pdf");
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogo-productos-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error al generar el catálogo PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground text-sm mt-1">Catálogo de productos y control de stock</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setNombreCat(""); setCatError(""); setModalOpen(true); }}>
            <FolderPlus className="h-4 w-4 mr-2" />Nueva categoría
          </Button>
          <Button variant="outline" onClick={handleDescargarPDF} disabled={downloadingPdf}>
            {downloadingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Catálogo PDF
          </Button>
          <Link href="/productos/nuevo">
            <Button><Plus className="h-4 w-4 mr-2" />Nuevo producto</Button>
          </Link>
        </div>
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

      {/* Modal nueva categoría */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearCategoria} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="nombreCat">Nombre de la categoría</Label>
              <Input
                id="nombreCat"
                placeholder="Ej: Electrónica, Herramientas..."
                value={nombreCat}
                onChange={(e) => setNombreCat(e.target.value)}
                required
                autoFocus
              />
              {catError && <p className="text-sm text-destructive">{catError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCat || !nombreCat.trim()}>
                {savingCat && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear categoría
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
