import { createInsightsService } from "~/modules/insights";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  InMemoryEnrollmentInsightsReader,
  InMemoryIntensiveInsightsReader,
  InMemoryIntensiveRequestInsightsReader,
  InMemoryTeacherDirectory,
  InMemoryWorkshopInsightsReader,
} from "~/testing/fakes/in-memory-insights-readers";

/** Real insights service over in-memory readers; "now" is 2026-10-31 in Cordoba. */
export function insightsFixture() {
  const orders = new InMemoryEnrollmentInsightsReader();
  const workshops = new InMemoryWorkshopInsightsReader();
  const intensives = new InMemoryIntensiveInsightsReader();
  const intensiveRequests = new InMemoryIntensiveRequestInsightsReader();
  const teachers = new InMemoryTeacherDirectory();
  const service = createInsightsService({
    orders,
    workshops,
    intensives,
    intensiveRequests,
    teachers,
    clock: fixedClock(new Date("2026-10-31T15:30:00.000Z")),
  });
  return {
    orders,
    workshops,
    intensives,
    intensiveRequests,
    teachers,
    service,
  };
}
