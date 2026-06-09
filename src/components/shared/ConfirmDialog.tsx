"use client";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  requireText?: string;
}

export function ConfirmDialog({
  open, onOpenChange, title, description, onConfirm,
  loading, confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  variant = "default", requireText,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  function handleOpenChange(v: boolean) {
    if (!v) setTyped("");
    onOpenChange(v);
  }

  const canConfirm = !requireText || typed === requireText;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireText && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Escribe <span className="font-mono font-semibold text-destructive">{requireText}</span> para confirmar:
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              className="font-mono"
              autoFocus
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading || !canConfirm}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
