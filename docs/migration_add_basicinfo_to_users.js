// Migration: Add basicInfo fields to users collection
// Run this script ONCE when deploying the BasicInfo-in-Registration feature

// Step 1: Add missing fields to existing worker users
db.users.updateMany(
  { role: 'worker' },
  {
    $set: {
      age: null,
      gender: null,
      province: '',
      district: '',
      education: '',
      maritalStatus: null
    }
  }
)

// Step 2: For existing worker_profiles that have basicInfo,
// copy it back to the users collection
const profiles = db.worker_profiles.find({ basicInfo: { $exists: true } })

profiles.forEach(profile => {
  const userId = profile.userId
  const basicInfo = profile.basicInfo

  db.users.updateOne(
    { _id: userId },
    {
      $set: {
        age: basicInfo.age || null,
        gender: basicInfo.gender || null,
        province: basicInfo.province || '',
        district: basicInfo.district || '',
        education: basicInfo.education || '',
        maritalStatus: basicInfo.maritalStatus || null
      }
    }
  )
  print(`Updated user: ${userId}`)
})

print('Migration completed successfully!')
print('Summary:')
print('  - Added basicInfo fields to all worker users')
print('  - Synced basicInfo from worker_profiles back to users')
print('')
print('Next steps:')
print('  1. Restart backend server')
print('  2. Restart frontend dev server')
print('  3. Test registration flow for new workers')
print('  4. Test WorkerProfilePage starts from Employment step')
