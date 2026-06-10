import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, AlertCircle, X, FileText, Image } from 'lucide-react';
import { submitIncome } from '@/apis';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const IsaIncomeForm = ({ isaId, incomeThreshold, onSuccess }) => {
  const [income, setIncome] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 5MB)')
      return
    }
    setProofFile(file)
    if (file.type.startsWith('image/')) {
      setProofPreview(URL.createObjectURL(file))
    } else {
      setProofPreview(null)
    }
  }

  const removeFile = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview)
    setProofFile(null)
    setProofPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const incomeValue = parseFloat(income);
    if (isNaN(incomeValue) || incomeValue < 0) {
      toast.error('Vui lòng nhập thu nhập hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('income', incomeValue);
      formData.append('note', note);
      if (proofFile) {
        formData.append('proofDocument', proofFile);
      }

      const response = await submitIncome(isaId, formData);
      if (response.success) {
        toast.success('Thu nhập đã được ghi nhận thành công');
        setIncome('');
        setNote('');
        removeFile();
        onSuccess?.();
      } else {
        toast.error(response.message || 'Gửi thu nhập thất bại');
      }
    } catch (error) {
      toast.error('Gửi thu nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Gửi thu nhập hàng tháng</h3>
        <p className="text-sm text-gray-500 mt-1">
          Báo cáo thu nhập của bạn để tính toán số tiền ISA phải trả.{' '}
          {incomeThreshold > 0 && (
            <span className="text-amber-600">
              Ngưỡng tối thiểu: {formatCurrency(incomeThreshold)}/tháng.
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thu nhập tháng này (VND)
          </label>
          <input
            type="number"
            min="0"
            step="1000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="VD: 15000000"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
              transition-shadow"
          />
          {incomeThreshold > 0 && income && parseFloat(income) < incomeThreshold && (
            <div className="flex items-start gap-2 mt-2 text-amber-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                Thu nhập thấp hơn ngưỡng tối thiểu ({formatCurrency(incomeThreshold)}). Bạn không cần thanh toán ISA tháng này.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ghi chú (tùy chọn)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Thu nhập từ công việc bán thời gian..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
              transition-shadow resize-none"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chứng minh thu nhập (tùy chọn)
          </label>
          {proofFile ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              {proofPreview ? (
                <img src={proofPreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
              ) : (
                <FileText className="w-8 h-8 text-green-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 truncate">{proofFile.name}</p>
                <p className="text-xs text-green-600">{(proofFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1 hover:bg-green-100 rounded"
              >
                <X className="w-4 h-4 text-green-600" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
              <Image className="w-5 h-5 text-gray-400" />
              <div className="text-center">
                <p className="text-sm text-gray-500">Tải lên chứng minh thu nhập</p>
                <p className="text-xs text-gray-400">JPG, PNG, PDF (tối đa 5MB)</p>
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !income}
          className="w-full flex items-center justify-center gap-2 px-4 py-3
            bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed
            text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang gửi...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Gửi báo cáo thu nhập
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default IsaIncomeForm;
