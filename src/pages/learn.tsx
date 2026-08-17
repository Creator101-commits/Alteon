import { PomodoroTimer } from "@/components/tools/PomodoroTimer";
import { AiSummaryHistory } from "@/components/tools/AiSummaryHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Bot } from "lucide-react";

const tools = [
  {
    id: "pomodoro",
    title: "Pomodoro Timer",
    icon: Clock,
    component: PomodoroTimer,
  },
  {
    id: "ai-summaries",
    title: "AI Summaries",
    icon: Bot,
    component: AiSummaryHistory,
  },
] as const;

export default function Learn() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Study Tools</h1>
        <p className="text-sm text-muted-foreground">
          Tools to help you study better and stay focused
        </p>
      </div>

      <Tabs defaultValue="pomodoro" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <TabsTrigger key={tool.id} value={tool.id} className="text-xs">
                <Icon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{tool.title.split(' ')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tools.map((tool) => {
          const Component = tool.component;
          return (
            <TabsContent key={tool.id} value={tool.id}>
              <Component />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
