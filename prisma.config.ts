import { defineConfig } from "prisma/config";

// In Docker, DATABASE_URL is set via docker-compose environment.
// Locally, set it in .env (loaded by Next.js automatically).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
