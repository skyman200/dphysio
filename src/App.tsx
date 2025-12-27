import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageLoading } from "@/components/ui/PageLoading";

// Immediately loaded pages (critical path)
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const DepartmentCalendarPage = lazy(() => import("./pages/DepartmentCalendarPage"));
const ProfessorCalendarPage = lazy(() => import("./pages/ProfessorCalendarPage"));
const MeetingsPage = lazy(() => import("./pages/MeetingsPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfileSetupPage = lazy(() => import("./pages/ProfileSetupPage"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));

const queryClient = new QueryClient();
import { GlobalErrorBoundary } from "@/components/common/GlobalErrorBoundary";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <VoiceProvider>
          <Toaster />
          <Sonner />
          <GlobalErrorBoundary>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/department-calendar" element={<ProtectedRoute><DepartmentCalendarPage /></ProtectedRoute>} />
                  <Route path="/professor-calendar" element={<ProtectedRoute><ProfessorCalendarPage /></ProtectedRoute>} />
                  <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
                  <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
                  <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
                  <Route path="/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </GlobalErrorBoundary>
        </VoiceProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;