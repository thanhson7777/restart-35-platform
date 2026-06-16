import Navbar from '@/components/landing/Navbar'

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        {children}
      </main>
    </div>
  )
}

export default MainLayout
