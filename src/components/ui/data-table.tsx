import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "~/components/ui/table";
import { useIsMobile } from "~/hooks/use-mobile";
import { Card, CardContent } from "~/components/ui/card";

interface DataTableColumn<TData> {
  accessorKey?: keyof TData;
  header?: string;
  cell?: ({ row }: { row: { original: TData } }) => React.ReactNode;
  id?: string;
}

interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
}

export function DataTable<TData>({
  columns,
  data
}: DataTableProps<TData>) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="space-y-4">
        {data.map((row, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              {columns.map((column, j) => {
                const key = column.accessorKey;
                if (column.id === "actions") {
                  return (
                    <div key={`${i}-${j}-actions`} className="mt-3 flex justify-end">
                      {column.cell?.({ row: { original: row } })}
                    </div>
                  );
                }
                
                if (!key || !column.header) return null;
                
                const value = row[key];
                return (
                  <div key={`${i}-${j}`} className="flex justify-between py-2 border-b last:border-0">
                    <span className="font-medium text-sm">{column.header}</span>
                    <span className="text-sm">
                      {column.cell 
                        ? column.cell({ row: { original: row } }) 
                        : String(value)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, i) => (
              <TableHead key={i}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((column, j) => {
                const key = column.accessorKey;
                const cell = column.cell;
                return (
                  <TableCell key={`${i}-${j}`}>
                    {cell
                      ? cell({ row: { original: row } })
                      : key ? String(row[key]) : null}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
