import express from 'express'
import { recruitmentJobController } from '~/controllers/recruitmentJobController'

const Router = express.Router()

// Lấy danh sách việc làm công khai (có filter/pagination)
Router.get('/',
  recruitmentJobController.getPublishedJobs
)

// Lấy dữ liệu map cho opportunity map
Router.get('/map-data',
  recruitmentJobController.getMapData
)

// Lấy việc làm tương tự
Router.get('/similar/:id',
  recruitmentJobController.getSimilarJobs
)

// Gợi ý việc làm cho worker
Router.get('/recommended',
  recruitmentJobController.getRecommendedJobs
)

// Lấy chi tiết việc làm công khai
Router.get('/:id',
  recruitmentJobController.getPublicJobById
)

export const publicJobRoute = Router
