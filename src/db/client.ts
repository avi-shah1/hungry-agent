import { neon, Pool } from "@neondatabase/serverless";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

/** One-shot HTTP query helper: sql`SELECT ...` */
export function getSql() {
  return neon(databaseUrl());
}

/** Pooled client, needed for transactions (used by the migration runner). */
export function getPool() {
  return new Pool({ connectionString: databaseUrl() });
}
