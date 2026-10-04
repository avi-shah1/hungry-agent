import { NextResponse } from "next/server";
import { ProfileSchema } from "@/src/contracts";
import { deleteProfile, getProfile, profileExists, upsertProfile } from "@/src/db/queries/profiles";

function userIdFrom(req: Request): string | null {
  return new URL(req.url).searchParams.get("userId");
}

function serverError(err: unknown) {
  console.error("profile route error:", err instanceof Error ? err.message : "unknown");
  return NextResponse.json({ error: "internal error" }, { status: 500 });
}

async function parseBody(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "invalid JSON" }, { status: 400 }) };
  }
  const parsed = ProfileSchema.safeParse(json);
  if (!parsed.success) {
    return {
      error: NextResponse.json({ error: "invalid profile", issues: parsed.error.issues }, { status: 400 }),
    };
  }
  return { profile: parsed.data };
}

export async function GET(req: Request) {
  const userId = userIdFrom(req);
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try {
    const profile = await getProfile(userId);
    return profile ? NextResponse.json(profile) : NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const { profile, error } = await parseBody(req);
  if (error) return error;
  try {
    if (await profileExists(profile.userId)) {
      return NextResponse.json({ error: "profile already exists" }, { status: 409 });
    }
    return NextResponse.json(await upsertProfile(profile), { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Request) {
  const { profile, error } = await parseBody(req);
  if (error) return error;
  try {
    return NextResponse.json(await upsertProfile(profile));
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Request) {
  const userId = userIdFrom(req);
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try {
    const deleted = await deleteProfile(userId);
    return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (err) {
    return serverError(err);
  }
}
