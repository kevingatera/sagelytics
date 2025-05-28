
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ImportModal } from "~/components/shared/ImportModal";
import { Globe, Upload, Plus } from "lucide-react";
import { Switch } from "~/components/ui/switch";

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompetitor: (competitor: any) => void;
}

export function AddCompetitorModal({ isOpen, onClose, onAddCompetitor }: AddCompetitorModalProps) {
  const [activeTab, setActiveTab] = useState("single");
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    autoScan: true,
    scanFrequency: "daily",
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, autoScan: checked }));
  };

  const handleSubmit = () => {
    // Simple validation
    if (!formData.name || !formData.website) {
      // Show error
      return;
    }

    onAddCompetitor({
      ...formData,
      id: `COMP-${Math.floor(Math.random() * 10000)}`,
    });

    // Reset form and close
    setFormData({
      name: "",
      website: "",
      autoScan: true,
      scanFrequency: "daily",
      notes: ""
    });
    onClose();
  };

  const handleImport = (importedCompetitors: any[]) => {
    // Handle the imported competitors
    console.log("Imported competitors:", importedCompetitors);
    setShowImportModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Competitor</DialogTitle>
            <DialogDescription>
              Add a competitor website to monitor for pricing and product information
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="single">Single Competitor</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="py-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Competitor Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="e.g. Example Store" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input 
                    id="website" 
                    name="website" 
                    value={formData.website} 
                    onChange={handleChange} 
                    placeholder="e.g. https://www.example.com" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the competitor's website URL to monitor their products and pricing
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Automatic Scanning</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically scan this website for product updates
                    </p>
                  </div>
                  <Switch 
                    checked={formData.autoScan} 
                    onCheckedChange={handleSwitchChange} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input 
                    id="notes" 
                    name="notes" 
                    value={formData.notes} 
                    onChange={handleChange} 
                    placeholder="Additional notes about this competitor" 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="py-4">
              <div className="text-center py-8">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Bulk Import Competitors</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Upload a CSV or Excel file with multiple competitor websites
                </p>
                <Button onClick={() => setShowImportModal(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File to Import
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {activeTab === "single" && (
              <Button onClick={handleSubmit}>
                <Plus className="mr-2 h-4 w-4" />
                Add Competitor
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        type="competitors"
        onImport={handleImport}
      />
    </>
  );
}
