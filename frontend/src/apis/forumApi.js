import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const getCategories = (type = 'forum') => {
  return publicAxiosInstance.get(`${API_ROOT}/v1/forum/categories?type=${type}`)
}

const getPosts = (params) => {
  return publicAxiosInstance.get(`${API_ROOT}/v1/forum/posts`, { params })
}

const getMyPosts = (params) => {
  return authorizeAxiosInstance.get(`${API_ROOT}/v1/forum/posts/my-posts`, { params })
}

const getPostDetail = (id) => {
  return publicAxiosInstance.get(`${API_ROOT}/v1/forum/posts/${id}`)
}

const createPost = (data) => {
  return authorizeAxiosInstance.post(`${API_ROOT}/v1/forum/posts`, data)
}

const reactToPost = (id) => {
  return authorizeAxiosInstance.put(`${API_ROOT}/v1/forum/posts/${id}/react`)
}

const deletePost = (id) => {
  return authorizeAxiosInstance.delete(`${API_ROOT}/v1/forum/posts/${id}`)
}

const getComments = (postId) => {
  return publicAxiosInstance.get(`${API_ROOT}/v1/forum/posts/${postId}/comments`)
}

const createComment = (postId, data) => {
  return authorizeAxiosInstance.post(`${API_ROOT}/v1/forum/posts/${postId}/comments`, data)
}

export const forumApi = {
  getCategories,
  getPosts,
  getMyPosts,
  getPostDetail,
  createPost,
  reactToPost,
  deletePost,
  getComments,
  createComment
}
