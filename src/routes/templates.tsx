import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/templates")({
  head: infoHead("Workflow templates", "Ready-made automation and workflow templates you can adapt to your business."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Templates"
      title="Workflow templates"
      intro="Ready-made automation and workflow templates you can adapt to your business."
      sections={[
            { heading: "Lead handling", body: "Qualify, score, assign and follow up on inbound leads automatically." },
            { heading: "Order to cash", body: "Turn orders into invoices, collect payment and confirm with the customer." },
            { heading: "Collections", body: "Escalating reminder sequences for invoices that pass their due date." },
      ]}
    />
  );
}
