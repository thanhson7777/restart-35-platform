import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { verifyAccountAPI } from '@/apis/authAPI'
import { ShieldCheck, XCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AccountVerificationPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!email || !token) {
      setErrorMessage('Liên kết xác thực không hợp lệ hoặc đã hết hạn.')
      setStatus('error')
      return
    }

    const verify = async () => {
      try {
        const res = await verifyAccountAPI({ email, token })
        if (res.data?.adminApprovalStatus === 'pending') {
          setStatus('pending_admin')
        } else {
          setStatus('success')
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Xác thực thất bại. Liên kết có thể đã hết hạn hoặc không hợp lệ.'
        setErrorMessage(msg)
        setStatus('error')
      }
    }

    verify()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            {status === 'loading' && (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold text-foreground">Đang xác thực tài khoản</h1>
                  <p className="text-sm text-muted-foreground">
                    Vui lòng chờ trong giây lát...
                  </p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold text-foreground">Xác thực thành công</h1>
                  <p className="text-sm text-muted-foreground">
                    Tài khoản đã được kích hoạt. Bạn có thể đăng nhập ngay.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link to="/auth">Đăng nhập ngay</Link>
                </Button>
              </>
            )}

            {status === 'pending_admin' && (
              <>
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold text-foreground">Hồ sơ đang chờ phê duyệt!</h1>
                  <p className="text-sm text-muted-foreground">
                    Xác thực email thành công. Đội ngũ Admin đang kiểm tra thông tin Đối tác của bạn.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ⏱️ Thời gian dự kiến: 1 - 2 ngày làm việc.<br/>
                    📧 Kết quả sẽ được gửi trực tiếp đến email của bạn.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/">Quay về trang chủ</Link>
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold text-foreground">Xác thực thất bại</h1>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">Quay về trang chủ</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
