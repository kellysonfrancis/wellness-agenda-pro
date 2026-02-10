import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import Servicos from "./pages/Servicos";
import Pacotes from "./pages/Pacotes";
import Configuracoes from "./pages/Configuracoes";
import BI from "./pages/BI";
import ClientBooking from "./pages/ClientBooking";
import ClientAppointments from "./pages/ClientAppointments";
import ClientPackages from "./pages/ClientPackages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/pacotes" element={<Pacotes />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/bi" element={<BI />} />
            <Route path="/agendar" element={<ClientBooking />} />
            <Route path="/meus-agendamentos" element={<ClientAppointments />} />
            <Route path="/meus-pacotes" element={<ClientPackages />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
