import { useState, useEffect } from 'react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { getMySponsorships } from '@/apis/courseSponsorshipApi'
import { Briefcase, DollarSign, TrendingUp, AlertCircle, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  matched: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  disbursed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  clawback: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
}

const STATUS_LABELS = {
  matched: 'Đã ghép',
  disbursed: 'Đã giải ngân',
  clawback: 'Hoàn tiền',
  pending: 'Chờ xử lý',
}

const DISBURSEMENT_LABELS = {
  upfront: 'Trả trước',
  milestone: 'Theo mốc',
  completion: 'Theo hoàn thành',
}

const formatCurrency = (value) => {
  if (!value) return '0đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

const MySponsorshipsPage = () => {
  const [sponsorships, setSponsorships] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedEnrollment, setExpandedEnrollment] = useState(null)

  useEffect(() => {
    const fetchSponsorships = async () => {
      setLoading(true)
      try {
        const res = await getMySponsorships()
        setSponsorships(res.data || [])
      } catch (err) {
        toast.error('Không thể tải thông tin tài trợ')
      } finally {
        setLoading(false)
      }
    }
    fetchSponsorships()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải thông tin tài trợ...</p>
        </div>
      </div>
    )
  }

  const totalFunded = sponsorships.reduce((sum, e) =>
    sum + e.sponsorships.reduce((s, sp) => s + (sp.fundedAmount || 0), 0), 0)
  const totalDisbursed = sponsorships.reduce((sum, e) =>
    sum + e.sponsorships.reduce((s, sp) => s + (sp.disbursedAmount || 0), 0), 0)
  const totalClawback = sponsorships.reduce((sum, e) =>
    sum + e.sponsorships.reduce((s, sp) => s + (sp.clawbackAmount || 0), 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Học bổng của tôi</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi các chương trình tài trợ bạn đã được nhận
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign size={20} className="mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{formatCurrency(totalFunded)}</p>
              <p className="text-xs text-muted-foreground">Tổng tài trợ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp size={20} className="mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{formatCurrency(totalDisbursed)}</p>
              <p className="text-xs text-muted-foreground">Đã giải ngân</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle size={20} className="mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{formatCurrency(totalClawback)}</p>
              <p className="text-xs text-muted-foreground">Hoàn tiền</p>
            </CardContent>
          </Card>
        </div>

        {/* Sponsorships List */}
        {sponsorships.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Chưa có tài trợ nào</h3>
            <p className="text-muted-foreground">
              Bạn chưa được tài trợ học bổng nào. Hãy đăng ký khóa học để xem các chương trình tài trợ phù hợp.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sponsorships.map((enrollment) => (
              <Card key={enrollment.enrollmentId}>
                <button
                  onClick={() => setExpandedEnrollment(
                    expandedEnrollment === enrollment.enrollmentId ? null : enrollment.enrollmentId
                  )}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{enrollment.courseName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {enrollment.sponsorships.length} chương trình tài trợ
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {enrollment.sponsorships.map((sp, i) => (
                      <Badge key={i} className={STATUS_COLORS[sp.status] || 'bg-gray-100'}>
                        {STATUS_LABELS[sp.status] || sp.status}
                      </Badge>
                    ))}
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedEnrollment === enrollment.enrollmentId ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {expandedEnrollment === enrollment.enrollmentId && (
                  <div className="border-t">
                    {enrollment.sponsorships.map((sp, i) => (
                      <div key={i} className="p-4 border-b last:border-b-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-sm">{sp.sponsorshipTitle}</p>
                            <p className="text-xs text-muted-foreground">{sp.sponsorOrg}</p>
                          </div>
                          <Badge className={STATUS_COLORS[sp.status] || 'bg-gray-100'}>
                            {STATUS_LABELS[sp.status] || sp.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Được tài trợ</p>
                            <p className="text-sm font-bold text-green-600">{formatCurrency(sp.fundedAmount)}</p>
                          </div>
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Đã giải ngân</p>
                            <p className="text-sm font-bold text-blue-600">{formatCurrency(sp.disbursedAmount)}</p>
                          </div>
                          <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Hoàn tiền</p>
                            <p className="text-sm font-bold text-red-600">{formatCurrency(sp.clawbackAmount)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Phương thức: {DISBURSEMENT_LABELS[sp.disbursementModel] || sp.disbursementModel}</span>
                          {sp.clawbackEnabled && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600">Có chính sách hoàn tiền</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default MySponsorshipsPage
