import { MainLayout } from "@/components/layout/MainLayout";
import { ResourcesView } from "@/components/resources/ResourcesView";

const ResourcesPage = () => {
  return (
    <MainLayout title="공간 예약">
      <ResourcesView />
    </MainLayout>
  );
};

export default ResourcesPage;
