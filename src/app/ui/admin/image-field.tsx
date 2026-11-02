import { useId, useState } from "react";
import { adminButtonClasses } from "./admin-button";
import { TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.imageField;

export interface StoredImageView {
  readonly id: string;
  readonly src: string;
}

export type ImageFieldFailure = keyof typeof copy.errors;

export type ImageFieldUpload = (
  file: File,
) => Promise<
  | { readonly ok: true; readonly image: StoredImageView }
  | { readonly ok: false; readonly error: ImageFieldFailure }
>;

interface Chosen {
  readonly assetId: string;
  readonly src: string;
  readonly alt: string;
}

/**
 * File input for one image. The browser-side resize and the network call are
 * injected through `upload`, so this stays presentational. It submits the
 * stored asset as `<name>AssetId`, its preview source as `<name>Src`, and its
 * required alt text as `<name>Alt`.
 */
export function ImageField({
  name,
  label,
  upload,
  current,
}: {
  name: string;
  label: string;
  upload: ImageFieldUpload;
  current?: Chosen | undefined;
}) {
  const inputId = useId();
  const [chosen, setChosen] = useState<Chosen | undefined>(current);
  const [error, setError] = useState<ImageFieldFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onChange(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    setError(null);
    const result = await upload(file);
    setBusy(false);
    if (result.ok)
      setChosen({ assetId: result.image.id, src: result.image.src, alt: "" });
    else setError(result.error);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="font-semibold text-ink-900">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`${adminButtonClasses.success} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-clay-800 ${busy ? "opacity-60" : ""}`}
        >
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(event) => {
              void onChange(event.target.files?.[0]);
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span aria-hidden="true">{copy.choose}</span>
        </span>
        <span className="min-w-0 break-all text-base text-ink-700">
          {fileName ?? copy.noneChosen}
        </span>
      </div>
      {busy && <p role="status">{copy.uploading}</p>}
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-sm text-terracotta-700"
        >
          {copy.errors[error]}
        </p>
      )}
      {chosen && (
        <>
          <img
            src={chosen.src}
            alt={copy.previewAlt}
            className="max-h-48 w-auto rounded-sm"
          />
          <input type="hidden" name={`${name}AssetId`} value={chosen.assetId} />
          <input type="hidden" name={`${name}Src`} value={chosen.src} />
          <TextField
            key={chosen.assetId}
            label={copy.altLabel}
            hint={copy.altHint}
            name={`${name}Alt`}
            defaultValue={chosen.alt}
          />
        </>
      )}
    </div>
  );
}
