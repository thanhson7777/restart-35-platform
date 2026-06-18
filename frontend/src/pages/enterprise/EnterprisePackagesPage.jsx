import { useState, useEffect } from 'react'
import { CheckCircle2, Zap, Crown, Sparkles, Building2, ChevronRight, ShieldCheck } from 'lucide-react'
import { servicePackageApi } from '~/apis/servicePackageApi'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/redux/user/userSlice'
import toast from 'react-hot-toast'
import * as organizationApi from '~/apis/organizationApi'
import moment from 'moment'
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

const EnterprisePackagesPage = () => {
  const currentUser = useSelector(selectCurrentUser)
  const [packages, setPackages] = useState([])
  const [orgData, setOrgData] = useState(null)
  
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('wallet')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const packagesRes = await servicePackageApi.getActivePackages()
      const packagesData = packagesRes?.data || packagesRes || []
      setPackages(Array.isArray(packagesData) ? packagesData : [])

      if (currentUser?.organizationId) {
        try {
          const orgRes = await organizationApi.getOrganizationById(currentUser.organizationId)
          setOrgData(orgRes?.data || orgRes || null)
        } catch (orgError) {
          console.error('Fetch Org Error:', orgError)
        }
      }
    } catch (error) {
      console.error('Fetch Packages Error:', error)
      toast.error('Lỗi khi tải dữ liệu gói dịch vụ: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleOpenPayment = (pkg) => {
    if (!currentUser?.organizationId) {
      toast.error('Bạn cần cập nhật hồ sơ Doanh nghiệp (Profile) trước khi mua gói dịch vụ!')
      return
    }
    setSelectedPackage(pkg)
    setPaymentMethod('wallet')
    setOpenPaymentModal(true)
  }

  const handleClosePayment = () => {
    setOpenPaymentModal(false)
    setSelectedPackage(null)
  }

  const handleBuyPackage = async () => {
    if (!selectedPackage) return
    setIsProcessing(true)
    try {
      const returnUrl = `${window.location.origin}/payment/vnpay-return`
      const res = await servicePackageApi.buyPackage(selectedPackage._id, paymentMethod, returnUrl)
      
      if (paymentMethod === 'vnpay' && res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl
      } else if (paymentMethod === 'vnpay' && res.paymentUrl) {
        window.location.href = res.paymentUrl
      } else {
        toast.success('Mua gói dịch vụ thành công!')
        handleClosePayment()
        fetchData() // Refresh
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán')
    } finally {
      setIsProcessing(false)
    }
  }

  // Find the highest price to determine the "Pro" package if dynamic
  const maxPrice = packages.length > 0 ? Math.max(...packages.map(p => p.price)) : 0
  const isPremium = (price) => price > 0 && price === maxPrice

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 border-blue-200 uppercase tracking-wider font-semibold text-xs py-1 px-3">
                Doanh nghiệp
              </Badge>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                Nâng tầm tuyển dụng với <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Gói Dịch Vụ</span>
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed">
                Tối ưu hóa quy trình tìm kiếm ứng viên, mở rộng hạn mức và truy cập các tính năng quản trị độc quyền dành riêng cho đối tác.
              </p>
            </div>

            {/* Current Quota Card - Mini */}
            {orgData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 min-w-[300px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Trạng thái tổ chức</h3>
                    {orgData.subscriptionEndDate && moment(orgData.subscriptionEndDate).isAfter(moment()) ? (
                      <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Đang kích hoạt
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">Chưa đăng ký gói</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Hạn mức tin ({orgData.quotaMonth || moment().format('MM/YYYY')})</span>
                      <span className="font-bold text-gray-900">
                        {Math.max(0, (orgData.monthlyJobQuota || 0) - (orgData.currentMonthUsedJobQuota || 0))} / {orgData.monthlyJobQuota || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((orgData.currentMonthUsedJobQuota || 0) / (orgData.monthlyJobQuota || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {orgData.subscriptionEndDate && (
                    <div className="pt-2 border-t border-gray-50 flex justify-between text-sm">
                      <span className="text-gray-500">Hạn sử dụng:</span>
                      <span className={cn(
                        "font-medium",
                        moment(orgData.subscriptionEndDate).isBefore(moment()) ? "text-red-500" : "text-gray-900"
                      )}>
                        {moment(orgData.subscriptionEndDate).format('DD/MM/YYYY')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {packages.map((pkg, idx) => {
            const isHighlighted = isPremium(pkg.price);
            const isCurrent = orgData?.currentPackageId === pkg._id || (pkg.price === 0 && (!orgData?.currentPackageId))

            return (
              <div 
                key={pkg._id} 
                className={cn(
                  "relative bg-white rounded-3xl transition-all duration-300 flex flex-col",
                  "border border-gray-200 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]",
                  isHighlighted && "border-blue-200 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.15)] md:-mt-4 md:mb-4"
                )}
              >
                {/* Highlight Badge */}
                {isHighlighted && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full flex items-center gap-1 shadow-lg shadow-blue-500/30">
                      <Crown className="w-3.5 h-3.5" /> Khuyên dùng
                    </div>
                  </div>
                )}

                <div className="p-8 flex flex-col flex-grow">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <p className="text-sm text-gray-500 min-h-[40px] line-clamp-2">
                      {pkg.description || 'Giải pháp tuyệt vời để bắt đầu.'}
                    </p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        {pkg.price === 0 ? 'Miễn phí' : pkg.price.toLocaleString() + 'đ'}
                      </span>
                    </div>
                    {pkg.price > 0 && (
                      <span className="text-sm font-medium text-gray-500 mt-1 block">
                        / {pkg.durationMonths} tháng sử dụng
                      </span>
                    )}
                    {pkg.price === 0 && (
                      <span className="text-sm font-medium text-gray-500 mt-1 block">
                        Áp dụng mặc định
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1 rounded-full bg-blue-50 text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-gray-600 text-sm">
                        <strong className="text-gray-900">{pkg.monthlyJobQuota}</strong> tin tuyển dụng mỗi tháng
                      </span>
                    </div>
                    {pkg.price > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-full bg-blue-50 text-blue-600">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-gray-600 text-sm">Hỗ trợ ưu tiên 24/7</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4">
                    <Button 
                      className={cn(
                        "w-full rounded-xl py-6 font-semibold transition-all",
                        isCurrent 
                          ? "bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-not-allowed" 
                          : isHighlighted 
                            ? "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg shadow-blue-600/20"
                            : "bg-white border-2 border-gray-200 text-gray-900 hover:border-gray-300 hover:bg-gray-50"
                      )}
                      onClick={() => {
                        if (!isCurrent) handleOpenPayment(pkg)
                      }}
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Đang sử dụng' : 'Chọn gói này'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {packages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500">Chưa có gói dịch vụ nào được cấu hình.</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
            <h3 className="text-xl font-bold mb-1">Xác nhận thanh toán</h3>
            <p className="text-blue-100 text-sm">Chọn phương thức thanh toán an toàn</p>
          </div>
          
          <div className="p-6">
            {selectedPackage && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                  <p className="text-sm font-medium text-gray-500 mb-1">Gói dịch vụ</p>
                  <p className="text-lg font-bold text-gray-900">{selectedPackage.name}</p>
                  <div className="mt-2 text-2xl font-extrabold text-blue-600">
                    {selectedPackage.price === 0 ? 'Miễn phí' : selectedPackage.price.toLocaleString() + 'đ'}
                  </div>
                </div>

                {selectedPackage.price > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Phương thức thanh toán</p>
                    <div className="space-y-3">
                      <label className={cn(
                        "flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all",
                        paymentMethod === 'wallet' ? "border-blue-600 bg-blue-50/50" : "border-gray-200 hover:border-gray-300"
                      )}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="wallet" 
                          checked={paymentMethod === 'wallet'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-600"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Ví doanh nghiệp</p>
                          <p className="text-xs text-gray-500">Thanh toán bằng số dư ví nền tảng</p>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all",
                        paymentMethod === 'vnpay' ? "border-blue-600 bg-blue-50/50" : "border-gray-200 hover:border-gray-300"
                      )}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="vnpay" 
                          checked={paymentMethod === 'vnpay'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-600"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Cổng thanh toán VNPay</p>
                          <p className="text-xs text-gray-500">ATM, Visa, MasterCard, QR Code</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-2xl border-t border-gray-100">
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={handleClosePayment} disabled={isProcessing}>
              Hủy bỏ
            </Button>
            <Button 
              className="rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              onClick={handleBuyPackage}
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterprisePackagesPage
