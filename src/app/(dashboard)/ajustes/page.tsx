"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface Config {
  id: number; nombre: string; cif: string; direccion: string; ciudad: string;
  codigoPostal: string; pais: string; telefono: string | null; email: string | null;
  web: string | null; logoUrl: string | null; datosBancarios: string | null; ivaDefecto: number;
}

export default function AjustesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [config, setConfig] = useState<Partial<Config>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/ajustes").then((r) => r.json()).then((d) => { setConfig(d); }).finally(() => setLoading(false));
  }, []);

  const set = (f: string, v: string) => setConfig((p) => ({ ...p, [f]: v }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/ajustes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...config, ivaDefecto: parseFloat(String(config.ivaDefecto)) }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Configuración guardada" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig((p) => ({ ...p, logoUrl: data.url }));
      toast({ title: "Logo subido correctamente" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setUploading(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold">Configuración de empresa</h1><p className="text-muted-foreground text-sm mt-1">Datos que aparecerán en los documentos PDF</p></div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Logo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Logo de empresa</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              {config.logoUrl ? <Image src={config.logoUrl} alt="Logo" width={96} height={96} className="object-contain" /> : <span className="text-xs text-muted-foreground text-center px-2">Sin logo</span>}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Subir logo
              </Button>
              <p className="text-xs text-muted-foreground mt-2">PNG, JPG — máx 2MB</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Datos fiscales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5"><Label>Nombre / Razón social</Label><Input value={config.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>CIF / NIF</Label><Input value={config.cif ?? ""} onChange={(e) => set("cif", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>IVA por defecto (%)</Label><Input type="number" step="0.1" value={config.ivaDefecto ?? 21} onChange={(e) => set("ivaDefecto", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dirección y contacto</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5"><Label>Dirección</Label><Input value={config.direccion ?? ""} onChange={(e) => set("direccion", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Ciudad</Label><Input value={config.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Código postal</Label><Input value={config.codigoPostal ?? ""} onChange={(e) => set("codigoPostal", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>País</Label><Input value={config.pais ?? "España"} onChange={(e) => set("pais", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={config.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={config.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Web</Label><Input value={config.web ?? ""} onChange={(e) => set("web", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Datos bancarios</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="IBAN: ES00 0000 0000 0000 0000 0000&#10;BIC: XXXXXXXX"
              value={config.datosBancarios ?? ""}
              onChange={(e) => set("datosBancarios", e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar configuración</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
