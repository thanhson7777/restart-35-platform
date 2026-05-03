import Navbar from '@/components/landing/Navbar'

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {children}
    </div>
  )
}

export default MainLayout
