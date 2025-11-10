import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Strategy {
  id: string;
  name: string;
  description: string;
  checklist: { label: string; required: boolean }[];
}

interface StrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy?: Strategy;
  onSave: (strategy: Omit<Strategy, "id">) => void;
}

export const StrategyDialog = ({ open, onOpenChange, strategy, onSave }: StrategyDialogProps) => {
  const [name, setName] = useState(strategy?.name || "");
  const [description, setDescription] = useState(strategy?.description || "");
  const [checklist, setChecklist] = useState<{ label: string; required: boolean }[]>(
    strategy?.checklist || [{ label: "", required: false }]
  );

  const handleAddChecklistItem = () => {
    setChecklist([...checklist, { label: "", required: false }]);
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleChecklistChange = (index: number, field: "label" | "required", value: string | boolean) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], [field]: value };
    setChecklist(updated);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      description,
      checklist: checklist.filter(item => item.label.trim() !== ""),
    });
    onOpenChange(false);
    // Reset form
    setName("");
    setDescription("");
    setChecklist([{ label: "", required: false }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{strategy ? "Edit Strategy" : "Create Strategy"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Strategy Name</Label>
            <Input
              id="name"
              placeholder="e.g., Breakout Pullback"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your strategy rules and conditions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pre-Trade Checklist</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddChecklistItem}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Checklist item"
                    value={item.label}
                    onChange={(e) => handleChecklistChange(index, "label", e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={item.required}
                      onCheckedChange={(checked) => 
                        handleChecklistChange(index, "required", checked as boolean)
                      }
                    />
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Required</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChecklistItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {strategy ? "Update" : "Create"} Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
