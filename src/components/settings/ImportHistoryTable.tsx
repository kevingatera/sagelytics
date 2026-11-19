import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { FileText } from 'lucide-react';

// Imports and exports are not recorded yet, so there is no history to list.
export function ImportHistoryTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import/Export History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
          <p className="font-medium">No imports or exports yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Files you import or export will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
