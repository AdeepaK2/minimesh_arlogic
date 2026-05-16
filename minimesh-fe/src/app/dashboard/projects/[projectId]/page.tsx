import { GeneratorWorkspace } from "@/components/generator/generator-workspace";

export default async function DashboardProjectStudioPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <GeneratorWorkspace projectId={projectId} />;
}
