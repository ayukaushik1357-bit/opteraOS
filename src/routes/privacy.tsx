import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/privacy")({
  head: infoHead("Privacy", "How opteraOS handles the data you and your customers trust us with."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy"
      intro="How opteraOS handles the data you and your customers trust us with."
      sections={[
            { heading: "What we collect", body: "Account details, workspace content you create and technical logs needed to run the service." },
            { heading: "How we use it", body: "To operate your workspace, secure it and improve the product. We do not sell your data." },
            { heading: "Your control", body: "You can export or delete your workspace data at any time from workspace settings." },
      ]}
    />
  );
}
