import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/careers")({
  head: infoHead("Build opteraOS with us", "We are a small team shipping a large product surface."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      eyebrow="Careers"
      title="Build opteraOS with us"
      intro="We are a small team shipping a large product surface."
      sections={[
        {
          heading: "How we work",
          body: "Small teams, direct ownership, fast feedback from real operators.",
        },
        {
          heading: "Open roles",
          body: "We hire product engineers, designers and applied AI engineers as we grow.",
        },
        {
          heading: "Apply",
          body: "Send us something you built and why business software should be better.",
        },
      ]}
    />
  );
}
