/**
 * RatingModal - Modal để user đánh giá công việc
 */
import { useState, useEffect } from 'react'
import { FaStar, FaTimes } from 'react-icons/fa'

const RatingModal = ({ isOpen, onClose, onSubmit, jobTitle, companyName }) => {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [quickTags, setQuickTags] = useState([])
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRating(0)
      setHoverRating(0)
      setComment('')
      setQuickTags([])
      setIsSubmitted(false)
    }
  }, [isOpen])

  const positiveTags = ['Lương tốt', 'Môi trường tốt', 'Đồng nghiệp thân thiện', 'Công việc phù hợp', 'Vị trí thuận tiện']
  const negativeTags = ['Lương thấp', 'Môi trường khó khăn', 'Đồng nghiệp không thân thiện', 'Công việc không phù hợp', 'Vị trí xa']

  const toggleTag = (tag) => {
    setQuickTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Vui lòng chọn số sao')
      return
    }
    setIsSubmitted(true)
    setTimeout(() => {
      onSubmit({ rating, comment, pros: quickTags.filter(t => positiveTags.includes(t)), cons: quickTags.filter(t => negativeTags.includes(t)) })
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <FaTimes size={20} />
          </button>
          {!isSubmitted ? (
            <>
              <h2 className="text-xl font-bold mb-1">Đánh giá công việc</h2>
              <p className="text-white/80 text-sm">{jobTitle} - {companyName}</p>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <span className="text-4xl">🎉</span>
                <h2 className="text-xl font-bold mt-2">Cảm ơn bạn!</h2>
                <p className="text-white/80 text-sm">Feedback của bạn giúp chúng tôi cải thiện</p>
              </div>
            </>
          )}
        </div>

        {!isSubmitted ? (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-3">Bạn hài lòng đến mức nào?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" className="focus:outline-none transition-transform hover:scale-110"
                    onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)}>
                    <FaStar size={36} className={star <= (hoverRating || rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {rating === 1 && 'Rất không hài lòng'}{rating === 2 && 'Không hài lòng'}{rating === 3 && 'Bình thường'}{rating === 4 && 'Hài lòng'}{rating === 5 && 'Rất hài lòng'}{rating === 0 && 'Chọn số sao'}
              </p>
            </div>

            <div>
              <p className="text-gray-600 text-sm mb-2">Điều gì bạn thích/không thích?</p>
              <div className="flex flex-wrap gap-2">
                {[...positiveTags, ...negativeTags].map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${quickTags.includes(tag) ? (positiveTags.includes(tag) ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200') : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-2">Chia sẻ thêm (tùy chọn)</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Nói thêm về trải nghiệm..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows={3} />
            </div>

            <button onClick={handleSubmit} disabled={rating === 0}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${rating === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}>
              Gửi đánh giá
            </button>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-600">Đánh giá của bạn đã được ghi nhận!</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Đóng</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RatingModal
