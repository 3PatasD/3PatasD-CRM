"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone } from "lucide-react";

interface Proveedor {
  id: string; nombre: string; cifNif: string | null; email: string | null;
  telefono: string | null; contacto: string | null; ciudad: string | null;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => fetch(`/api/proveedores?search=${encodeURIComponent(search)}`)
      .then((r) => r.json()).then(setProveedores).finally(() => setLoading(false)), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona tus proveedores y suministradores</p>
        </div>
        <Link href="/proveedores/nuevo">
          <Button><Plus className="h-4 w-4 mr-2" />Nuevo proveedor</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proveedor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Proveedor</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contacto</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Ciudad</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Persona de contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No se encontraron proveedores</td></tr>
            ) : proveedores.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/proveedores/${p.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.nombre}</div>
                  {p.cifNif && <div className="text-xs text-muted-foreground">{p.cifNif}</div>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {p.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{p.email}</div>}
                  {p.telefono && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{p.telefono}</div>}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.ciudad ?? "—"}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.contacto ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
