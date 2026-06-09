"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tendencia?: number;
  descripcion?: string;
  colorClass?: string;
}

export function KPICard({ title, value, icon: Icon, tendencia, descripcion, colorClass = "text-primary" }: KPICardProps) {
  const hasTendencia = tendencia !== undefined && tendencia !== null;
  const isUp = hasTendencia && tendencia > 0;
  const isDown = hasTendencia && tendencia < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-md bg-muted", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hasTendencia && (
          <p className={cn("flex items-center gap-1 text-xs mt-1", isUp ? "text-green-600" : isDown ? "text-red-500" : "text-muted-foreground")}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {isUp ? "+" : ""}{tendencia}% vs mes anterior
          </p>
        )}
        {descripcion && !hasTendencia && (
          <p className="text-xs text-muted-foreground mt-1">{descripcion}</p>
        )}
      </CardContent>
    </Card>
  );
}
