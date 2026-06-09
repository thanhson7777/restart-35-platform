import mongoose from 'mongoose'

const forumPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 255 },
    content: { type: String, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    category: {
      type: String,
      enum: ['general', 'career', 'skills', 'mentor'],
      default: 'general',
    },
    tags: [{ type: String }],
    reactions: {
      thumbsUp: { type: Number, default: 0 },
      thumbsDown: { type: Number, default: 0 },
    },
    commentCount: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

forumPostSchema.index({ category: 1, createdAt: -1 })
forumPostSchema.index({ authorId: 1, createdAt: -1 })

export const forumPostModel = mongoose.model('ForumPost', forumPostSchema)
