import RoleLayoutShell from '@/components/shared/RoleLayoutShell';
import RoleHeader from '@/components/shared/RoleHeader';
import WorkerSidebar from './WorkerSidebar';

const WorkerLayout = ({ children, className }) => {
  return (
    <RoleLayoutShell
      allowedRole="worker"
      loadingMessage="Đang tải thông tin worker..."
      SidebarComponent={WorkerSidebar}
      HeaderComponent={(props) => (
        <RoleHeader
          {...props}
          title="Worker Hub"
          subtitle="Quản lý học tập, việc làm và sự nghiệp"
        />
      )}
      className={className}
    >
      {children}
    </RoleLayoutShell>
  );
};

export default WorkerLayout;
