import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  roles?: AppRole[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, loading, isRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0 && !isRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
