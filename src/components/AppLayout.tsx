import logo from "../../images/alteon-logo.png";
import { useLocation } from "wouter";
import { lazy, Suspense, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/AppStateContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LazyDock = lazy(() =>
  import("@/components/OptimizedDock").then(({ OptimizedDock }) => ({ default: OptimizedDock })),
);
const LazySidebar = lazy(() =>
  import("@/components/Sidebar").then(({ Sidebar }) => ({ default: Sidebar })),
);

function AppNavigation() {
  const { user, signOut, hasGoogleAccess } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <nav className="bg-background/80 backdrop-blur-sm border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Alteon Logo" className="h-5 w-5 object-contain" />
            <span className="text-lg font-medium text-foreground">Alteon</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user && (
            <div className="flex items-center space-x-3">
              <div
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-full text-xs ${
                  hasGoogleAccess
                    ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasGoogleAccess ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                {hasGoogleAccess ? "Connected" : "Offline"}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 px-2 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                      <AvatarFallback className="text-xs">
                        {user.displayName?.split(" ").map((name) => name[0]).join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-light text-sm">{user.displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setLocation("/settings")} className="text-sm">
                    Settings
                  </DropdownMenuItem>
                  {!hasGoogleAccess && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-sm text-primary font-medium"
                        onClick={() => setLocation("/auth")}
                      >
                        Connect Google
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-sm">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const navigationStyle = preferences.navigationStyle;

  return (
    <div className="h-screen flex flex-col">
      <AppNavigation />
      <div className="flex flex-1 overflow-hidden">
        {navigationStyle === "sidebar" && (
          <Suspense fallback={null}>
            <LazySidebar />
          </Suspense>
        )}
        <main
          className={`flex-1 p-8 overflow-y-auto bg-background ${
            navigationStyle === "dock" ? "pb-32" : "pb-8"
          }`}
        >
          {children}
        </main>
      </div>
      {navigationStyle === "dock" && (
        <Suspense fallback={null}>
          <LazyDock />
        </Suspense>
      )}
    </div>
  );
}
