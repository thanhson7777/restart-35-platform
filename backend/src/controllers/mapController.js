import { StatusCodes } from 'http-status-codes'
import { GET_DB } from '~/config/mongodb'

const getMapOpportunities = async (req, res) => {
  try {
    const { type } = req.query; // 'job', 'course', or undefined for both
    let jobs = [];
    let courses = [];

    const db = GET_DB();

    // 1. Fetch Jobs with coordinates
    if (!type || type === 'job') {
      jobs = (await db.collection('recruitment_jobs').find({
        status: 'published',
        'location.type': { $in: ['onsite', 'hybrid'] },
        'location.coordinates.lat': { $ne: null },
        'location.coordinates.lng': { $ne: null },
        _destroy: { $ne: true }
      }).project({
        _id: 1,
        'job.title': 1,
        'location.address': 1,
        'location.coordinates': 1,
        'job.salary': 1,
        'enterpriseInfo.name': 1
      }).toArray()).map(doc => ({
        _id: doc._id,
        title: doc.job?.title,
        location: doc.location,
        salary: doc.job?.salary,
        companyName: doc.enterpriseInfo?.name
      }));
    }

    // 2. Fetch Courses with coordinates
    if (!type || type === 'course') {
      courses = (await db.collection('courses').find({
        status: 'approved',
        'location.type': { $in: ['offline', 'hybrid'] },
        'location.coordinates.lat': { $ne: null },
        'location.coordinates.lng': { $ne: null },
        _destroy: { $ne: true }
      }).project({
        _id: 1,
        title: 1,
        'location.address': 1,
        'location.coordinates': 1,
        fee: 1,
        'provider.name': 1
      }).toArray()).map(doc => ({
        _id: doc._id,
        title: doc.title,
        location: doc.location,
        fee: doc.fee,
        providerName: doc.provider?.name
      }));
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        jobs,
        courses
      }
    });

  } catch (error) {
    console.error('Error fetching map opportunities:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

export const mapController = {
  getMapOpportunities
}
