import RoleLayoutShell from '@/components/shared/RoleLayoutShell';
import RoleHeader from '@/components/shared/RoleHeader';
import NgoSidebar from './NgoSidebar';

const NgoLayout = ({ children, className }) => {
  return (
    <RoleLayoutShell
      allowedRole="ngo"
      loadingMessage="Đang tải thông tin tổ chức..."
      SidebarComponent={NgoSidebar}
      HeaderComponent={(props) => (
        <RoleHeader
          {...props}
          title="NGO Dashboard"
          subtitle="Quản lý tài trợ, người học và báo cáo tác động"
        />
      )}
      className={className}
    >
      {children}
    </RoleLayoutShell>
  );
};

export default NgoLayout;
