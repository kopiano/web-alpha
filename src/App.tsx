import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicPlayer } from "@/components/dashboard/MusicPlayer";
import { AuthProvider } from "@/components/dashboard/AuthProvider";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";
import { VisitorTracker } from "@/components/dashboard/VisitorTracker";
import { OnlineStatusProvider } from "@/components/dashboard/OnlineStatusProvider";

const Index = lazy(() => import("./pages/Index.tsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.tsx"));
const DocsPage = lazy(() => import("./pages/DocsPage.tsx"));
const UserPage = lazy(() => import("./pages/UserPage.tsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.tsx"));
const MapPage = lazy(() => import("./pages/MapPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <OnlineStatusProvider>
            <VisitorTracker />
            <MusicPlayer />
            <Suspense
              fallback={
                <div className="flex min-h-[50vh] items-center justify-center text-white/40">
                  Loading...
                </div>
              }
            >
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
            </Suspense>
          </OnlineStatusProvider>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
