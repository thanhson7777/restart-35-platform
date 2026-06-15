import { forumPostModel } from '~/models/forumPostModel'
import { commentModel } from '~/models/commentModel'
import { communityCategoryModel } from '~/models/communityCategoryModel'

const getCategories = async (type = 'forum') => {
  try {
    return await communityCategoryModel.findAllByType(type)
  } catch (error) {
    throw error
  }
}

const createCategory = async (data) => {
  try {
    return await communityCategoryModel.createNew(data)
  } catch (error) {
    throw error
  }
}

const createPost = async (authorId, data) => {
  try {
    const newPostData = {
      ...data,
      authorId
    }
    const created = await forumPostModel.createNew(newPostData)
    const post = await forumPostModel.getPostDetail(created.insertedId)
    return post
  } catch (error) {
    throw error
  }
}

const getPosts = async (filter, skip, limit) => {
  try {
    return await forumPostModel.getPosts(filter, skip, limit)
  } catch (error) {
    throw error
  }
}

const getPostDetail = async (postId) => {
  try {
    return await forumPostModel.getPostDetail(postId)
  } catch (error) {
    throw error
  }
}

const toggleLike = async (postId, userId) => {
  try {
    const result = await forumPostModel.toggleLike(postId, userId)
    return result.value || result
  } catch (error) {
    throw error
  }
}

const createComment = async (authorId, postId, content) => {
  try {
    const newComment = {
      postId,
      authorId,
      content
    }
    await commentModel.createNew(newComment)
    await forumPostModel.updateCommentCount(postId, 1)
    
    // Fetch all comments to return the updated list (or just the new comment)
    // Here we'll return all comments for simplicity of frontend state
    return await commentModel.getCommentsByPostId(postId)
  } catch (error) {
    throw error
  }
}

const getComments = async (postId) => {
  try {
    return await commentModel.getCommentsByPostId(postId)
  } catch (error) {
    throw error
  }
}

const getMyPostsWithStats = async (authorId, skip, limit) => {
  try {
    return await forumPostModel.getMyPostsWithStats(authorId, skip, limit)
  } catch (error) {
    throw error
  }
}

const deletePost = async (postId, authorId) => {
  try {
    const result = await forumPostModel.deletePost(postId, authorId)
    if (!result) {
      throw new Error('Bài viết không tồn tại hoặc bạn không có quyền xóa')
    }
    return result
  } catch (error) {
    throw error
  }
}

export const forumService = {
  getCategories,
  createCategory,
  createPost,
  getPosts,
  getPostDetail,
  toggleLike,
  createComment,
  getComments,
  getMyPostsWithStats,
  deletePost
}
