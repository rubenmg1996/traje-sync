import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Empleados from "./pages/Empleados";
import EmpleadoDetalle from "./pages/EmpleadoDetalle";
import Incidencias from "./pages/Incidencias";
import IncidenciaDetalle from "./pages/IncidenciaDetalle";
import Stock from "./pages/Stock";
import Encargos from "./pages/Encargos";
import Facturacion from "./pages/Facturacion";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/empleados"
            element={
              <ProtectedRoute>
                <Layout>
                  <Empleados />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/empleados/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmpleadoDetalle />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidencias"
            element={
              <ProtectedRoute>
                <Layout>
                  <Incidencias />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidencias/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <IncidenciaDetalle />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <Layout>
                  <Stock />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/encargos"
            element={
              <ProtectedRoute>
                <Layout>
                  <Encargos />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/facturacion"
            element={
              <ProtectedRoute>
                <Layout>
                  <Facturacion />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute>
                <Layout>
                  <Configuracion />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
