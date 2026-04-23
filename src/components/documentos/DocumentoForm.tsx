"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { formatEuro } from "@/lib/utils";

interface Producto { id: string; nombre: string; sku: string; precioVenta: number; iva: number; unidad: string }
interface Cliente { id: string; nombre: string; cifNif: string | null }
interface Promo { id: string; codigo: string; tipo: string; valor: number; descripcion: string | null }

export interface LineaInput {
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  iva: number;
  orden: number;
}

export interface DocumentoFormData {
  clienteId: string;
  fechaValidez?: string;
  fechaEntrega?: string;
  direccionEntrega?: string;
  notasInternas?: string;
  notasCliente?: string;
  descuentoGlobal: number;
  codigoPromoId?: string;
  lineas: LineaInput[];
}

interface Props {
  tipo: "presupuesto" | "pedido";
  defaultClienteId?: string;
  onSubmit: (data: DocumentoFormData) => Promise<void>;
  loading: boolean;
}

export function DocumentoForm({ tipo, defaultClienteId, onSubmit, loading }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteId, setClienteId] = useState(defaultClienteId ?? "");
  const [fecha2, setFecha2] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [notasInternas, setNotasInternas] = useState("");
  const [notasCliente, setNotasCliente] = useState("");
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [codigoPromo, setCodigoPromo] = useState("");
  const [promoData, setPromoData] = useState<Promo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [lineas, setLineas] = useState<LineaInput[]>([
    { descripcion: "", cantidad: 1, precioUnitario: 0, descuento: 0, iva: 21, orden: 1 },
  ]);

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/productos").then((r) => r.json()),
    ]).then(([c, p]) => { setClientes(c); setProductos(p); });
  }, []);

  async function checkPromo() {
    if (!codigoPromo.trim()) return;
    setCheckingPromo(true);
    setPromoError("");
    try {
      const res = await fetch(`/api/promociones?codigo=${encodeURIComponent(codigoPromo)}`);
      const data = await res.json();
      if (!res.ok || !data?.id) {
        setPromoError("Código no válido o caducado");
        setPromoData(null);
      } else {
        setPromoData(data);
      }
    } catch {
      setPromoError("Error al verificar el código");
    } finally { setCheckingPromo(false); }
  }

  function setLinea(idx: number, field: keyof LineaInput, value: string | number) {
    setLineas((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function onProductoSelect(idx: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    setLineas((prev) => prev.map((l, i) => i === idx ? {
      ...l, productoId, descripcion: p.nombre, precioUnitario: Number(p.precioVenta), iva: Number(p.iva),
    } : l));
  }

  function addLinea() {
    setLineas((prev) => [...prev, { descripcion: "", cantidad: 1, precioUnitario: 0, descuento: 0, iva: 21, orden: prev.length + 1 }]);
  }

  function removeLinea(idx: number) {
    setLineas((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, orden: i + 1 })));
  }

  const subtotalLineas = lineas.reduce((acc, l) => {
    const base = l.cantidad * l.precioUnitario * (1 - l.descuento / 100);
    const iva = base * (l.iva / 100);
    return acc + base + iva;
  }, 0);

  const baseLineas = lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario * (1 - l.descuento / 100), 0);
  const ivaTotal = lineas.reduce((acc, l) => {
    const base = l.cantidad * l.precioUnitario * (1 - l.descuento / 100);
    return acc + base * (l.iva / 100);
  }, 0);
  const baseAfterGlobal = baseLineas * (1 - descuentoGlobal / 100);
  let descuentoPromoCalc = 0;
  if (promoData) {
    descuentoPromoCalc = promoData.tipo === "PORCENTAJE"
      ? baseAfterGlobal * (promoData.valor / 100)
      : promoData.valor;
  }
  const totalFinal = baseAfterGlobal - descuentoPromoCalc + ivaTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      clienteId,
      [tipo === "presupuesto" ? "fechaValidez" : "fechaEntrega"]: fecha2 || undefined,
      direccionEntrega: tipo === "pedido" ? (direccionEntrega || undefined) : undefined,
      notasInternas: notasInternas || undefined,
      notasCliente: notasCliente || undefined,
      descuentoGlobal,
      codigoPromoId: promoData?.id,
      lineas: lineas.map((l, i) => ({ ...l, orden: i + 1 })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos generales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={clienteId} onChange={(e) => setClienteId(e.target.value)} required
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.cifNif ? ` (${c.cifNif})` : ""}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{tipo === "presupuesto" ? "Fecha de validez" : "Fecha de entrega"}</Label>
            <Input type="date" value={fecha2} onChange={(e) => setFecha2(e.target.value)} />
          </div>
          {tipo === "pedido" && (
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Dirección de entrega</Label>
              <Input value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} placeholder="Opcional, si es diferente a la del cliente" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Líneas de producto</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addLinea}><Plus className="h-4 w-4 mr-1" />Añadir línea</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 pr-3 w-48">Producto</th>
                <th className="text-left py-2 pr-3 flex-1">Descripción</th>
                <th className="text-right py-2 pr-3 w-20">Cant.</th>
                <th className="text-right py-2 pr-3 w-24">P.Unit (€)</th>
                <th className="text-right py-2 pr-3 w-20">Dto %</th>
                <th className="text-right py-2 pr-3 w-20">IVA %</th>
                <th className="text-right py-2 pr-3 w-24">Subtotal</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lineas.map((l, idx) => {
                const base = l.cantidad * l.precioUnitario * (1 - l.descuento / 100);
                const sub = base + base * (l.iva / 100);
                return (
                  <tr key={idx}>
                    <td className="py-2 pr-3">
                      <select
                        className="h-8 w-full rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none"
                        value={l.productoId ?? ""}
                        onChange={(e) => onProductoSelect(idx, e.target.value)}
                      >
                        <option value="">Libre</option>
                        {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <Input className="h-8 text-xs" value={l.descripcion} onChange={(e) => setLinea(idx, "descripcion", e.target.value)} required />
                    </td>
                    <td className="py-2 pr-3">
                      <Input className="h-8 text-xs text-right" type="number" step="0.001" min="0.001" value={l.cantidad} onChange={(e) => setLinea(idx, "cantidad", parseFloat(e.target.value) || 0)} required />
                    </td>
                    <td className="py-2 pr-3">
                      <Input className="h-8 text-xs text-right" type="number" step="0.01" min="0" value={l.precioUnitario} onChange={(e) => setLinea(idx, "precioUnitario", parseFloat(e.target.value) || 0)} required />
                    </td>
                    <td className="py-2 pr-3">
                      <Input className="h-8 text-xs text-right" type="number" step="0.1" min="0" max="100" value={l.descuento} onChange={(e) => setLinea(idx, "descuento", parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="py-2 pr-3">
                      <select className="h-8 w-full rounded border border-input bg-transparent px-1 text-xs focus-visible:outline-none" value={l.iva} onChange={(e) => setLinea(idx, "iva", parseFloat(e.target.value))}>
                        {[0,4,10,21].map((v) => <option key={v} value={v}>{v}%</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-xs">{formatEuro(sub)}</td>
                    <td className="py-2">
                      <button type="button" onClick={() => removeLinea(idx)} className="text-muted-foreground hover:text-destructive" disabled={lineas.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Discounts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Descuentos y totales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descuento global (%)</Label>
              <Input type="number" step="0.1" min="0" max="100" value={descuentoGlobal} onChange={(e) => setDescuentoGlobal(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Tag className="h-3 w-3" />Código promocional</Label>
              <div className="flex gap-2">
                <Input
                  value={codigoPromo}
                  onChange={(e) => { setCodigoPromo(e.target.value.toUpperCase()); setPromoData(null); setPromoError(""); }}
                  placeholder="BIENVENIDO10"
                  className="font-mono uppercase"
                />
                <Button type="button" variant="outline" onClick={checkPromo} disabled={checkingPromo || !codigoPromo}>
                  {checkingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </Button>
              </div>
              {promoError && <p className="text-xs text-destructive">{promoError}</p>}
              {promoData && (
                <p className="text-xs text-green-600">
                  ✓ {promoData.descripcion ?? promoData.codigo} — {promoData.tipo === "PORCENTAJE" ? `${promoData.valor}%` : formatEuro(promoData.valor)} de descuento
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm border rounded-lg p-4 bg-muted/20">
            <div className="flex justify-between"><span className="text-muted-foreground">Base imponible</span><span>{formatEuro(baseLineas)}</span></div>
            {descuentoGlobal > 0 && <div className="flex justify-between text-orange-600"><span>Descuento {descuentoGlobal}%</span><span>-{formatEuro(baseLineas * descuentoGlobal / 100)}</span></div>}
            {descuentoPromoCalc > 0 && <div className="flex justify-between text-orange-600"><span>Código promo</span><span>-{formatEuro(descuentoPromoCalc)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatEuro(ivaTotal)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>{formatEuro(totalFinal)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Notas para el cliente</Label>
            <textarea className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={notasCliente} onChange={(e) => setNotasCliente(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notas internas</Label>
            <textarea className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={notasInternas} onChange={(e) => setNotasInternas(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading || !clienteId || lineas.length === 0}>
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : `Crear ${tipo === "presupuesto" ? "presupuesto" : "pedido"}`}
        </Button>
      </div>
    </form>
  );
}
