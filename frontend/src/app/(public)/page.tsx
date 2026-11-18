import { Suspense } from "react";

import { OpenLoginFromQuery } from "@/features/auth/components/OpenLoginFromQuery";
import { Hero } from "@/features/landing/components/Hero";
import { JourneySection } from "@/features/landing/components/JourneySection";
import { UserTypesSection } from "@/features/landing/components/UserTypesSection";
import { PlansSection } from "@/features/plans/components/PlansSection";
import { TestimonialsSection } from "@/features/platform-reviews/components/TestimonialsSection";
import { StatsBar } from "@/features/stats/components/StatsBar";

export default function LandingPage() {
  return (
    <>
      <Suspense>
        <OpenLoginFromQuery />
      </Suspense>
      <Hero />
      <UserTypesSection />
      <StatsBar />
      <JourneySection />
      <PlansSection />
      <TestimonialsSection />
    </>
  );
}
