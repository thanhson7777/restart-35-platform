// MongoDB Driver native model for skill_synonyms collection
import { GET_DB } from '~/config/mongodb'
import { normalizeSkill } from '~/utils/skillNormalizer'

const COLLECTION_NAME = 'skill_synonyms'

class SkillSynonymModel {
  static getCollection() {
    return GET_DB().collection(COLLECTION_NAME)
  }

  // Tạo indexes cho collection
  static async createIndexes() {
    const collection = this.getCollection()
    await collection.createIndex({ primary_skill: 1 })
    await collection.createIndex({ normalized_key: 1 }, { unique: true })
    await collection.createIndex({ aliases: 1 })
    await collection.createIndex({ category: 1 })
  }

  // Tìm document theo normalized_key
  static async findByNormalizedKey(key) {
    return this.getCollection().findOne({ normalized_key: key })
  }

  // Tìm document bằng alias
  static async findByAlias(alias) {
    return this.getCollection().findOne({ aliases: alias.toLowerCase() })
  }

  // Tìm primary_skill từ một alias hoặc normalized key
  static async resolveSkill(input) {
    const normalized = normalizeSkill(input)
    const doc = await this.getCollection().findOne({
      $or: [
        { normalized_key: normalized },
        { aliases: normalized }
      ]
    })
    return doc ? doc.primary_skill : null
  }

  // Upsert một synonym document (không ghi đè nếu đã tồn tại)
  static async upsert(data) {
    const normalized = normalizeSkill(data.primary_skill)
    return this.getCollection().updateOne(
      { normalized_key: normalized },
      {
        $setOnInsert: {
          ...data,
          normalized_key: normalized,
          createdAt: new Date()
        },
        $set: {
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
  }

  // Lấy toàn bộ synonym map dưới dạng dict: alias → primary_skill
  static async getAllAsDict() {
    const docs = await this.getCollection().find({}).toArray()
    const dict = {}
    for (const doc of docs) {
      for (const alias of doc.aliases) {
        dict[alias.toLowerCase()] = doc.primary_skill
      }
      dict[doc.normalized_key] = doc.primary_skill
    }
    return dict
  }

  // Tìm tất cả synonyms liên quan đến một skill
  static async findRelated(primarySkill) {
    const normalized = normalizeSkill(primarySkill)
    return this.getCollection().findOne({
      $or: [
        { primary_skill: primarySkill },
        { normalized_key: normalized },
        { aliases: normalized }
      ]
    })
  }

  // Đếm tổng số synonym documents
  static async count() {
    return this.getCollection().countDocuments()
  }
}

export default SkillSynonymModel
