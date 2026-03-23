import { cookies } from "next/headers";
import { createClient, type UserSchema } from "@insforge/sdk";
import {
  INSFORGE_ACCESS_COOKIE,
  INSFORGE_REFRESH_COOKIE,
} from "@/lib/insforge/constants";

type ServerSession = {
  user: UserSchema | null;
  accessToken: string | null;
  refreshToken: string | null;
};

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function getInsforgeBaseUrl() {
  return process.env.NEXT_PUBLIC_INSFORGE_URL?.trim();
}

export function getInsforgeAnonKey() {
  return process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY?.trim();
}

export function hasInsforgeConfig() {
  return Boolean(getInsforgeBaseUrl() && getInsforgeAnonKey());
}

export function createInsforgeServerClient(accessToken?: string) {
  const baseUrl = getInsforgeBaseUrl();
  const anonKey = getInsforgeAnonKey();

  if (!baseUrl || !anonKey) {
    throw new Error("InsForge is not configured.");
  }

  return createClient({
    baseUrl,
    anonKey,
    isServerMode: true,
    edgeFunctionToken: accessToken,
  });
}

export async function getAuthTokens() {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get(INSFORGE_ACCESS_COOKIE)?.value,
    refreshToken: cookieStore.get(INSFORGE_REFRESH_COOKIE)?.value,
  };
}

export async function setAuthCookies(accessToken: string, refreshToken?: string) {
  const cookieStore = await cookies();

  cookieStore.set(INSFORGE_ACCESS_COOKIE, accessToken, {
    ...authCookieOptions,
    maxAge: 60 * 15,
  });

  if (refreshToken) {
    cookieStore.set(INSFORGE_REFRESH_COOKIE, refreshToken, {
      ...authCookieOptions,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(INSFORGE_ACCESS_COOKIE);
  cookieStore.delete(INSFORGE_REFRESH_COOKIE);
}

export async function getServerSession(options?: {
  persist?: boolean;
}): Promise<ServerSession> {
  if (!hasInsforgeConfig()) {
    return { user: null, accessToken: null, refreshToken: null };
  }

  const { accessToken, refreshToken } = await getAuthTokens();

  if (accessToken) {
    const client = createInsforgeServerClient(accessToken);
    const { data, error } = await client.auth.getCurrentUser();

    if (!error && data.user) {
      return { user: data.user, accessToken, refreshToken: refreshToken ?? null };
    }
  }

  if (!refreshToken) {
    if (options?.persist) {
      await clearAuthCookies();
    }
    return { user: null, accessToken: null, refreshToken: null };
  }

  const refreshClient = createInsforgeServerClient();
  const refreshResult = await refreshClient.auth.refreshSession({ refreshToken });

  if (refreshResult.error || !refreshResult.data?.accessToken) {
    if (options?.persist) {
      await clearAuthCookies();
    }
    return { user: null, accessToken: null, refreshToken: null };
  }

  if (options?.persist) {
    await setAuthCookies(
      refreshResult.data.accessToken,
      refreshResult.data.refreshToken
    );
  }

  return {
    user: refreshResult.data.user ?? null,
    accessToken: refreshResult.data.accessToken,
    refreshToken: refreshResult.data.refreshToken ?? refreshToken,
  };
}

export async function getCurrentUser(): Promise<UserSchema | null> {
  const session = await getServerSession();
  return session.user;
}
