import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/contact")({
  head: infoHead("Talk to us", "Questions about pricing, migration or a custom deployment."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Talk to us"
      intro="Questions about pricing, migration or a custom deployment."
      sections={[
            { heading: "Sales", body: "Tell us about your business and we will map opteraOS to how you actually operate." },
            { heading: "Support", body: "Existing customers get support directly inside the workspace." },
            { heading: "Partnerships", body: "We work with implementation partners and agencies serving SMB operators." },
      ]}
    />
  );
}
