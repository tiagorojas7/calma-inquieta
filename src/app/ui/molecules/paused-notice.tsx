export function PausedNotice({
  text,
  link,
}: {
  text: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md bg-sand-100 p-4">
      <p className="text-ink-700">{text}</p>
      {link ? (
        <a
          href={link.href}
          className="min-h-11 text-clay-800 underline underline-offset-4"
        >
          {link.label}
        </a>
      ) : null}
    </div>
  );
}
