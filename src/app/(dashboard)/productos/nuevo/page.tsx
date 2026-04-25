"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Wand2, Upload, FileDown, CheckCircle, XCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Categoria { id: string; nombre: string }

// ── CSV parser (handles quoted fields) ──────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

const CSV_TEMPLATE = `nombre,descripcion,categoria,sku,precio_costo,precio_venta,iva,stock_actual,stock_minimo,unidad
Martillo carpintero,Martillo de madera con mango ergonómico,Herramientas,,5.99,12.50,21,10,2,ud
Tornillo 5x50mm,,Tornillería,,0.10,0.25,21,500,50,ud
Cable HDMI 2m,Cable HDMI de alta velocidad,Electrónica,ELEC-001,3.50,8.99,21,20,5,ud`;

// ── Component ────────────────────────────────────────────────────────────────
export default function NuevoProductoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [modo, setModo] = useState<"manual" | "csv">("manual");

  // ── Manual form ──────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = useState({
    sku: "", nombre: "", descripcion: "", categoriaId: "",
    precioCosto: "", precioVenta: "", iva: "21",
    stockActual: "0", stockMinimo: "0", unidad: "ud",
  });
  const [skuAuto, setSkuAuto] = useState(true);
  const [loadingSku, setLoadingSku] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/categorias").then((r) => r.json()).then(setCategorias);
  }, []);

  // Auto-generate SKU when name changes
  useEffect(() => {
    if (!skuAuto || !form.nombre.trim()) return;
    setLoadingSku(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/productos/sku?nombre=${encodeURIComponent(form.nombre)}`);
        const { sku } = await res.json();
        setForm((p) => ({ ...p, sku }));
      } finally { setLoadingSku(false); }
    }, 500);
    return () => { clearTimeout(t); setLoadingSku(false); };
  }, [form.nombre, skuAuto]);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          precioCosto: parseFloat(form.precioCosto),
          precioVenta: parseFloat(form.precioVenta),
          iva: parseFloat(form.iva),
          stockActual: parseFloat(form.stockActual),
          stockMinimo: parseFloat(form.stockMinimo),
          categoriaId: form.categoriaId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Producto creado" });
      router.push(`/productos/${data.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  // ── CSV import ───────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: { fila: number; nombre: string; error: string }[] } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target?.result as string);
      setCsvRows(rows);
      setImportResult(null);
    };
    reader.readAsText(file, "utf-8");
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla-productos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!csvRows.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/productos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos: csvRows }),
      });
      const data = await res.json();
      setImportResult(data);
      if (data.created > 0) {
        toast({ title: `${data.created} producto${data.created > 1 ? "s" : ""} importado${data.created > 1 ? "s" : ""}` });
      }
    } catch {
      toast({ title: "Error al importar", variant: "destructive" });
    } finally { setImporting(false); }
  }

  const csvColumns = ["nombre", "categoria", "sku", "precio_venta", "precio_costo", "iva", "stock_actual", "unidad"];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/productos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nuevo producto</h1>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setModo("manual")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${modo === "manual" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Crear manualmente
        </button>
        <button
          onClick={() => { setModo("csv"); setImportResult(null); setCsvRows([]); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${modo === "csv" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />Importar CSV
        </button>
      </div>

      {/* ── MANUAL MODE ─────────────────────────────────────────────────── */}
      {modo === "manual" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre primero — para auto-generar SKU */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  required
                  placeholder="Ej: Martillo de carpintero"
                  autoFocus
                />
              </div>

              {/* SKU auto-generado */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>SKU *</Label>
                  {skuAuto && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Wand2 className="h-3 w-3" />auto
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    value={form.sku}
                    onChange={(e) => { setSkuAuto(false); set("sku", e.target.value); }}
                    required
                    placeholder="MAR-001"
                    className={skuAuto ? "pr-8 text-muted-foreground" : ""}
                  />
                  {loadingSku && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
                {skuAuto && (
                  <p className="text-xs text-muted-foreground">
                    Generado automáticamente.{" "}
                    <button type="button" className="underline" onClick={() => setSkuAuto(false)}>Editar</button>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.categoriaId}
                  onChange={(e) => set("categoriaId", e.target.value)}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label>Descripción</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.descripcion}
                  onChange={(e) => set("descripcion", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Precios y IVA</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Precio costo (€) *</Label>
                <Input type="number" step="0.01" min="0" value={form.precioCosto} onChange={(e) => set("precioCosto", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Precio venta (€) *</Label>
                <Input type="number" step="0.01" min="0" value={form.precioVenta} onChange={(e) => set("precioVenta", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>IVA (%)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.iva} onChange={(e) => set("iva", e.target.value)}
                >
                  {["0","4","10","21"].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Stock</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Stock actual</Label>
                <Input type="number" step="0.001" min="0" value={form.stockActual} onChange={(e) => set("stockActual", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock mínimo</Label>
                <Input type="number" step="0.001" min="0" value={form.stockMinimo} onChange={(e) => set("stockMinimo", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidad</Label>
                <Input value={form.unidad} onChange={(e) => set("unidad", e.target.value)} placeholder="ud, kg, m..." />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/productos"><Button variant="outline" type="button">Cancelar</Button></Link>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Guardar producto"}
            </Button>
          </div>
        </form>
      )}

      {/* ── CSV MODE ─────────────────────────────────────────────────────── */}
      {modo === "csv" && (
        <div className="space-y-4">
          {/* Instructions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Importar desde CSV</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                El CSV debe tener estos encabezados (solo <strong>nombre</strong>, <strong>precio_costo</strong> y <strong>precio_venta</strong> son obligatorios).
                El SKU se genera automáticamente si se deja vacío. Si la categoría no existe, se crea automáticamente.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["nombre *","descripcion","categoria","sku","precio_costo *","precio_venta *","iva","stock_actual","stock_minimo","unidad"].map((col) => (
                  <Badge key={col} variant={col.endsWith("*") ? "default" : "secondary"} className="font-mono text-xs">{col}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <FileDown className="h-4 w-4 mr-2" />Descargar plantilla CSV
                </Button>
                <Button size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Seleccionar archivo
                </Button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {csvRows.length > 0 && !importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Vista previa — {csvRows.length} fila{csvRows.length !== 1 ? "s" : ""}</span>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Importar {csvRows.length} producto{csvRows.length !== 1 ? "s" : ""}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      {csvColumns.map((col) => (
                        <th key={col} className="text-left px-3 py-2 font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {csvRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className={!row.nombre ? "bg-destructive/10" : ""}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 2}</td>
                        {csvColumns.map((col) => (
                          <td key={col} className="px-3 py-2 max-w-[140px] truncate">{row[col] || <span className="text-muted-foreground">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                    {csvRows.length > 10 && (
                      <tr><td colSpan={csvColumns.length + 1} className="px-3 py-2 text-muted-foreground text-center">... y {csvRows.length - 10} filas más</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {importResult && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <p className="font-medium text-green-700">{importResult.created} producto{importResult.created !== 1 ? "s" : ""} importado{importResult.created !== 1 ? "s" : ""} correctamente</p>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                      <XCircle className="h-4 w-4" />{importResult.errors.length} error{importResult.errors.length !== 1 ? "es" : ""}
                    </div>
                    <div className="rounded-md border border-destructive/20 overflow-hidden">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="flex gap-3 px-3 py-2 text-sm border-b last:border-0 bg-destructive/5">
                          <span className="text-muted-foreground shrink-0">Fila {err.fila}</span>
                          <span className="font-medium">{err.nombre}</span>
                          <span className="text-destructive">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setCsvRows([]); setImportResult(null); if (fileRef.current) fileRef.current.value = ""; }}>
                    Importar otro archivo
                  </Button>
                  <Button onClick={() => router.push("/productos")}>Ver productos</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
