import React from 'react'

const RestartIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
    <path d="M24 8C24 8 16 16 16 24C16 32 24 40 24 40C24 40 32 32 32 24C32 16 24 8 24 8Z" fill="currentColor" opacity="0.2" />
    <path d="M24 12C24 12 18 18 18 24C18 30 24 36 24 36C24 36 30 30 30 24C30 18 24 12 24 12Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="24" r="4" fill="currentColor" />
  </svg>
)

function AuthSidebar() {
  return (
    <div className="hidden lg:flex flex-col justify-between text-white p-10 min-h-full w-full h-full relative overflow-hidden">
      {/* Full-cover background image */}
      <img
        src="/images/bg-image.jpg"
        alt="RESTART-35 Platform"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/70 to-blue-700/80 z-[1]" />

      {/* Logo & Branding */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <RestartIcon className="w-10 h-10" />
          <span className="text-2xl font-bold tracking-tight">RESTART-35</span>
        </div>
        <p className="text-white/70 text-sm ml-0.5">Nền tảng học tập & việc làm</p>
      </div>

      {/* Main content - centered */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full">
          <h2 className="text-2xl font-bold leading-tight mb-2 text-center">
            Mở ra cánh cửa<br />tương lai nghề nghiệp
          </h2>
          <p className="text-white/80 text-sm leading-relaxed text-center">
            Học nghề chất lượng cao, kết nối việc làm phù hợp và xây dựng sự nghiệp bền vững cùng cộng đồng RESTART-35.
          </p>
        </div>
      </div>

    </div>
  )
}

export { AuthSidebar }
