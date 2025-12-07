"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnalysisModalProps {
  modelName: string | null;
  onClose: () => void;
}

export function AnalysisModal({ modelName, onClose }: AnalysisModalProps) {
  return (
    <Dialog open={modelName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lexical Analysis — {modelName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Lexical analysis coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
