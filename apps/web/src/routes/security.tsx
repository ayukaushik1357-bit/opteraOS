import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/security")({
  head: infoHead(
    "Security",
    "Organization isolation, role-based access and full auditability by default.",
  ),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Trust"
      title="Security"
      intro="Organization isolation, role-based access and full auditability by default."
      sections={[
        {
          heading: "Isolation",
          body: "Every record is scoped to an organization and access is enforced on the server, not in the browser.",
        },
        {
          heading: "Access control",
          body: "Owner, admin, manager, employee and viewer roles across every module.",
        },
        {
          heading: "Auditability",
          body: "Logins, record changes, automation runs and AI actions are all logged.",
        },
      ]}
    />
  );
}
