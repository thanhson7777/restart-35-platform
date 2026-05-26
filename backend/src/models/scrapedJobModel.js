// backend/src/models/scrapedJobModel.js
// MongoDB Driver native model
import { GET_DB } from '../config/mongodb.js';

const COLLECTION_NAME = 'scraped_jobs';

class ScrapedJobModel {
  // ==================== STATIC METHODS ====================

  static getCollection() {
    return GET_DB().collection(COLLECTION_NAME);
  }

  // Tạo index
  static async createIndexes() {
    const collection = this.getCollection();
    await collection.createIndex({ scrapedJobId: 1 }, { unique: true });
    await collection.createIndex({ title: 1 });
    await collection.createIndex({ company: 1 });
    await collection.createIndex({ skills: 1 });
    await collection.createIndex({ location: 1 });
    await collection.createIndex({ province: 1 });
    await collection.createIndex({ salaryMin: 1 });
    await collection.createIndex({ salaryMax: 1 });
    await collection.createIndex({ type: 1 });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ source: 1 });
    await collection.createIndex({ scrapedAt: -1 });
    await collection.createIndex({ expiresAt: 1 });
    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ isActive: 1, scrapedAt: -1 });
    await collection.createIndex({ isActive: 1, qualityScore: -1 });
  }

  // Tạo job mới
  static async create(data) {
    const collection = this.getCollection();
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  // Tìm một document (tương thích Mongoose)
  static async findOne(query, projection = {}) {
    const collection = this.getCollection();
    const options = Object.keys(projection).length > 0 ? { projection } : {};
    return collection.findOne(query, options);
  }

  // Tìm nhiều document (tương thích Mongoose)
  static async find(query = {}, projection = {}) {
    const collection = this.getCollection();
    const options = Object.keys(projection).length > 0 ? { projection } : {};
    return collection.find(query, options).toArray();
  }

  // Query builder (tương thích Mongoose chain: .sort().limit())
  static findWithQuery(query = {}, projection = {}) {
    const collection = this.getCollection();
    const options = Object.keys(projection).length > 0 ? { projection } : {};
    return collection.find(query, options);
  }

  // Cập nhật một document (tương thích Mongoose)
  static async updateOne(query, update, options = {}) {
    const collection = this.getCollection();
    const result = await collection.updateOne(query, update, options);
    return result;
  }

  // Tìm và cập nhật (tương thích Mongoose)
  static async findOneAndUpdate(query, update, options = {}) {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(query, update, {
      returnDocument: 'after',
      ...options
    });
    return result;
  }

  // Đếm số lượng
  static async countDocuments(query = {}) {
    const collection = this.getCollection();
    return collection.countDocuments(query);
  }

  // Xóa một document
  static async deleteOne(query) {
    const collection = this.getCollection();
    return collection.deleteOne(query);
  }

  // ==================== INSTANCE METHODS ====================

  // Tính quality score
  static computeQualityScore(job) {
    let score = 0;
    if (job.title) score += 20;
    if (job.company) score += 10;
    const descLen = (job.description || '').length;
    if (descLen > 500) score += 20;
    else if (descLen > 100) score += 10;
    const skillsCount = Array.isArray(job.skills) ? job.skills.length : 0;
    if (skillsCount >= 3) score += 15;
    else if (skillsCount >= 1) score += 5;
    if (job.salaryMin && job.salaryMax) score += 15;
    else if (job.salaryMin || job.salaryMax) score += 5;
    if (job.location) score += 10;
    if (job.experienceRequired !== undefined) score += 10;
    return score;
  }

  // Tìm jobs tương tự
  static async findSimilar(scrapedJobId, limit = 5) {
    const collection = this.getCollection();
    const job = await this.findOne({ scrapedJobId });
    if (!job || !job.skills?.length) return [];

    const cursor = collection.find({
      scrapedJobId: { $ne: scrapedJobId },
      isActive: true,
      $or: [
        { skills: { $elemMatch: { $in: job.skills } } },
        { location: job.location },
        { category: job.category }
      ]
    }).sort({ qualityScore: -1, scrapedAt: -1 }).limit(limit);

    return cursor.toArray();
  }

  // Cập nhật URL status
  static async updateUrlStatus(scrapedJobId, status) {
    return this.updateOne(
      { scrapedJobId },
      {
        $set: {
          urlStatus: status,
          lastVerifiedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  // Tăng view count
  static async incrementViewCount(scrapedJobId) {
    return this.updateOne(
      { scrapedJobId },
      { $inc: { viewCount: 1 } }
    );
  }
}

export default ScrapedJobModel;
