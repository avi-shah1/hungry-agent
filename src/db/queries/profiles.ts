import { ProfileSchema, type Profile } from "@/src/contracts";
import { getSql } from "../client";

type ProfileRow = {
  user_id: string;
  diet: string | null;
  budget: string;
  max_walk_minutes: number;
  cuisines: string[];
  weights: unknown;
};

function rowToProfile(row: ProfileRow): Profile {
  return ProfileSchema.parse({
    userId: row.user_id,
    diet: row.diet,
    budget: Number(row.budget),
    maxWalkMinutes: row.max_walk_minutes,
    preferredCuisines: row.cuisines,
    weights: row.weights,
  });
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT user_id, diet, budget, max_walk_minutes, cuisines, weights
    FROM profiles WHERE user_id = ${userId}
  `) as ProfileRow[];
  const row = rows[0];
  return row ? rowToProfile(row) : null;
}

export async function profileExists(userId: string): Promise<boolean> {
  return (await getProfile(userId)) !== null;
}

export async function upsertProfile(input: Profile): Promise<Profile> {
  const p = ProfileSchema.parse(input);
  const sql = getSql();
  await sql`INSERT INTO users (id) VALUES (${p.userId}) ON CONFLICT (id) DO NOTHING`;
  const rows = (await sql`
    INSERT INTO profiles (user_id, diet, budget, max_walk_minutes, cuisines, weights)
    VALUES (${p.userId}, ${p.diet}, ${p.budget}, ${p.maxWalkMinutes}, ${p.preferredCuisines}, ${JSON.stringify(p.weights)}::jsonb)
    ON CONFLICT (user_id) DO UPDATE SET
      diet = EXCLUDED.diet,
      budget = EXCLUDED.budget,
      max_walk_minutes = EXCLUDED.max_walk_minutes,
      cuisines = EXCLUDED.cuisines,
      weights = EXCLUDED.weights,
      updated_at = now()
    RETURNING user_id, diet, budget, max_walk_minutes, cuisines, weights
  `) as ProfileRow[];
  const row = rows[0];
  if (!row) throw new Error("profile upsert returned no row");
  return rowToProfile(row);
}

export async function deleteProfile(userId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`DELETE FROM profiles WHERE user_id = ${userId} RETURNING user_id`) as unknown[];
  return rows.length > 0;
}
