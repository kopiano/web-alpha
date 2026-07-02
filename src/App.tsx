import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicPlayer } from "@/components/dashboard/MusicPlayer";
import { AuthProvider } from "@/components/dashboard/AuthProvider";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";
import { VisitorTracker } from "@/components/dashboard/VisitorTracker";
import Index from "./pages/Index.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import DocsPage from "./pages/DocsPage.tsx";
import UserPage from "./pages/UserPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import MapPage from "./pages/MapPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <VisitorTracker />
            <MusicPlayer />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/user" element={<UserPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/map" element={<MapPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
