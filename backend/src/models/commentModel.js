import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    content: { type: String, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    reactions: {
      thumbsUp: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

commentSchema.index({ postId: 1, createdAt: 1 })

export const commentModel = mongoose.model('Comment', commentSchema)
