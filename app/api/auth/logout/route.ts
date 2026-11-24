import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeNativeSession } from "../../../lib/native-push";

export async function POST() {
  const token = (await cookies()).get("solstone_session")?.value;
  if (token) await revokeNativeSession(token);
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: "solstone_session",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}
