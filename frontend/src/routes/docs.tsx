import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/docs")({
  head: infoHead(
    "Documentation",
    "Guides for setting up your workspace, modules, automations and integrations in opteraOS.",
  ),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Documentation"
      title="Documentation"
      intro="Guides for setting up your workspace, modules, automations and integrations in opteraOS."
      sections={[
        {
          heading: "Getting started",
          body: "Create a workspace, invite your team and import your customers and products in a few minutes.",
        },
        {
          heading: "Modules",
          body: "Reference for CRM, sales, invoices, payments, inventory, analytics, marketing and automation.",
        },
        {
          heading: "Automations",
          body: "How triggers, actions, logic branches and AI decisions fit together on the workflow canvas.",
        },
      ]}
    />
  );
}
