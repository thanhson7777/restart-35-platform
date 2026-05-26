/**
 * Job Controller - Xử lý verify URL và report dead link
 * ========================================================
 */

import axios from 'axios';
import ScrapedJob from '../models/scrapedJobModel.js';

/**
 * Verify URL - HEAD request để kiểm tra link còn sống không
 * POST /v1/jobs/:id/verify
 */
export const verifyJobUrl = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm job trong MongoDB
    let job = await ScrapedJob.findOne({ scrapedJobId: id });

    // Nếu không có trong MongoDB (fallback: jobs từ CSV chưa import)
    if (!job) {
      // Trả về unknown - frontend sẽ thử mở link trực tiếp
      return res.json({
        success: true,
        isAlive: null,
        message: 'Job not in MongoDB yet',
        jobId: id
      });
    }

    const sourceUrl = job.sourceUrl;

    if (!sourceUrl) {
      return res.json({
        success: true,
        isAlive: false,
        error: 'No URL available',
        jobId: id
      });
    }

    // HEAD request để check URL
    try {
      const response = await axios.head(sourceUrl, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      const isAlive = response.status >= 200 && response.status < 400;

      // Cập nhật status trong MongoDB
      await ScrapedJob.updateOne(
        { _id: job._id },
        {
          $set: {
            isActive: isAlive,
            'urlStatus.code': response.status,
            'urlStatus.isAlive': isAlive,
            'urlStatus.errorMessage': null,
            lastVerifiedAt: new Date()
          }
        }
      );

      return res.json({
        success: true,
        isAlive,
        status: response.status,
        jobId: id
      });

    } catch (error) {
      // URL không accessible
      const errorMessage = error.message || 'Connection failed';

      await ScrapedJob.updateOne(
        { _id: job._id },
        {
          $set: {
            isActive: false,
            'urlStatus.isAlive': false,
            'urlStatus.errorMessage': errorMessage,
            lastVerifiedAt: new Date()
          }
        }
      );

      return res.json({
        success: true,
        isAlive: false,
        error: errorMessage,
        jobId: id
      });
    }

  } catch (error) {
    console.error('Error verifying job URL:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Report dead link - User báo link chết
 * POST /v1/jobs/report-dead
 */
export const reportDeadLink = async (req, res) => {
  try {
    const { jobId, userId } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'jobId is required'
      });
    }

    // Cập nhật MongoDB
    await ScrapedJob.updateOne(
      { scrapedJobId: jobId },
      {
        $set: {
          isActive: false,
          'urlStatus.isAlive': false,
          'urlStatus.errorMessage': 'User reported dead link'
        },
        $inc: { clickCount: -1 }
      }
    );

    // Log interaction (nếu có userId)
    if (userId) {
      try {
        const Interaction = (await import('../models/interactionModel.js')).default;
        await Interaction.create({
          userId,
          jobId,
          action: 'dead_link_report',
          metadata: {
            reportedAt: new Date(),
            source: 'job_detail_modal'
          }
        });
      } catch (interactionError) {
        // Ignore interaction logging errors
        console.warn('Could not log interaction:', interactionError.message);
      }
    }

    return res.json({
      success: true,
      message: 'Cảm ơn bạn đã báo cáo!',
      jobId
    });

  } catch (error) {
    console.error('Error reporting dead link:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get job by ID from MongoDB
 * GET /v1/jobs/:id
 */
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await ScrapedJob.findOne(
      { scrapedJobId: id },
      { _id: 0, __v: 0 }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Increment view count
    await ScrapedJob.updateOne(
      { scrapedJobId: id },
      { $inc: { viewCount: 1 } }
    );

    return res.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Error getting job by ID:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get similar jobs
 * GET /v1/jobs/:id/similar
 */
export const getSimilarJobs = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const job = await ScrapedJob.findOne({ scrapedJobId: id });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Find similar jobs based on skills and location
    const similarJobs = await ScrapedJob.find(
      {
        scrapedJobId: { $ne: id },
        isActive: true,
        $or: [
          { skills: { $in: job.skills } },
          { location: job.location },
          { category: job.category }
        ]
      },
      { _id: 0, __v: 0 }
    )
    .sort({ qualityScore: -1, scrapedAt: -1 })
    .limit(limit);

    return res.json({
      success: true,
      data: similarJobs
    });

  } catch (error) {
    console.error('Error getting similar jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
