"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Pencil, Save, X, AlertTriangle } from "lucide-react";
import { formatEuro } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Categoria { id: string; nombre: string }
interface Producto {
  id: string; sku: string; nombre: string; descripcion: string | null;
  categoriaId: string | null; categoria: Categoria | null;
  precioCosto: number; precioVenta: number; iva: number;
  stockActual: number; stockMinimo: number; unidad: string; activo: boolean;
}

export default function ProductoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Producto & { precioCosto: string; precioVenta: string; iva: string; stockActual: string; stockMinimo: string }>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/productos/${id}`).then((r) => r.json()),
      fetch("/api/categorias").then((r) => r.json()),
    ]).then(([prod, cats]) => {
      if (!prod.id) { router.push("/productos"); return; }
      setProducto(prod);
      setForm({ ...prod, precioCosto: String(prod.precioCosto), precioVenta: String(prod.precioVenta), iva: String(prod.iva), stockActual: String(prod.stockActual), stockMinimo: String(prod.stockMinimo) });
      setCategorias(cats);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          precioCosto: parseFloat(form.precioCosto || "0"),
          precioVenta: parseFloat(form.precioVenta || "0"),
          iva: parseFloat(form.iva || "0"),
          stockActual: parseFloat(form.stockActual || "0"),
          stockMinimo: parseFloat(form.stockMinimo || "0"),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Producto actualizado" });
      setEditing(false);
      const updated = await res.json();
      setProducto(updated);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!producto) return null;

  const lowStock = Number(producto.stockActual) <= Number(producto.stockMinimo);
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/productos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {producto.nombre}
              {lowStock && <AlertTriangle className="h-5 w-5 text-destructive" />}
            </h1>
            <p className="text-muted-foreground text-sm font-mono">{producto.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" />Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Guardar</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              {editing ? <Input value={form.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} className="h-8" /> : <span className="text-sm">{producto.nombre}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">SKU</Label>
              {editing ? <Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} className="h-8" /> : <span className="text-sm font-mono">{producto.sku}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              {editing ? (
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.categoriaId ?? ""} onChange={(e) => set("categoriaId", e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              ) : producto.categoria ? <Badge variant="secondary">{producto.categoria.nombre}</Badge> : <span className="text-sm text-muted-foreground">—</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Unidad</Label>
              {editing ? <Input value={form.unidad ?? ""} onChange={(e) => set("unidad", e.target.value)} className="h-8" /> : <span className="text-sm">{producto.unidad}</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Precios y Stock</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Precio de venta</Label>
              {editing ? <Input type="number" step="0.01" value={form.precioVenta ?? ""} onChange={(e) => set("precioVenta", e.target.value)} className="h-8" /> : <span className="text-sm font-medium">{formatEuro(producto.precioVenta)}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Precio de costo</Label>
              {editing ? <Input type="number" step="0.01" value={form.precioCosto ?? ""} onChange={(e) => set("precioCosto", e.target.value)} className="h-8" /> : <span className="text-sm">{formatEuro(producto.precioCosto)}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">IVA</Label>
              {editing ? (
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.iva ?? "21"} onChange={(e) => set("iva", e.target.value)}>
                  {["0","4","10","21"].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              ) : <span className="text-sm">{producto.iva}%</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Stock actual</Label>
              {editing ? <Input type="number" step="0.001" value={form.stockActual ?? ""} onChange={(e) => set("stockActual", e.target.value)} className="h-8" /> : (
                <span className={`text-sm font-medium ${lowStock ? "text-destructive" : ""}`}>
                  {Number(producto.stockActual)} {producto.unidad}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Stock mínimo</Label>
              {editing ? <Input type="number" step="0.001" value={form.stockMinimo ?? ""} onChange={(e) => set("stockMinimo", e.target.value)} className="h-8" /> : <span className="text-sm">{Number(producto.stockMinimo)} {producto.unidad}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {lowStock && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Stock bajo: {Number(producto.stockActual)} {producto.unidad} disponibles (mínimo: {Number(producto.stockMinimo)} {producto.unidad})</span>
        </div>
      )}
    </div>
  );
}
