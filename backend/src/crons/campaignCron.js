import cron from 'node-cron'
import { campaignModel } from '~/models/campaignModel'
import { campaignService } from '~/services/campaignService'

// Run every hour to check for expired campaigns
export const campaignCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      // Find campaigns that are in 'funding' status and their deadline has passed
      const { campaigns } = await campaignModel.getCampaigns(0, 1000, {
        status: 'funding',
        deadline: { $lt: Date.now() }
      })

      for (const campaign of campaigns) {
        if (campaign.raisedAmount > 0) {
          // Has funds, process payout
          await campaignService.processCampaignPayout(campaign._id)
        } else {
          // No funds, just cancel
          await campaignModel.update(campaign._id, { status: 'cancelled' })
        }
      }
    } catch (error) {
      console.error('Error running campaignCron:', error)
    }
  })
}
