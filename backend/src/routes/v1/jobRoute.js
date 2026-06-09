/**
 * Job Routes - Routes cho verify URL và report dead link
 * ========================================================
 */

import express from 'express';
import { verifyJobUrl, reportDeadLink, getJobById, getSimilarJobs } from '../../controllers/jobController.js';
import ScrapedJob from '../../models/scrapedJobModel.js';

const router = express.Router();

/**
 * @route   GET /v1/jobs/map-data
 * @desc    Lấy dữ liệu jobs có tọa độ cho bản đồ
 * @access  Public
 */
router.get('/map-data', async (req, res, next) => {
  try {
    const jobs = await ScrapedJob.find({})
      .select('scrapedJobId title companyName location salary jobType tags benefitsRequirements jobUrl platform')
      .limit(500)
      .lean();

    const data = jobs
      .filter(j => j.location && typeof j.location === 'string')
      .map(j => ({
        _id: j.scrapedJobId,
        title: j.title,
        companyName: j.companyName,
        location: j.location,
        lat: null,
        lng: null,
        salary: j.salary,
        jobType: j.jobType,
        tags: j.tags,
        benefits: j.benefitsRequirements,
        jobUrl: j.jobUrl,
        platform: j.platform,
      }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /v1/jobs/:id/verify
 * @desc    Verify URL còn sống không (HEAD request)
 * @access  Public
 */
router.post('/:id/verify', verifyJobUrl);

/**
 * @route   POST /v1/jobs/report-dead
 * @desc    User báo link chết
 * @access  Public
 */
router.post('/report-dead', reportDeadLink);

/**
 * @route   GET /v1/jobs/:id
 * @desc    Lấy chi tiết 1 job từ MongoDB
 * @access  Public
 */
router.get('/:id', getJobById);

/**
 * @route   GET /v1/jobs/:id/similar
 * @desc    Lấy jobs tương tự
 * @access  Public
 */
router.get('/:id/similar', getSimilarJobs);

export const jobRoute = router;
