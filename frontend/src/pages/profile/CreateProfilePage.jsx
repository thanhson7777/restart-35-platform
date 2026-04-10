import { useNavigate } from 'react-router-dom'
import MultiStepForm from '~/components/profile/MultiStepForm'

const CreateProfilePage = () => {
  const navigate = useNavigate()

  const handleComplete = () => {
    // Redirect to dashboard sau khi hoàn thành profile (AI sẽ lazy load)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Tạo Hồ Sơ Tái Hòa Nhập
          </h1>
          <p className="text-lg text-gray-600">
            Chia sẻ thông tin về bản thân để chúng tôi có thể hỗ trợ bạn tốt hơn
          </p>
        </div>

        {/* Multi-step Form */}
        <MultiStepForm onComplete={handleComplete} />
      </div>
    </div>
  )
}

export default CreateProfilePage