import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/about")({
  head: infoHead("About opteraOS", "We build the operating system small and medium businesses run on."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Company"
      title="About opteraOS"
      intro="We build the operating system small and medium businesses run on."
      sections={[
            { heading: "Our mission", body: "Give every growing business the operational leverage that large enterprises buy with big software budgets." },
            { heading: "How we build", body: "One data model, one permission system, one AI context \u2014 depth over feature sprawl." },
            { heading: "Where we are", body: "A distributed team working with operators across retail, services, distribution and manufacturing." },
      ]}
    />
  );
}
