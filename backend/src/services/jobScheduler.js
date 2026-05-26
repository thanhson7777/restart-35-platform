/**
 * Job Scheduler - URL Verification Service
 * =========================================
 * Chạy định kỳ để:
 * - Verify active job URLs hàng ngày
 * - Cleanup expired/inactive jobs
 */

import cron from 'node-cron';
import axios from 'axios';
import ScrapedJob from '../models/scrapedJobModel.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verify một job URL
 */
export async function verifySingleJob(job) {
  try {
    const response = await axios.head(job.sourceUrl, {
      timeout: 5000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    const isAlive = response.status >= 200 && response.status < 400;

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

    return { jobId: job.scrapedJobId, isAlive, status: response.status };

  } catch (error) {
    await ScrapedJob.updateOne(
      { _id: job._id },
      {
        $set: {
          isActive: false,
          'urlStatus.isAlive': false,
          'urlStatus.errorMessage': error.message,
          lastVerifiedAt: new Date()
        }
      }
    );

    return { jobId: job.scrapedJobId, isAlive: false, error: error.message };
  }
}

/**
 * Khởi tạo scheduler
 */
export function initJobScheduler() {
  console.log('[JobScheduler] Initializing job URL verification scheduler...');

  // Chạy mỗi ngày lúc 3h sáng
  // Verify 200 jobs active, chưa verify > 7 ngày
  cron.schedule('0 3 * * *', async () => {
    console.log('[JobScheduler] Starting daily URL verification...');

    try {
      const jobs = await ScrapedJob.find({
        isActive: true,
        lastVerifiedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .sort({ lastVerifiedAt: 1 })
      .limit(200)
      .select('_id scrapedJobId sourceUrl source lastVerifiedAt');

      console.log(`[JobScheduler] Verifying ${jobs.length} jobs...`);

      let aliveCount = 0;
      let deadCount = 0;

      for (const job of jobs) {
        const result = await verifySingleJob(job);

        if (result.isAlive) {
          aliveCount++;
        } else {
          deadCount++;
        }

        // Delay 1 giây giữa các requests để tránh spam
        await sleep(1000);
      }

      console.log(`[JobScheduler] Done. Alive: ${aliveCount}, Dead: ${deadCount}`);

    } catch (error) {
      console.error('[JobScheduler] Error during verification:', error);
    }
  });

  // Chạy mỗi tuần Chủ Nhật lúc 4h sáng
  // Cleanup: đánh dấu expired jobs
  cron.schedule('0 4 * * 0', async () => {
    console.log('[JobScheduler] Running weekly cleanup (expired jobs)...');

    try {
      const result = await ScrapedJob.updateMany(
        {
          expiresAt: { $lt: new Date() },
          isActive: true
        },
        {
          $set: {
            isActive: false,
            'urlStatus.isAlive': false,
            'urlStatus.errorMessage': 'Expired (past expiresAt)'
          }
        }
      );

      console.log(`[JobScheduler] Marked ${result.modifiedCount} jobs as inactive (expired)`);

    } catch (error) {
      console.error('[JobScheduler] Error during expired cleanup:', error);
    }
  });

  // Chạy mỗi ngày lúc 5h sáng
  // Cleanup: xóa jobs scraped > 90 ngày và inactive
  cron.schedule('0 5 * * *', async () => {
    console.log('[JobScheduler] Running old inactive jobs cleanup...');

    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await ScrapedJob.deleteMany({
        scrapedAt: { $lt: ninetyDaysAgo },
        isActive: false
      });

      console.log(`[JobScheduler] Deleted ${result.deletedCount} old inactive jobs`);

    } catch (error) {
      console.error('[JobScheduler] Error during old jobs cleanup:', error);
    }
  });

  console.log('[JobScheduler] Initialized. Schedules: daily@3AM, weekly@4AM Sun, daily@5AM');
}

/**
 * Manual verification (for admin/debugging)
 */
export async function verifyAllJobs(limit = 100) {
  console.log(`[JobScheduler] Manual verify: checking ${limit} jobs...`);

  const jobs = await ScrapedJob.find({ isActive: true })
    .sort({ lastVerifiedAt: 1 })
    .limit(limit);

  let aliveCount = 0;
  let deadCount = 0;

  for (const job of jobs) {
    const result = await verifySingleJob(job);
    if (result.isAlive) aliveCount++;
    else deadCount++;
    await sleep(500);
  }

  console.log(`[JobScheduler] Manual verify done. Alive: ${aliveCount}, Dead: ${deadCount}`);
  return { aliveCount, deadCount };
}
