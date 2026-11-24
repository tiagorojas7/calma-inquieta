import { Text } from "../atoms/heading";
import { AdminButton } from "./admin-button";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminSection } from "./admin-sections";
import { TextAreaField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

export interface PolicyVersionView {
  readonly version: number;
  readonly label: string;
  /** "DD/MM/AAAA". */
  readonly publishedOn: string;
  readonly publishedBy: string;
  readonly body: string;
  readonly current: boolean;
}

export interface PolicySectionView {
  readonly kind: "conditions" | "privacy";
  readonly title: string;
  readonly description: string;
  readonly currentVersion: number;
  /** The current text, which the form starts with. */
  readonly body: string;
  /** Newest first. */
  readonly history: readonly PolicyVersionView[];
}

/** A refused publish: the section it came from, what was typed and why. */
export interface PolicyRejection {
  readonly kind: "conditions" | "privacy";
  readonly body: string;
  readonly message: string;
}

const copy = adminMicrocopy.policies;

/**
 * The two site-wide documents. Each section is its own native post form (the
 * Worker gate refuses `.data` requests, so no client navigation), prefilled
 * with the current text; publishing adds a version and never edits an old one.
 * Every version stays readable below.
 */
export function AdminPolicies({
  sections,
  feedback,
  rejected,
}: {
  sections: readonly PolicySectionView[];
  feedback: "published" | null;
  rejected: PolicyRejection | undefined;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        description={copy.subtitle}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback]} />
      ) : null}
      {sections.map((section) => {
        const refused = rejected?.kind === section.kind ? rejected : undefined;
        return (
          <AdminSection
            key={section.kind}
            title={section.title}
            description={section.description}
            actions={
              <Text tone="muted">
                {copy.form.current(section.currentVersion)}
              </Text>
            }
          >
            <form
              method="post"
              noValidate
              aria-label={copy.form.label(section.title)}
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="kind" value={section.kind} />
              <TextAreaField
                key={`${section.kind}-${String(section.currentVersion)}`}
                label={copy.form.body}
                hint={copy.form.bodyHint}
                name="body"
                rows={10}
                defaultValue={refused?.body ?? section.body}
                error={refused?.message}
              />
              <AdminButton type="submit" className="self-start">
                {copy.form.publish}
              </AdminButton>
            </form>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-ink-900">
                {copy.history.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {section.history.map((entry) => (
                  <li
                    key={entry.version}
                    className="flex flex-col gap-1 rounded-md border border-admin-line p-3"
                  >
                    <p className="font-semibold text-ink-900">
                      {entry.label}
                      {entry.current ? ` · ${copy.history.current}` : ""}
                    </p>
                    <Text tone="muted">
                      {copy.history.publishedOn(entry.publishedOn)}{" "}
                      {copy.history.publishedBy(entry.publishedBy)}
                    </Text>
                    <details>
                      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-clay-800">
                        {copy.history.read}
                      </summary>
                      <Text className="whitespace-pre-line">{entry.body}</Text>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          </AdminSection>
        );
      })}
    </div>
  );
}
