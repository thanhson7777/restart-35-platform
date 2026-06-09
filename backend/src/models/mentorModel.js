import mongoose from 'mongoose'

const mentorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
      unique: true,
    },
    expertise: [{ type: String }],
    bio: { type: String, maxlength: 1000 },
    availability: { type: String, default: 'available' },
    rating: { type: Number, default: 0 },
    sessionCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

mentorSchema.index({ expertise: 1 })
mentorSchema.index({ isActive: 1, rating: -1 })

export const mentorModel = mongoose.model('Mentor', mentorSchema)
