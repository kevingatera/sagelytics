
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ArrowRight, BrainCircuit, ChevronRight, Lightbulb, LineChart, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";

interface InsightCardProps {
  title: string;
  description: string;
  type: "pricing" | "competitor" | "opportunity" | "alert";
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  insights: string[];
}

export function InsightCard({
  title,
  description,
  type,
  actionLabel = "View Details",
  onAction,
  className,
  insights,
}: InsightCardProps) {
  const typeConfig = {
    pricing: {
      icon: <LineChart className="h-4 w-4" />,
      color: "text-brand-600 bg-brand-50",
    },
    competitor: {
      icon: <BrainCircuit className="h-4 w-4" />,
      color: "text-blue-600 bg-blue-50",
    },
    opportunity: {
      icon: <Lightbulb className="h-4 w-4" />,
      color: "text-amber-600 bg-amber-50",
    },
    alert: {
      icon: <Sparkles className="h-4 w-4" />,
      color: "text-rose-600 bg-rose-50",
    },
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn("gap-1 px-2 py-1 font-normal", typeConfig[type].color)}
          >
            {typeConfig[type].icon}
            <span className="capitalize">{type}</span>
          </Badge>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-lg mt-3">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground">{description}</p>
        <ul className="mt-4 space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className="min-w-4 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-500"></div>
              </div>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto pt-2">
        <Button variant="ghost" className="w-full justify-between" onClick={onAction}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
