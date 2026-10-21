import { useRef, useState } from "react";
import { Button } from "../atoms/button";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * A native post form whose button asks first. Confirming submits the form
 * with `requestSubmit`, so the request is still a document post (the Worker
 * gate refuses the `.data` requests a router submit would make).
 */
export function ConfirmedSubmit({
  intent,
  label,
  title,
  message,
  tone = "default",
}: {
  intent: string;
  label: string;
  title: string;
  message: string;
  tone?: "default" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} method="post">
      <input type="hidden" name="intent" value={intent} />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={label}
        tone={tone}
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}
