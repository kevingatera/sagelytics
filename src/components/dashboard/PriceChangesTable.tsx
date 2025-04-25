'use client';

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";

// Sample data for price changes
const priceChanges = [
  { id: 1, competitor: "Amazon", product: "Wireless Headphones", oldPrice: 49.99, newPrice: 54.99, change: 10.0 },
  { id: 2, competitor: "Walmart", product: "Bluetooth Speaker", oldPrice: 29.99, newPrice: 27.99, change: -6.7 },
  { id: 3, competitor: "eBay", product: "Smart Watch", oldPrice: 99.99, newPrice: 109.99, change: 10.0 },
  { id: 4, competitor: "Best Buy", product: "USB-C Cable", oldPrice: 9.99, newPrice: 8.99, change: -10.0 },
  { id: 5, competitor: "Target", product: "Wireless Mouse", oldPrice: 19.99, newPrice: 22.99, change: 15.0 },
];

export function PriceChangesTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Price Changes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Old Price</TableHead>
                <TableHead>New Price</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceChanges.map((change) => (
                <TableRow key={change.id}>
                  <TableCell className="font-medium">{change.competitor}</TableCell>
                  <TableCell>{change.product}</TableCell>
                  <TableCell>${change.oldPrice.toFixed(2)}</TableCell>
                  <TableCell>${change.newPrice.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-medium ${change.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center justify-end">
                      {change.change > 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                      {change.change.toFixed(1)}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 