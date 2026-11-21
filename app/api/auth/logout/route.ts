import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: "solstone_session",
    value: "",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: "solstone_chat_auth", value: "", path: "/", maxAge: 0,
  });
  return response;
}
