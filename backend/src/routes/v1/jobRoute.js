/**
 * Job Routes - Routes cho verify URL và report dead link
 * ========================================================
 */

import express from 'express';
import { verifyJobUrl, reportDeadLink, getJobById, getSimilarJobs } from '../../controllers/jobController.js';

const router = express.Router();

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
