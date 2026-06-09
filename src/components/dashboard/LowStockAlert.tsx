"use client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StockItem {
  id: string;
  nombre: string;
  sku: string;
  stockActual: number;
  stockMinimo: number;
}

export function LowStockAlert({ data }: { data: StockItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <CardTitle className="text-base">Stock bajo</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Todo el stock está en niveles correctos</p>
        ) : (
          <div className="space-y-2">
            {data.map((p) => (
              <Link key={p.id} href={`/productos/${p.id}`} className="flex items-center justify-between py-1.5 hover:opacity-80 transition-opacity">
                <div>
                  <p className="text-sm font-medium leading-none">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.sku}</p>
                </div>
                <div className="text-right">
                  <Badge variant={p.stockActual <= 0 ? "destructive" : "outline"} className="text-xs">
                    {p.stockActual} / {p.stockMinimo}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
