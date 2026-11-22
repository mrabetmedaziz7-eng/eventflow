"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Role } from "@/types/api";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && user) {
      if (user.status === "EN_ATTENTE") {
        router.push("/pending");
        return;
      }
      if (user.status !== "ACTIF") {
        router.push("/access-denied");
        return;
      }
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push("/access-denied");
      }
    }
  }, [status, user, allowedRoles, router]);

  if (status === "loading") {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (status === "anonymous") return null;

  if (user?.status !== "ACTIF") return null;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

