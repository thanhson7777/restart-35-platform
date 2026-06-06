import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button, Textarea } from '@/components/ui';

const PartnershipResponseModal = ({ isOpen, onClose, partnership, onSuccess, loading = false }) => {
  const [responseStatus, setResponseStatus] = useState('negotiating');
  const [responseText, setResponseText] = useState('');
  const [proposedCourseIds, setProposedCourseIds] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!responseText.trim()) return;
    onSuccess?.({
      status: responseStatus,
      proposedCourseIds: proposedCourseIds.split(',').map(s => s.trim()).filter(Boolean),
      message: responseText.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Phản hồi yêu cầu hợp tác</h3>
            {partnership?.enterprise?.displayName && (
              <p className="text-xs text-slate-400 mt-0.5">{partnership.enterprise.displayName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-2">Trạng thái phản hồi</label>
            <div className="flex gap-2">
              {[
                { value: 'negotiating', label: 'Đàm phán', color: 'blue' },
                { value: 'rejected', label: 'Từ chối', color: 'red' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setResponseStatus(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    responseStatus === opt.value
                      ? opt.color === 'blue'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-red-600 text-white border-red-600'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proposed Course IDs */}
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5">
              Khóa học đề xuất (IDs, cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={proposedCourseIds}
              onChange={e => setProposedCourseIds(e.target.value)}
              placeholder="6501a2b3..., 6501c4d5..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
            />
            <p className="text-xs text-slate-600 mt-1">Bạn có thể nhập ObjectId của các khóa học muốn đề xuất</p>
          </div>

          {/* Response Text */}
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5">Nội dung phản hồi</label>
            <Textarea
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder="Viết phản hồi của bạn cho doanh nghiệp..."
              rows={4}
              className="bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 text-sm"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !responseText.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white border-none text-sm font-semibold gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Gửi phản hồi
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartnershipResponseModal;
