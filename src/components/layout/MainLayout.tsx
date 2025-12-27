import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-18 glass sticky top-0 z-10 border-b border-border/20">
            <div className="h-full px-8 py-4 flex items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <SidebarTrigger className="lg:hidden p-2 rounded-xl hover:bg-muted/50 transition-colors">
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </SidebarTrigger>
                {title && (
                  <h1 className="font-display text-2xl text-foreground tracking-tight">{title}</h1>
                )}
              </div>

              <div className="flex items-center gap-5">
                {/* Search */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    placeholder="검색..."
                    className="w-80 pl-11 py-5 bg-white/50 border-border/30 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/40 transition-all duration-200 placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* Notifications */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative rounded-2xl w-11 h-11 hover:bg-white/60 transition-all duration-200"
                >
                  <Bell className="h-5 w-5" strokeWidth={1.5} />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto smooth-scroll">
            <div className="animate-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}