import { microcopy } from "../microcopy";

/**
 * Who guides it, on a listing card: the label "Profesora:" in small sans, the
 * name in the display italic (the subtitle voice), and a short excerpt of her
 * description, two lines at most, in the body voice.
 */
export function TeacherLine({
  name,
  bio,
}: {
  name: string;
  bio?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p>
        <span className="text-sm font-semibold text-ink-700">
          {microcopy.teacherLabel}:
        </span>{" "}
        <span className="font-display text-xl italic text-ink-900">{name}</span>
      </p>
      {bio ? <p className="line-clamp-2 text-sm text-ink-700">{bio}</p> : null}
    </div>
  );
}
