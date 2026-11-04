import { ProfileHighlight } from "./ProfileHighlight";
import { ProviderMetrics } from "./ProviderMetrics";
import { RecentActivity } from "./RecentActivity";
import { WeekAgenda } from "./WeekAgenda";

export function ProviderDashboard() {
  return (
    <>
      <ProfileHighlight />
      <ProviderMetrics />
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <WeekAgenda />
        <RecentActivity />
      </section>
    </>
  );
}
