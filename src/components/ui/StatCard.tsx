import { cn } from "~/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

const cardVariants = cva(
  "p-6 rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      trend: {
        up: "border-l-4 border-l-success",
        down: "border-l-4 border-l-danger",
        neutral: "border-l-4 border-l-muted",
      },
    },
    defaultVariants: {
      trend: "neutral",
    },
  }
);

export interface StatCardProps extends VariantProps<typeof cardVariants> {
  title: string;
  value: string;
  change?: number;
  className?: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend,
  className,
  icon,
  subtitle,
}: StatCardProps) {
  const trendColor = 
    trend === "up" ? "text-success" : 
    trend === "down" ? "text-danger" : 
    "text-muted-foreground";

  return (
    <div className={cn(cardVariants({ trend }), className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="flex items-baseline">
        <h3 className="text-2xl font-bold">{value}</h3>
        {change !== undefined && (
          <div className={cn("ml-2 flex items-center text-sm", trendColor)}>
            {change > 0 ? (
              <>
                <ArrowUpIcon className="h-3 w-3 mr-1" />
                {change}%
              </>
            ) : change < 0 ? (
              <>
                <ArrowDownIcon className="h-3 w-3 mr-1" />
                {Math.abs(change)}%
              </>
            ) : (
              <>0%</>
            )}
          </div>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
