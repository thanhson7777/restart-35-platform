import { env } from '~/config/enviroment'
import { escoTranslationOverrideModel } from '~/models/escoTranslationOverrideModel'

// LLM Provider configuration - can be OpenAI, Grok, Claude, etc.
const LLM_PROVIDERS = {
  OPENAI: 'openai',
  GROK: 'grok',
  CLAUDE: 'claude'
}

const DEFAULT_PROVIDER = LLM_PROVIDERS.OPENAI

class TranslationService {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours
  }

  /**
   * Translate text from English to Vietnamese
   */
  async translate(text, targetLang = 'vi') {
    if (targetLang !== 'vi') {
      return text
    }

    if (!text || text.trim().length === 0) {
      return text
    }

    // Check cache
    const cacheKey = `trans:${text}:${targetLang}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiry > Date.now()) {
      return cached.translation
    }

    // Check override table
    const override = await escoTranslationOverrideModel.findByOriginalText(text, targetLang)
    if (override?.overrideText) {
      this.cache.set(cacheKey, { translation: override.overrideText, expiry: Date.now() + this.cacheExpiry })
      return override.overrideText
    }

    // Use LLM to translate
    try {
      const translation = await this.translateWithLLM(text)
      this.cache.set(cacheKey, { translation, expiry: Date.now() + this.cacheExpiry })
      return translation
    } catch (error) {
      console.error('[TranslationService] LLM translation failed:', error.message)
      return text
    }
  }

  /**
   * Batch translate multiple texts
   */
  async batchTranslate(texts, targetLang = 'vi') {
    if (targetLang !== 'vi') {
      return texts
    }

    const results = await Promise.all(
      texts.map(text => this.translate(text, targetLang))
    )

    return results
  }

  /**
   * Translate occupation titles batch
   */
  async translateOccupations(occupations) {
    const results = []

    for (const occ of occupations) {
      const titleVi = await this.translate(occ.titleEn, 'vi')
      const descriptionVi = occ.descriptionEn
        ? await this.translate(occ.descriptionEn, 'vi')
        : ''

      results.push({
        ...occ,
        titleVi,
        descriptionVi
      })
    }

    return results
  }

  /**
   * Save translation override (manual correction)
   */
  async saveOverride(escoUri, field, originalText, overrideText, source = 'manual', reviewedBy = '') {
    const override = await escoTranslationOverrideModel.upsertByUriAndField({
      escoUri,
      field,
      language: 'vi',
      originalText,
      overrideText,
      source,
      reviewedBy,
      isApproved: true
    })

    // Update cache
    const cacheKey = `trans:${originalText}:vi`
    this.cache.set(cacheKey, { translation: overrideText, expiry: Date.now() + this.cacheExpiry })

    return override
  }

  /**
   * Get pending translations for review
   */
  async getPendingTranslations(limit = 50) {
    return await escoTranslationOverrideModel.getPending(limit)
  }

  /**
   * Approve a translation
   */
  async approveTranslation(id, reviewedBy) {
    return await escoTranslationOverrideModel.approve(id, reviewedBy)
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Translate using LLM
   */
  async translateWithLLM(text) {
    // Check if OpenAI API key is configured
    if (env.OPENAI_API_KEY) {
      return await this.translateWithOpenAI(text)
    }

    // Fallback: return original text if no LLM configured
    console.warn('[TranslationService] No LLM provider configured, returning original text')
    return text
  }

  /**
   * Translate using OpenAI
   */
  async translateWithOpenAI(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Bạn là chuyên gia dịch thuật tiếng Việt cho ngành nhân sự và việc làm.
Dịch các thuật ngữ nghề nghiệp từ tiếng Anh sang tiếng Việt.
QUY TẮC:
1. Dịch theo ngữ cảnh nghề nghiệp, không dịch word-by-word
2. Ưu tiên tên gọi phổ biến trong tin tuyển dụng Việt Nam
3. Ngắn gọn, dễ hiểu (2-5 từ)
4. Giữ nguyên các ký hiệu, mã, từ chuyên ngành
VÍ DỤ:
- "Welder" → "Thợ hàn"
- "Software Developer" → "Lập trình viên"
- "Sales Representative" → "Nhân viên kinh doanh"`
            },
            {
              role: 'user',
              content: `Dịch sang tiếng Việt: "${text}"`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content?.trim() || text
    } catch (error) {
      console.error('[TranslationService] OpenAI translation error:', error.message)
      throw error
    }
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache.clear()
  }
}

export const translationService = new TranslationService()
