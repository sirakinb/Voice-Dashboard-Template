"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DataChat } from "./data-chat";
import { useDemoMode } from "@/lib/demo-context";
import { useAuthState } from "@/lib/auth-context";
import { signOutAction } from "@/lib/insforge/actions";
import { templateConfig } from "@/lib/template-config";

const navItems = templateConfig.navigation;

function getDisplayName(
  user: ReturnType<typeof useAuthState>["user"]
): string {
  const profileName =
    typeof user?.profile?.name === "string" ? user.profile.name.trim() : "";
  const metadataName =
    typeof user?.metadata?.name === "string" ? user.metadata.name.trim() : "";
  const emailName = user?.email?.split("@")[0]?.trim() ?? "";

  return profileName || metadataName || emailName || "User";
}

export function Sidebar() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const { user, setUser } = useAuthState();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setMenuOpen(false);
    setUser(null);
    await signOutAction();
  };

  const displayName = getDisplayName(user);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  return (
    <aside className="glass-sidebar hidden h-full w-80 flex-col overflow-y-auto lg:flex">
      <div className="flex items-center px-7 py-7">
        <Image
          src={templateConfig.brand.logoSrc}
          alt={templateConfig.brand.companyName}
          width={180}
          height={60}
          className="h-14 w-auto object-contain"
          priority
        />
      </div>

      <nav className="flex-1 px-5 pb-32">
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left text-sm font-medium transition ${
                  isActive
                    ? "glass-chip text-white shadow-lg"
                    : "text-jackson-charcoal hover:bg-jackson-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-4 pb-6">
        <div className="space-y-3">
          <DataChat />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="glass-panel flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:border-jackson-green/30"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-jackson-green text-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="10"
                    cy="7"
                    r="3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3.5 17C4.5 13.5 7 11.5 10 11.5C13 11.5 15.5 13.5 16.5 17"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-jackson-charcoal capitalize">
                  {displayName}
                </p>
              </div>

              <svg
                className={`h-4 w-4 flex-shrink-0 transform text-jackson-text-muted transition ${
                  menuOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menuOpen && (
              <div className="glass-card absolute bottom-[calc(100%+8px)] left-0 right-0 z-10 min-w-[260px] rounded-2xl py-2 text-jackson-charcoal shadow-2xl">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-jackson-text-muted">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="10"
                        cy="7"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M4.5 16C5.22 13.89 7.42 12.5 10 12.5C12.58 12.5 14.78 13.89 15.5 16"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Account
                  </div>
                  <p className="mt-2 break-all text-sm font-medium text-jackson-charcoal">
                    {user?.email || "No active session"}
                  </p>
                </div>

                <div className="glass-divider my-2" />

                <div className="px-2 pb-1">
                  <button
                    type="button"
                    onClick={toggleDemoMode}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-jackson-charcoal transition hover:bg-jackson-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="h-5 w-5 text-jackson-text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Demo Mode</span>
                    </div>
                    <div
                      className={`h-5 w-9 rounded-full transition ${
                        isDemoMode ? "bg-jackson-green" : "bg-jackson-cream-dark"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform ${
                          isDemoMode ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </button>
                </div>

                <div className="glass-divider my-2" />

                <div className="px-2 pb-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-jackson-charcoal transition hover:bg-jackson-white/10 disabled:opacity-50"
                  >
                    {isLoggingOut ? (
                      <svg
                        className="h-5 w-5 animate-spin text-jackson-text-muted"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-jackson-text-muted"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 5.5V4.5C9 3.67 9.67 3 10.5 3H15.5C16.33 3 17 3.67 17 4.5V15.5C17 16.33 16.33 17 15.5 17H10.5C9.67 17 9 16.33 9 15.5V14.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4 10H11"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.5 7.5L4 10L6.5 12.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    <span className="text-jackson-charcoal">
                      {isLoggingOut ? "Signing out..." : "Log out"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
