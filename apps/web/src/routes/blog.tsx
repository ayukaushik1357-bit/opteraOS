import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/blog")({
  head: infoHead(
    "From the opteraOS team",
    "Notes on running a business on one intelligent system.",
  ),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Blog"
      title="From the opteraOS team"
      intro="Notes on running a business on one intelligent system."
      sections={[
        {
          heading: "Why one system wins",
          body: "Fragmented tools create duplicated data and blind spots. A single operating layer removes both.",
        },
        {
          heading: "AI that acts",
          body: "The difference between a dashboard that reports and a system that takes the next step for you.",
        },
        {
          heading: "Operations playbooks",
          body: "Practical patterns operators use to automate the repetitive 60% of their week.",
        },
      ]}
    />
  );
}
