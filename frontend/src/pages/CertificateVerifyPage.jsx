import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, Button } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { verifyCertificate } from '@/apis/courseApi'
import { CheckCircle, XCircle, Award, Calendar, User, BookOpen } from 'lucide-react'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground leading-tight">{value}</p>
      </div>
    </div>
  )
}

export default function CertificateVerifyPage() {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await verifyCertificate(code.trim())
      setResult(res.data?.data || res.data)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không tìm thấy chứng chỉ với mã này.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Xác minh chứng chỉ</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Nhập mã xác minh trên chứng chỉ để kiểm tra tính hợp lệ
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Search Form */}
            <form onSubmit={handleVerify} className="flex gap-2">
              <Input
                placeholder="Nhập mã xác minh (ví dụ: CERT-2026-XXXXX)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-sm"
                autoFocus
              />
              <Button type="submit" disabled={loading || !code.trim()} className="shrink-0">
                {loading ? 'Đang kiểm tra...' : 'Xác minh'}
              </Button>
            </form>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Valid Certificate */}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">Chứng chỉ hợp lệ</p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Đây là chứng chỉ chính thức được cấp bởi nền tảng.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <InfoRow
                    icon={User}
                    label="Học viên"
                    value={result.workerName || result.userName || result.name || 'Không xác định'}
                  />
                  <InfoRow
                    icon={BookOpen}
                    label="Khóa học"
                    value={result.courseName || result.course?.name || 'Không xác định'}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Ngày cấp"
                    value={formatDate(result.issuedAt || result.issueDate || result.createdAt)}
                  />
                  {result.expiryDate && (
                    <InfoRow
                      icon={Calendar}
                      label="Ngày hết hạn"
                      value={formatDate(result.expiryDate)}
                    />
                  )}
                  {result.status && (
                    <InfoRow
                      icon={CheckCircle}
                      label="Trạng thái"
                      value={result.status}
                    />
                  )}
                </div>

                {result.verificationCode && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Mã xác minh:{' '}
                      <span className="font-mono font-medium">{result.verificationCode}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Liên hệ bộ phận hỗ trợ nếu bạn có thắc mắc về chứng chỉ.
        </p>
      </div>
    </div>
  )
}
