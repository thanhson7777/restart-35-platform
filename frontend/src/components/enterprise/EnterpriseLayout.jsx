import RoleLayoutShell from '@/components/shared/RoleLayoutShell';
import RoleHeader from '@/components/shared/RoleHeader';
import EnterpriseSidebar from './EnterpriseSidebar';

const EnterpriseLayout = ({ children, className }) => {
  return (
    <RoleLayoutShell
      allowedRole="enterprise"
      loadingMessage="Đang tải thông tin doanh nghiệp..."
      SidebarComponent={EnterpriseSidebar}
      HeaderComponent={(props) => (
        <RoleHeader
          {...props}
          sidebarCollapsed={props.sidebarCollapsed}
          title="Enterprise Dashboard"
          subtitle="Theo dõi partnership, sponsorship và kết quả đầu ra"
        />
      )}
      className={className}
    >
      {children}
    </RoleLayoutShell>
  );
};

export default EnterpriseLayout;
