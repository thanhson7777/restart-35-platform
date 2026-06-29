import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicWorkerProfileAPI } from '@/apis/profileAPI';
import { Navbar, Footer } from '@/components/landing';
import { Badge, Button, Card, Avatar } from '@/components/ui';
import { ArrowLeft, Rocket, Mail, Phone, Calendar, Briefcase, Award, GraduationCap, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatter';
import dayjs from 'dayjs';

const WorkerPublicProfilePage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getPublicWorkerProfileAPI(id);
        if (res.success) {
          setProfileData(res.data);
        } else {
          setError('Không thể tải thông tin.');
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Lỗi khi tải thông tin người lao động.');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProfile();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pt-[88px]">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pt-[88px]">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy hồ sơ</h2>
          <p className="text-gray-500 mb-6">{error || 'Hồ sơ không tồn tại hoặc đã bị ẩn.'}</p>
          <Button asChild><Link to="/community?tab=campaigns">Quay lại cộng đồng</Link></Button>
        </div>
      </div>
    );
  }

  const { user, profile, campaigns } = profileData;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-[88px]">
      <Navbar />
      
      <main className="flex-1 pb-16">
        {/* Cover & Avatar Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-48 md:h-64 relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="container mx-auto px-4 h-full relative">
            <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white mt-6" asChild>
              <Link to="/community?tab=campaigns" className="flex items-center">
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
              </Link>
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-5xl -mt-20 relative z-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center md:items-end">
            <Avatar 
              src={user.avatar} 
              fallback={user.displayName?.charAt(0) || 'W'}
              className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-lg bg-white rounded-full object-cover" 
            />
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
                <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-100 self-center">Người lao động xác thực</Badge>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Tham gia từ {dayjs(user.createdAt).format('MM/YYYY')}
                </div>
                {user.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" /> {user.email}
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" /> {user.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left Column: Experience, Barriers, Certificates */}
            <div className="lg:col-span-1 space-y-6">
              {/* Kinh nghiệm làm việc */}
              <Card className="p-6 border-gray-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" /> Kinh nghiệm làm việc
                  </h3>
                  {profile?.experience && profile.experience.length > 0 ? (
                    <ul className="space-y-4">
                      {profile.experience.map((job, idx) => {
                        const jobTitle = typeof job.occupation === 'string' 
                          ? job.occupation 
                          : (job.occupation?.titleVi || job.occupation?.titleEn || job.position || 'Chưa cập nhật vị trí');
                        
                        const jobTypeLabel = {
                          'full-time': 'Toàn thời gian',
                          'part-time': 'Bán thời gian',
                          'temporary': 'Thời vụ / Khoán việc',
                          'freelance': 'Làm tự do'
                        }[job.jobType] || job.jobType || '';

                        const durationStr = () => {
                          if (!job.duration) return 'Chưa cập nhật thời gian';
                          const y = Math.floor(job.duration / 12);
                          const m = job.duration % 12;
                          const parts = [];
                          if (y > 0) parts.push(`${y} năm`);
                          if (m > 0) parts.push(`${m} tháng`);
                          return parts.join(' ');
                        };

                        return (
                          <li key={idx} className="border-l-2 border-blue-100 pl-4 pb-4">
                            <div className="font-semibold text-gray-900">{jobTitle}</div>
                            <div className="text-sm text-gray-600 font-medium">{job.companyName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {durationStr()} {jobTypeLabel && `• ${jobTypeLabel}`} {job.industry && `• ${job.industry}`}
                            </div>
                            {job.skills && job.skills.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {job.skills.map((skill, sIdx) => {
                                  const skillName = typeof skill === 'string' ? skill : (skill.titleVi || skill.titleEn || skill.name);
                                  return (
                                    <Badge key={sIdx} variant="secondary" className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 text-xs">
                                      {skillName}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Chưa có thông tin kinh nghiệm làm việc.</p>
                  )}
                </div>
              </Card>

              {/* Rào cản & Thách thức */}
              <Card className="p-6 border-gray-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" /> Rào cản & Thách thức
                  </h3>
                  {profile?.barriers && Object.keys(profile.barriers).some(k => profile.barriers[k] === true) ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.barriers.health && <Badge variant="outline" className="text-gray-700 bg-orange-50 border-orange-200">Sức khỏe</Badge>}
                      {profile.barriers.family && <Badge variant="outline" className="text-gray-700 bg-orange-50 border-orange-200">Gia đình</Badge>}
                      {profile.barriers.techGap && <Badge variant="outline" className="text-gray-700 bg-orange-50 border-orange-200">Thiếu kỹ năng công nghệ</Badge>}
                      {profile.barriers.location && <Badge variant="outline" className="text-gray-700 bg-orange-50 border-orange-200">Vị trí địa lý</Badge>}
                      {profile.barriers.other && profile.barriers.otherDescription && (
                        <Badge variant="outline" className="text-gray-700 bg-orange-50 border-orange-200">{profile.barriers.otherDescription}</Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Không có rào cản đáng kể.</p>
                  )}
                </div>
              </Card>

              {/* Chứng chỉ / Đào tạo */}
              {(profile?.certificates && profile.certificates.length > 0) ? (
                <Card className="p-6 border-gray-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" /> Chứng chỉ / Đào tạo
                    </h3>
                    <ul className="space-y-4">
                      {profile.certificates.map((cert, idx) => (
                        <li key={idx} className="border-l-2 border-blue-100 pl-4 pb-2">
                          <div className="font-semibold text-gray-900">{cert.courseTitle || cert.name || 'Chứng chỉ hoàn thành khóa học'}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {cert.trainerName || cert.organization || 'Restart35'} • {cert.issuedDate ? dayjs(cert.issuedDate).format('MM/YYYY') : cert.year || ''}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 border-gray-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" /> Chứng chỉ / Đào tạo
                    </h3>
                    <p className="text-gray-400 italic text-sm">Chưa có thông tin chứng chỉ.</p>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column: Campaigns */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Rocket className="w-6 h-6 text-blue-600" />
                Dự án khởi nghiệp
              </h2>
              
              {campaigns && campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campaigns.map((camp) => {
                    const progress = camp.targetAmount > 0 ? Math.min(100, Math.round((camp.raisedAmount / camp.targetAmount) * 100)) : 0;
                    return (
                      <Card key={camp._id} className="overflow-hidden flex flex-col hover:shadow-md transition-all border-gray-200">
                        <div className="aspect-video bg-gray-100 relative group">
                          {camp.images && camp.images[0] ? (
                            <img src={camp.images[0]} alt={camp.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-200">
                              <Rocket className="w-12 h-12 mb-2" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-2">
                            {camp.status === 'funding' && <Badge className="bg-blue-500 text-white border-0">Đang gọi vốn</Badge>}
                            {camp.status === 'completed' && <Badge className="bg-green-500 text-white border-0">Thành công</Badge>}
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-base mb-1 line-clamp-2 leading-tight">
                            <Link to={`/community/campaigns/${camp._id}`} className="hover:text-blue-600 transition-colors">{camp.title}</Link>
                          </h3>
                          <p className="text-xs text-gray-500 mb-4 line-clamp-2">{camp.description}</p>
                          
                          <div className="mt-auto space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-bold text-gray-900">{formatCurrency(camp.raisedAmount)}</span>
                              <span className="text-gray-500">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center">
                  <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có dự án nào</h3>
                  <p className="text-gray-500 text-sm">Người lao động này hiện chưa kêu gọi dự án khởi nghiệp nào.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WorkerPublicProfilePage;
