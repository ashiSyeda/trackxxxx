import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from 'react-redux';
import { store } from './store/store';

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import RoutesPage from "./pages/admin/RoutesPage";
import VehiclesPage from "./pages/admin/VehiclesPage";
import CardsPage from "./pages/admin/CardsPage";
import AccessLogsPage from "./pages/admin/AccessLogsPage";
import PermissionsPage from "./pages/admin/PermissionsPage";
import GPSPage from "./pages/admin/GPSPage";

// User pages
import UserLayout from "./layouts/UserLayout";
import UserDashboard from "./pages/user/UserDashboard";

// Components
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="vehicles" element={<VehiclesPage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="access-logs" element={<AccessLogsPage />} />
              <Route path="permissions" element={<PermissionsPage />} />
              <Route path="gps" element={<GPSPage />} />
            </Route>

            {/* User routes */}
            <Route
              path="/user"
              element={
                <ProtectedRoute allowedRole="user">
                  <UserLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserDashboard />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
