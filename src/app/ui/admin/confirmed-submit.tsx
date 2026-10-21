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
  fields,
  buttonName,
}: {
  intent: string;
  label: string;
  title: string;
  message: string;
  tone?: "default" | "destructive";
  /** Extra hidden fields, such as the id of the row the action is about. */
  fields?: Readonly<Record<string, string>>;
  /** Accessible name of the opening button when the label alone is ambiguous. */
  buttonName?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} method="post">
      <input type="hidden" name="intent" value={intent} />
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button
        type="button"
        variant="outline"
        aria-label={buttonName}
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
