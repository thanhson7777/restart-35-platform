import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { forumController } from '~/controllers/forumController'

const Router = express.Router()

// CATEGORIES
Router.get('/categories', forumController.getCategories)
Router.post('/categories', authMiddleware.isAuthorized, forumController.createCategory) // Should ideally be admin only

// POSTS
Router.route('/posts')
  .get(forumController.getPosts)
  .post(authMiddleware.isAuthorized, forumController.createPost)

// Cần đặt route /posts/my-posts trên /posts/:id để không bị nhầm id="my-posts"
Router.route('/posts/my-posts')
  .get(authMiddleware.isAuthorized, forumController.getMyPostsWithStats)

Router.route('/posts/:id')
  .get(forumController.getPostDetail)
  .delete(authMiddleware.isAuthorized, forumController.deletePost)

Router.route('/posts/:id/react')
  .put(authMiddleware.isAuthorized, forumController.toggleLike)

// COMMENTS
Router.get('/posts/:postId/comments', forumController.getComments)
Router.post('/posts/:postId/comments', authMiddleware.isAuthorized, forumController.createComment)

export default Router
