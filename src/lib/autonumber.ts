import { prisma } from "./prisma";

type Prefix = "PRS" | "PED" | "ALB" | "FAC" | "COM";

export async function nextNumero(prefix: Prefix): Promise<string> {
  const year = new Date().getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<[{ ultimo: bigint }]>`
      INSERT INTO "Contador" (id, ano, ultimo)
      VALUES (${prefix}, ${year}, 1)
      ON CONFLICT (id, ano)
      DO UPDATE SET ultimo = "Contador".ultimo + 1
      RETURNING ultimo
    `;
    return rows[0].ultimo;
  });

  const n = result.toString().padStart(3, "0");
  return `${prefix}-${year}-${n}`;
}
