import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import Servicos from "./pages/Servicos";
import Pacotes from "./pages/Pacotes";
import Configuracoes from "./pages/Configuracoes";
import BI from "./pages/BI";
import Despesas from "./pages/Despesas";
import Usuarios from "./pages/Usuarios";
import Categorias from "./pages/Categorias";
import Profissionais from "./pages/Profissionais";
import ClientBooking from "./pages/ClientBooking";
import ClientAppointments from "./pages/ClientAppointments";
import ClientPackages from "./pages/ClientPackages";
import ClientEvolution from "./pages/ClientEvolution";
import Comissoes from "./pages/Comissoes";
import VendaRapida from "./pages/VendaRapida";
import Inadimplencia from "./pages/Inadimplencia";
import TaxaOcupacao from "./pages/TaxaOcupacao";
import Churn from "./pages/Churn";
import ProjecaoReceita from "./pages/ProjecaoReceita";
import Prontuario from "./pages/Prontuario";
import ListaEspera from "./pages/ListaEspera";
import Produtividade from "./pages/Produtividade";
import WhatsAppHistorico from "./pages/WhatsAppHistorico";
import AgendarPublico from "./pages/AgendarPublico";
import AssistenteIA from "./pages/AssistenteIA";
import Estoque from "./pages/Estoque";
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
            <Route path="/agendar-publico" element={<AgendarPublico />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute roles={["admin", "recepcao", "profissional"]}><Agenda /></ProtectedRoute>} />
            <Route path="/venda-rapida" element={<ProtectedRoute roles={["admin", "recepcao", "profissional"]}><VendaRapida /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute roles={["admin", "recepcao"]}><Clientes /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute roles={["admin", "recepcao"]}><Financeiro /></ProtectedRoute>} />
            <Route path="/servicos" element={<ProtectedRoute roles={["admin"]}><Servicos /></ProtectedRoute>} />
            <Route path="/pacotes" element={<ProtectedRoute roles={["admin"]}><Pacotes /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute roles={["admin"]}><Configuracoes /></ProtectedRoute>} />
            <Route path="/bi" element={<ProtectedRoute roles={["admin"]}><BI /></ProtectedRoute>} />
            <Route path="/despesas" element={<ProtectedRoute roles={["admin"]}><Despesas /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute roles={["admin"]}><Usuarios /></ProtectedRoute>} />
            <Route path="/categorias" element={<ProtectedRoute roles={["admin"]}><Categorias /></ProtectedRoute>} />
            <Route path="/profissionais" element={<ProtectedRoute roles={["admin"]}><Profissionais /></ProtectedRoute>} />
            <Route path="/comissoes" element={<ProtectedRoute roles={["admin"]}><Comissoes /></ProtectedRoute>} />
            <Route path="/inadimplencia" element={<ProtectedRoute roles={["admin"]}><Inadimplencia /></ProtectedRoute>} />
            <Route path="/taxa-ocupacao" element={<ProtectedRoute roles={["admin"]}><TaxaOcupacao /></ProtectedRoute>} />
            <Route path="/churn" element={<ProtectedRoute roles={["admin"]}><Churn /></ProtectedRoute>} />
            <Route path="/projecao-receita" element={<ProtectedRoute roles={["admin"]}><ProjecaoReceita /></ProtectedRoute>} />
            <Route path="/prontuario" element={<ProtectedRoute roles={["admin", "profissional"]}><Prontuario /></ProtectedRoute>} />
            <Route path="/lista-espera" element={<ProtectedRoute roles={["admin", "recepcao"]}><ListaEspera /></ProtectedRoute>} />
            <Route path="/produtividade" element={<ProtectedRoute roles={["admin"]}><Produtividade /></ProtectedRoute>} />
            <Route path="/whatsapp-historico" element={<ProtectedRoute roles={["admin"]}><WhatsAppHistorico /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute roles={["admin", "recepcao"]}><Estoque /></ProtectedRoute>} />
            <Route path="/agendar" element={<ProtectedRoute roles={["cliente"]}><ClientBooking /></ProtectedRoute>} />
            <Route path="/meus-agendamentos" element={<ProtectedRoute roles={["cliente"]}><ClientAppointments /></ProtectedRoute>} />
            <Route path="/meus-pacotes" element={<ProtectedRoute roles={["cliente"]}><ClientPackages /></ProtectedRoute>} />
            <Route path="/minha-evolucao" element={<ProtectedRoute roles={["cliente"]}><ClientEvolution /></ProtectedRoute>} />
            <Route path="/assistente" element={<ProtectedRoute roles={["cliente"]}><AssistenteIA /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
