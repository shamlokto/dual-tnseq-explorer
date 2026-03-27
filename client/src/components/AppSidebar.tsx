import { Link, useLocation } from "wouter";
import { Sun, Moon, ScatterChart } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";

export default function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center" data-testid="logo">
            <ScatterChart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight" data-testid="text-app-title">Dual Tn-seq</div>
            <div className="text-xs text-muted-foreground leading-tight">Explorer</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>About</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground/80">S. pneumoniae D39</p>
              <p>Genetic Interaction Atlas from dual transposon sequencing.</p>
              <p className="italic">Zik et al., Science 389, eadt7685 (2025)</p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="w-full justify-start gap-2 text-muted-foreground"
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-xs">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
