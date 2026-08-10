import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/help")({
  head: infoHead("Help Center", "Answers, troubleshooting steps and ways to reach the opteraOS team."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Help Center"
      title="Help Center"
      intro="Answers, troubleshooting steps and ways to reach the opteraOS team."
      sections={[
            { heading: "Common questions", body: "Billing, seats, roles and workspace settings explained in short, practical articles." },
            { heading: "Troubleshooting", body: "What to check when data looks wrong, an automation stalls or an invoice is not sending." },
            { heading: "Contact support", body: "Email the team from inside your workspace and we respond within one business day." },
      ]}
    />
  );
}
