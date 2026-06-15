import { useState, useEffect } from 'react'
import { forumApi } from '@/apis/forumApi'
import CommunityPostSidebar from './CommunityPostSidebar'
import CommunityPostFeed from './CommunityPostFeed'

export default function CommunityForumSection() {
  const [categories, setCategories] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await forumApi.getCategories('forum')
        if (res.data?.success) {
          setCategories(res.data.data)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Sidebar: 25% on desktop */}
      <div className="w-full lg:w-1/4">
        <CommunityPostSidebar 
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
        />
      </div>

      {/* Main Feed: 75% on desktop */}
      <div className="w-full lg:w-3/4">
        <CommunityPostFeed 
          categories={categories}
          activeCategoryId={activeCategoryId}
        />
      </div>
    </div>
  )
}
