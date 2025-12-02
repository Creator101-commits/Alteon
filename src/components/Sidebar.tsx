import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  Wrench,
  Bot,
  BarChart3,
  StickyNote,
} from "lucide-react";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/assignments", label: "Assignments", icon: BookOpen },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/learn", label: "Learn", icon: Wrench },
  { href: "/ai-chat", label: "AI Chatbot", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export const Sidebar = () => {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-background p-4 h-full">
      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex items-center space-x-3 p-2.5 rounded-md notion-hover transition-all duration-200 text-sm font-medium",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
