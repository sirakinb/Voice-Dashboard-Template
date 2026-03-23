"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { UserSchema } from "@insforge/sdk";

type AuthContextValue = {
  user: UserSchema | null;
  setUser: Dispatch<SetStateAction<UserSchema | null>>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: UserSchema | null;
}) {
  const [user, setUser] = useState<UserSchema | null>(initialUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAuthenticated: Boolean(user) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthState must be used within an AuthProvider");
  }

  return context;
}
