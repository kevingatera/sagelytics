
import { useState, useEffect } from "react";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Code2 } from "lucide-react";

const LOCAL_STORAGE_KEY = "pricewhisperer-dev-mode";

export function DevModeToggle() {
  const [isDevMode, setIsDevMode] = useState(true); // Default to true
  
  useEffect(() => {
    // Get stored value if available
    const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedValue !== null) {
      setIsDevMode(storedValue === "true");
    } else {
      // Default to true and store it
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    }
    
    // Apply dev mode class to body
    document.body.classList.toggle("dev-mode", isDevMode);
  }, []);
  
  const toggleDevMode = () => {
    const newValue = !isDevMode;
    setIsDevMode(newValue);
    localStorage.setItem(LOCAL_STORAGE_KEY, String(newValue));
    document.body.classList.toggle("dev-mode", newValue);
  };
  
  return (
    <div className="flex items-center gap-2">
      <Code2 className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="dev-mode" className="text-xs">Dev Mode</Label>
      <Switch 
        id="dev-mode" 
        checked={isDevMode} 
        onCheckedChange={toggleDevMode}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  );
}
