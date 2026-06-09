import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { IsaStatusCard, IsaPaymentSchedule, IsaIncomeForm } from '@/components/isa';
import { getMyIsaRepayments } from '@/apis';

const IsaDashboardPage = () => {
  const [isaList, setIsaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIsa, setCurrentIsa] = useState(null);

  const fetchIsaData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMyIsaRepayments();
      if (response.success) {
        const list = response.data || [];
        setIsaList(list);
        const active = list.find((isa) => isa.status === 'active' || isa.status === 'pending');
        setCurrentIsa(active || list[0] || null);
      }
    } catch (error) {
      toast.error('Không thể tải thông tin ISA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIsaData();
  }, [fetchIsaData]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      );
    }

    if (isaList.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có ISA nào</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Bạn chưa có ISA nào trong hệ thống. ISA (Income Share Agreement) sẽ được tạo khi bạn đăng ký khóa học có hỗ trợ thanh toán ISA.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* ISA selector if multiple */}
        {isaList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {isaList.map((isa, idx) => (
              <button
                key={isa._id || idx}
                onClick={() => setCurrentIsa(isa)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  currentIsa === isa
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }`}
              >
                ISA #{idx + 1} - {isa.status}
              </button>
            ))}
          </div>
        )}

        <IsaStatusCard isa={currentIsa} />

        {currentIsa && currentIsa.monthlyRecords && (
          <IsaPaymentSchedule monthlyRecords={currentIsa.monthlyRecords} />
        )}

        {currentIsa && (currentIsa.status === 'active' || currentIsa.status === 'pending') && (
          <IsaIncomeForm
            isaId={currentIsa._id || currentIsa.id}
            incomeThreshold={currentIsa.incomeThreshold || 0}
            onSuccess={fetchIsaData}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ISA Dashboard</h1>
              <p className="text-gray-500 mt-1">Theo dõi và quản lý ISA của bạn</p>
            </div>
            <button
              onClick={fetchIsaData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default IsaDashboardPage;
