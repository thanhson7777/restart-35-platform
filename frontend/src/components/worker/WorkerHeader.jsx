import RoleHeader from '@/components/shared/RoleHeader';

const WorkerHeader = (props) => {
  return (
    <RoleHeader
      {...props}
      title="Worker Hub"
      subtitle="Quản lý học tập, việc làm và sự nghiệp"
    />
  );
};

export default WorkerHeader;
