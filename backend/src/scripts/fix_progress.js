import { GET_DB } from '~/config/mongodb'
import { scheduleModel } from '~/models/scheduleModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { enrollmentService } from '~/services/enrollmentService'

export const fixProgress = async () => {
  const schedules = await GET_DB().collection('schedules').find().toArray()
  let fixed = 0;
  for (const schedule of schedules) {
    if (!schedule.sessions) continue;
    for (const session of schedule.sessions) {
      if (session.attendance && session.attendance.length > 0) {
        for (const att of session.attendance) {
          if (att.status === 'present' || att.status === 'late') {
            const enroll = await enrollmentModel.findOneByUserAndCourse(att.userId, schedule.courseId)
            if (enroll) {
              await enrollmentService.completeItem(enroll._id, session.sessionNumber.toString(), att.userId)
              fixed++;
            }
          }
        }
      }
    }
  }
  console.log('Fixed progress for', fixed, 'records');
}
