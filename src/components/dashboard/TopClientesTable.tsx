"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";

interface TopCliente {
  clienteId: string;
  nombre: string;
  totalFacturado: number;
}

export function TopClientesTable({ data }: { data: TopCliente[] }) {
  const max = data[0]?.totalFacturado ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top clientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin datos aún</p>
        ) : (
          data.map((c, i) => (
            <Link key={c.clienteId} href={`/clientes/${c.clienteId}`} className="block hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-medium truncate max-w-[140px]">{c.nombre}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatEuro(c.totalFacturado)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(c.totalFacturado / max) * 100}%` }}
                />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
