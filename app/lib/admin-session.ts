import { createHmac, timingSafeEqual } from "node:crypto";

export type AppSession = {
  id: string;
  name: string;
  role: "admin" | "worker";
  exp: number;
};

function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;

  if (!secret) {
    throw new Error("APP_SESSION_SECRET nedostaje.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

export function createSessionToken(
  user: Omit<AppSession, "exp">
) {
  const payload: AppSession = {
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const encoded = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const signature = sign(encoded);

  return `${encoded}.${signature}`;
}

export function verifySessionToken(
  token?: string | null
): AppSession | null {
  if (!token) {
    return null;
  }

  try {
    const [encoded, signature] = token.split(".");

    if (!encoded || !signature) {
      return null;
    }

    const expectedSignature = sign(encoded);

    const suppliedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (suppliedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (
      !timingSafeEqual(
        suppliedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(
        encoded,
        "base64url"
      ).toString("utf8")
    ) as AppSession;

    if (!session.exp || session.exp < Date.now()) {
      return null;
    }

    if (
      session.role !== "admin" &&
      session.role !== "worker"
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
