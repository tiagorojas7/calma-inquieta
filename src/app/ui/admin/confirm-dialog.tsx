import { useEffect, useId, useRef } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading, Text } from "../atoms/heading";
import { adminMicrocopy } from "./microcopy";

/**
 * Confirmation for archive, pause, cancel, retire and delete. Nothing happens
 * until `onConfirm`; Escape and the cancel button call `onCancel`. The parent
 * owns `open`, so the dialog follows the same native `<dialog>` pattern as the
 * gallery. A destructive tone starts with focus on the safe choice.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const isOpen = dialog.hasAttribute("open");
    if (open && !isOpen) {
      dialog.showModal();
      if (tone === "destructive")
        dialog.querySelector<HTMLElement>("[data-cancel]")?.focus();
    } else if (!open && isOpen) {
      dialog.close();
    }
  }, [open, tone]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2.5rem))] rounded-md bg-surface p-6 shadow-card"
    >
      <Heading level={2} size="h3" id={titleId}>
        {title}
      </Heading>
      <Text className="mt-2">{message}</Text>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button data-cancel type="button" variant="outline" onClick={onCancel}>
          {adminMicrocopy.confirm.cancel}
        </Button>
        <Button type="button" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
