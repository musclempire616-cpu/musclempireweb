import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { hasValidSession } from "@/lib/adminAuth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    hasValidSession().then((valid) => {
      if (!mounted) return;
      if (!valid) {
        navigate("/sagarkharat");
      } else {
        setChecked(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!checked) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return <>{children}</>;
}
