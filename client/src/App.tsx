import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import GeneDetail from "@/pages/GeneDetail";
import GenePairDetail from "@/pages/GenePairDetail";
import ScatterPlot from "@/pages/ScatterPlot";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { ThemeProvider } from "@/components/ThemeProvider";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={ScatterPlot} />
      <Route path="/gene/:locusId" component={GeneDetail} />
      <Route path="/pair/:gene1/:gene2" component={GenePairDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <main className="flex-1 overflow-auto">
                  <AppRouter />
                </main>
                <footer className="border-t border-border px-6 py-3 text-center">
                  <PerplexityAttribution />
                </footer>
              </SidebarInset>
            </SidebarProvider>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
