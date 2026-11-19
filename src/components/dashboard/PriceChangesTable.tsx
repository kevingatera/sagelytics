'use client';

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ArrowDown, ArrowUp, Globe, AlertCircle } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { usePriceDashboard } from "./usePriceDashboard";

function PriceChangesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[180px]" />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PriceChangesTable() {
  const { data, isLoading, error } = usePriceDashboard(90);

  if (isLoading) {
    return <PriceChangesTableSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Price Changes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-6 w-6 mb-2" />
            <p className="text-sm">Unable to load price data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { changes } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Price Changes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Recorded price moves on monitored competitor products
        </p>
      </CardHeader>
      <CardContent>
        {changes.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Previous Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map((change) => (
                  <TableRow key={change.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{change.competitorDomain}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={change.productName}>
                      {change.productName}
                    </TableCell>
                    <TableCell>
                      {change.currency} {change.previousPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {change.currency} {change.price.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${change.changePercentage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <div className="flex items-center justify-end">
                        {change.changePercentage > 0 ? (
                          <>
                            <ArrowUp className="h-4 w-4 mr-1" />
                            +{change.changePercentage.toFixed(1)}%
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-4 w-4 mr-1" />
                            {change.changePercentage.toFixed(1)}%
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Globe className="mx-auto h-8 w-8 mb-4" />
              <p className="text-sm">No price changes recorded yet</p>
              <p className="text-xs mt-1">
                {data.competitors.length === 0
                  ? "Changes appear once a monitored competitor price moves"
                  : "Changes appear after a monitored competitor price moves between checks"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
