import { useLocation } from "wouter";
import { Dock, DockIcon } from "@/components/ui/dock";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  StickyNote,
  Wrench,
  Bot,
  BarChart3,
  Target,
  CheckCircle,
} from "lucide-react";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/assignments", label: "Assignments", icon: BookOpen },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/habits", label: "Habits", icon: CheckCircle },
  { href: "/ai-chat", label: "AI Chatbot", icon: Bot },
  { href: "/learn", label: "Learn", icon: Wrench },
];

export const DockNavigation = () => {
  const [location, setLocation] = useLocation();

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <Dock
        className="bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3"
        iconSize={32}
        iconMagnification={40}
        iconDistance={100}
        direction="bottom"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <DockIcon
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={cn(
                "transition-all duration-200 cursor-pointer",
                isActive 
                  ? "text-white" 
                  : "text-white/60"
              )}
              size={32}
              magnification={40}
              distance={100}
            >
              <Icon className="w-6 h-6" />
            </DockIcon>
          );
        })}
      </Dock>
    </div>
  );
};
