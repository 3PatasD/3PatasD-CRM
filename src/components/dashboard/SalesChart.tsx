"use client";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPoint {
  mes: string;
  ingresos: number;
  gastos: number;
  neto: number;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function formatMes(mes: string) {
  const [year, month] = mes.split("-");
  return `${MONTH_LABELS[month]} ${year.slice(2)}`;
}

function formatEuroK(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k€`;
  return `${value.toFixed(0)}€`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const LABELS: Record<string, string> = {
  ingresos: "Ingresos",
  gastos: "Gastos",
  neto: "Beneficio neto",
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm text-sm min-w-44">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{LABELS[p.name] ?? p.name}</span>
          <span className="font-medium tabular-nums" style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SalesChart({ data }: { data: DataPoint[] }) {
  const formattedData = data.map((d) => ({ ...d, label: formatMes(d.mes) }));

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Ingresos vs Gastos — últimos 12 meses</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={formatEuroK}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={58}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(v) => LABELS[v] ?? v}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#gradIngresos)"
            />
            <Area
              type="monotone"
              dataKey="gastos"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#gradGastos)"
            />
            <Line
              type="monotone"
              dataKey="neto"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#10b981" }}
              strokeDasharray="6 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
