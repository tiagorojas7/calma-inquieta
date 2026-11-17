import { createInsightsService } from "~/modules/insights";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryPrivateEventRepository } from "~/testing/fakes/in-memory-private-event-repository";
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
  const privateEvents = new InMemoryPrivateEventRepository();
  const service = createInsightsService({
    orders,
    workshops,
    intensives,
    intensiveRequests,
    privateEvents,
    teachers,
    clock: fixedClock(new Date("2026-10-31T15:30:00.000Z")),
  });
  return {
    orders,
    workshops,
    intensives,
    intensiveRequests,
    privateEvents,
    teachers,
    service,
  };
}
