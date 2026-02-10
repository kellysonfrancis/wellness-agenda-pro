import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "./AppSidebar";
import RealtimeNotifications from "./RealtimeNotifications";
import { Navigate } from "react-router-dom";
interface GlobalLayoutProps {
  children: React.ReactNode;
}
export default function GlobalLayout({
  children
}: GlobalLayoutProps) {
  const {
    user
  } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 md:ml-0 bg-neutral-100">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <div className="flex justify-end mb-4">
            <RealtimeNotifications />
          </div>
          {children}
        </div>
      </main>
    </div>;
}