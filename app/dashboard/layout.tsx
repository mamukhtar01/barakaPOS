"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/ClientProvider";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
