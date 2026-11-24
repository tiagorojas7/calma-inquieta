import type { StudentActivityStore } from "~/modules/enrollments/application/student-activity";

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * Student activity flags in memory. Profiles are known once an enrollment (or
 * a test) enrolls them; the order repository fake enrolls through `enrolled`.
 */
export class InMemoryStudentActivityStore implements StudentActivityStore {
  private readonly known = new Set<string>();
  private readonly inactive = new Set<string>();

  /** Marks the emails as belonging to active profiles, as an enrollment does. */
  enrolled(...emails: readonly string[]): void {
    for (const email of emails) {
      const key = normalize(email);
      this.known.add(key);
      this.inactive.delete(key);
    }
  }

  inactiveEmails(): Promise<ReadonlySet<string>> {
    return Promise.resolve(new Set(this.inactive));
  }

  setActive(email: string, active: boolean): Promise<boolean> {
    const key = normalize(email);
    if (!this.known.has(key)) return Promise.resolve(false);
    if (active) this.inactive.delete(key);
    else this.inactive.add(key);
    return Promise.resolve(true);
  }
}
