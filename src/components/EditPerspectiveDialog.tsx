import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditPerspectiveDialogProps {
  perspective: string | null;
  onClose: () => void;
  onApply: (perspective: string, editPrompt: string) => void;
  isLoading?: boolean;
}

export function EditPerspectiveDialog({
  perspective,
  onClose,
  onApply,
  isLoading = false,
}: EditPerspectiveDialogProps) {
  const [editPrompt, setEditPrompt] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setEditPrompt("");
    }
  };

  const handleApply = () => {
    if (editPrompt.trim() && perspective) {
      onApply(perspective, editPrompt.trim());
      setEditPrompt("");
    }
  };

  const perspectiveName = perspective
    ? perspective.charAt(0).toUpperCase() + perspective.slice(1)
    : "";

  return (
    <Dialog open={!!perspective} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {perspectiveName} View</DialogTitle>
          <DialogDescription>
            What would you like to change?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-prompt">Modifications</Label>
            <Textarea
              id="edit-prompt"
              placeholder="e.g., Make it brighter, change the color to blue, add more detail..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setEditPrompt("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!editPrompt.trim() || isLoading}
          >
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
