import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicPlayer } from "@/components/dashboard/MusicPlayer";
import { AuthProvider } from "@/components/dashboard/AuthProvider";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";
import { VisitorTracker } from "@/components/dashboard/VisitorTracker";
import { OnlineStatusProvider } from "@/components/dashboard/OnlineStatusProvider";
import { Provider } from "react-redux";
import { store } from "@/store";

const Index = lazy(() => import("./pages/Index.tsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.tsx"));
const DocsPage = lazy(() => import("./pages/DocsPage.tsx"));
const UserPage = lazy(() => import("./pages/UserPage.tsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.tsx"));
const MapPage = lazy(() => import("./pages/MapPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
    </div>
  );
}

const preloadRoutes = () => {
  void import("./pages/Index.tsx");
  void import("./pages/ChatPage.tsx");
  void import("./pages/DocsPage.tsx");
  void import("./pages/UserPage.tsx");
  void import("./pages/AnalyticsPage.tsx");
  void import("./pages/MapPage.tsx");
  void import("./pages/NotFound.tsx");
};

const App = () => {
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    const isWindows = platform.includes("win") || ua.includes("windows");
    document.documentElement.dataset.os = isWindows ? "windows" : "mac";

    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => preloadRoutes())
      : window.setTimeout(preloadRoutes, 800);

    return () => {
      if (typeof schedule === "number") {
        window.clearTimeout(schedule);
      } else {
        window.cancelIdleCallback?.(schedule);
      }
    };
  }, []);

  return (
    <Provider store={store}>
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
                fallback={<RouteLoadingFallback />}
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
    </Provider>
  );
};

export default App;
