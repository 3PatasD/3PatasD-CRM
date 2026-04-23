"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Cliente {
  id: string;
  nombre: string;
  cifNif: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  activo: boolean;
  createdAt: string;
  _count: { presupuestos: number };
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => fetchClientes(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function fetchClientes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setClientes(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona tu cartera de clientes</p>
        </div>
        <Link href="/clientes/nuevo">
          <Button><Plus className="h-4 w-4 mr-2" />Nuevo cliente</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, CIF o email..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contacto</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Ciudad</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Presupuestos</th>
              <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No se encontraron clientes</td></tr>
            ) : clientes.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/clientes/${c.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{c.nombre}</div>
                  {c.cifNif && <div className="text-xs text-muted-foreground">{c.cifNif}</div>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    {c.email && <span className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.telefono && <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{c.telefono}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.ciudad ?? "—"}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <Badge variant="secondary">{c._count.presupuestos}</Badge>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
