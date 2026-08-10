import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/terms")({
  head: infoHead("Terms", "The terms that govern your use of opteraOS."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms"
      intro="The terms that govern your use of opteraOS."
      sections={[
            { heading: "Your account", body: "You are responsible for the activity in your workspace and for the accuracy of the data you enter." },
            { heading: "Subscriptions", body: "Plans renew on their billing cycle and can be changed or cancelled from workspace settings." },
            { heading: "Acceptable use", body: "No unlawful use, no abuse of messaging channels and no attempts to breach workspace isolation." },
      ]}
    />
  );
}
