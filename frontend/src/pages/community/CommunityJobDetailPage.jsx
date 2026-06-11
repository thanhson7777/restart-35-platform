import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, Clock, Building, ArrowLeft, Loader2, Send, CheckCircle, AlertCircle, Users, Sparkles, ArrowRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CurrencyDollar, BookmarkSimple } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Badge, Button } from '@/components/ui';
import { Navbar } from '@/components/landing';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchJobDetails,
  submitApplication,
  fetchSimilarJobs,
  selectSelectedJob,
  selectJobsLoading,
  selectSimilarJobs,
  selectSimilarJobsLoading
} from '@/redux/recruitment/recruitmentSlice';
import toast from 'react-hot-toast';

const formatSalary = (salary) => {
  if (!salary || (!salary.min && !salary.max)) return 'Thoả thuận';
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  if (salary.min && salary.max) return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`;
  if (salary.min) return `Từ ${formatter.format(salary.min)}`;
  if (salary.max) return `Đến ${formatter.format(salary.max)}`;
  return 'Thoả thuận';
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDeadline = (date) => {
  if (!date) return 'Không giới hạn';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Đã hết hạn';
  if (diffDays === 0) return 'Hết hạn hôm nay';
  if (diffDays === 1) return 'Còn 1 ngày';
  if (diffDays <= 7) return `Còn ${diffDays} ngày`;
  return `Hạn nộp: ${formatDate(date)}`;
};

const JOB_TYPE_LABELS = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  'temporary': 'Tạm thời',
  'freelance': 'Freelance',
  'internship': 'Thực tập',
};

const LOCATION_TYPE_LABELS = {
  onsite: 'Tại văn phòng',
  remote: 'Từ xa',
  hybrid: 'Kết hợp',
};

// Fix Leaflet default icon broken in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function CommunityJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const job = useSelector(selectSelectedJob);
  const loading = useSelector(selectJobsLoading);
  const similarJobs = useSelector(selectSimilarJobs);
  const similarLoading = useSelector(selectSimilarJobsLoading);
  const [isSaved, setIsSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [mapCoords, setMapCoords] = useState(null); // { lat, lng }

  // Resolve map coordinates: use stored coords, otherwise geocode address
  useEffect(() => {
    if (!job) return;

    const coords = job.location?.coordinates;
    if (coords?.lat != null && coords?.lng != null) {
      setMapCoords({ lat: coords.lat, lng: coords.lng });
      return;
    }

    // Fallback: geocode from address via Nominatim (free, no API key)
    const addressParts = [
      job.location?.address,
      job.location?.district,
      job.location?.province,
    ].filter(Boolean);
    if (!addressParts.length) {
      setMapCoords(null);
      return;
    }

    const address = addressParts.join(', ');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=vn`;

    fetch(url, { headers: { 'Accept-Language': 'vi' } })
      .then(res => res.json())
      .then(data => {
        if (data?.[0]?.lat && data?.[0]?.lon) {
          setMapCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
          setMapCoords(null);
        }
      })
      .catch(() => setMapCoords(null));
  }, [job]);

  useEffect(() => {
    dispatch(fetchJobDetails(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (job?._id) {
      dispatch(fetchSimilarJobs({ jobId: job._id, limit: 4 }));
    }
  }, [job, dispatch]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await dispatch(submitApplication({ jobId: id, data: {} })).unwrap();
      toast.success('Ứng tuyển thành công!');
      setApplied(true);
    } catch (err) {
      toast.error(err || 'Không thể ứng tuyển. Vui lòng thử lại.');
    } finally {
      setApplying(false);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Đã bỏ lưu tin' : 'Đã lưu tin tuyển dụng');
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--primary))]" />
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Không tìm thấy tin tuyển dụng</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Tin tuyển dụng này có thể đã bị xóa hoặc không còn hoạt động.
            </p>
            <Button onClick={() => navigate('/community')} variant="outline">
              <ArrowLeft size={14} className="mr-2" /> Quay lại Cộng đồng
            </Button>
          </div>
        </div>
      </>
    );
  }

  const isExpired = job.deadline && new Date(job.deadline) < new Date();
  const isDeadlineSoon = job.deadline && !isExpired && (new Date(job.deadline) - new Date()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--border))] shadow-sm">
          <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" size="sm" onClick={() => navigate('/community')} className="mb-4">
              <ArrowLeft size={14} className="mr-1" /> Quay lại Cộng đồng
            </Button>

            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              {/* Enterprise Info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center overflow-hidden shrink-0">
                  {job.enterpriseInfo?.logo ? (
                    <img src={job.enterpriseInfo.logo} alt={job.enterpriseInfo?.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building size={28} className="text-[hsl(var(--muted-foreground))]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                      {job.job?.title || job.title}
                    </h1>
                    {job.enterpriseInfo?.verified && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                        <CheckCircle size={12} className="mr-1" /> Đã xác minh
                      </Badge>
                    )}
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] font-medium">
                    {job.enterpriseInfo?.name || job.enterprise?.name || 'Doanh nghiệp'}
                  </p>
                  {job.enterpriseInfo?.industry && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {job.enterpriseInfo.industry}
                      {job.enterpriseInfo?.size && ` • ${job.enterpriseInfo.size}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  onClick={handleSave}
                  className="gap-2"
                >
                  <BookmarkSimple size={16} weight={isSaved ? 'fill' : 'regular'} />
                  {isSaved ? 'Đã lưu' : 'Lưu tin'}
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={applying || applied || isExpired}
                  className="gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/90]"
                >
                  {applying ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : applied ? (
                    <>
                      <CheckCircle size={16} /> Đã ứng tuyển
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Ứng tuyển ngay
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Badge variant="outline">
                {JOB_TYPE_LABELS[job.job?.type] || job.type || 'Toàn thời gian'}
              </Badge>
              {job.location?.type && (
                <Badge variant="outline">
                  {LOCATION_TYPE_LABELS[job.location.type] || job.location.type}
                </Badge>
              )}
              {job.stats?.applications > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Users size={12} /> {job.stats.applications} ứng viên
                </Badge>
              )}
            </div>

            {/* Deadline Urgency Banner */}
            {isDeadlineSoon && !isExpired && job.deadline && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <Sparkles size={18} className="text-amber-500 fill-current shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">
                    Ứng tuyển sớm — hạn nộp còn {formatDeadline(job.deadline).replace('Hạn nộp: ', '')}
                  </p>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Tin tuyển dụng này đã hết hạn nộp đơn.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <CurrencyDollar size={20} className="text-emerald-600 mb-2" />
                    <p className="font-semibold text-sm">
                      {formatSalary(job.salary || job.job?.salary)}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Mức lương</p>
                  </CardContent>
                </Card>
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <MapPin size={20} className="text-blue-600 mb-2" />
                    <p className="font-semibold text-sm">
                      {job.location?.province || job.province || '—'}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Địa điểm</p>
                  </CardContent>
                </Card>
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Briefcase size={20} className="text-purple-600 mb-2" />
                    <p className="font-semibold text-sm">
                      {job.requirements?.experience ?? job.job?.requirements?.experience ?? 0} năm
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Kinh nghiệm</p>
                  </CardContent>
                </Card>
                <Card className={`bg-[hsl(var(--card))] border-[hsl(var(--border))] ${isDeadlineSoon ? 'border-amber-300' : ''}`}>
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Clock size={20} className={isExpired ? 'text-red-500 mb-2' : 'text-orange-600 mb-2'} />
                    <p className={`font-semibold text-sm ${isExpired ? 'text-red-500' : isDeadlineSoon ? 'text-amber-600' : ''}`}>
                      {formatDeadline(job.deadline)}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Hạn nộp</p>
                  </CardContent>
                </Card>
              </div>

              {/* Job Description */}
              {job.job?.description && (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Mô tả công việc</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--foreground))]/80">
                      {job.job.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Requirements */}
              {job.job?.requirements?.length > 0 && (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Yêu cầu công việc</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {job.job.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle size={16} className="text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Benefits */}
              {job.job?.benefits?.length > 0 && (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Phúc lợi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {job.job.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Skills Required */}
              {(job.requirements?.skills?.length > 0 || job.job?.requirements?.skills?.length > 0) && (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Kỹ năng yêu cầu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(job.requirements?.skills || job.job?.requirements?.skills || []).map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education & Other */}
              {job.requirements?.education && (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Trình độ học vấn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{job.requirements.education}</p>
                  </CardContent>
                </Card>
              )}

              {/* Similar Jobs */}
              {similarJobs.length > 0 && (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Việc làm tương tự</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/community')}
                      className="gap-1 text-xs"
                    >
                      Xem tất cả <ArrowRight size={12} />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {similarJobs.slice(0, 4).map(sj => (
                      <div
                        key={sj._id || sj.id}
                        onClick={() => navigate(`/community/jobs/${sj._id || sj.id}`)}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] cursor-pointer transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[hsl(var(--foreground))] truncate">
                            {sj.title || sj.job?.title}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                            {sj.enterpriseInfo?.name || 'Doanh nghiệp'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              <MapPin size={10} className="inline mr-0.5" />
                              {sj.location?.province || '—'}
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              {formatSalary(sj.salary || sj.job?.salary)}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {JOB_TYPE_LABELS[sj.job?.type] || sj.job?.type}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Job Info Card */}
              <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                <CardHeader>
                  <CardTitle className="text-base">Thông tin tuyển dụng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Địa chỉ</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {job.location?.address || '—'}
                        {job.location?.district && `, ${job.location.district}`}
                        {job.location?.province && `, ${job.location.province}`}
                      </p>
                    </div>
                  </div>

                  {job.job?.quantity && (
                    <div className="flex items-start gap-3">
                      <Users size={16} className="text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Số lượng tuyển</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{job.job.quantity} người</p>
                      </div>
                    </div>
                  )}

                  {job.location?.type && (
                    <div className="flex items-start gap-3">
                      <Briefcase size={16} className="text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Hình thức</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {LOCATION_TYPE_LABELS[job.location.type] || job.location.type}
                        </p>
                      </div>
                    </div>
                  )}

                  {job.job?.gender && job.job.gender !== 'any' && (
                    <div className="flex items-start gap-3">
                      <Users size={16} className="text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Giới tính</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {job.job.gender === 'male' ? 'Nam' : 'Nữ'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Clock size={16} className="text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Ngày đăng</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {formatDate(job.publishedAt || job.createdAt)}
                      </p>
                    </div>
                  </div>

                  {job.deadline && (
                    <div className="flex items-start gap-3">
                      <Clock size={16} className={isExpired ? 'text-red-500 shrink-0 mt-0.5' : 'text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5'} />
                      <div>
                        <p className="text-sm font-medium">Hạn nộp</p>
                        <p className={`text-sm ${isExpired ? 'text-red-500 font-medium' : isDeadlineSoon ? 'text-amber-600' : 'text-[hsl(var(--muted-foreground))]'}`}>
                          {formatDeadline(job.deadline)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Map */}
              {mapCoords ? (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))] overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin size={16} className="text-[hsl(var(--primary))]" />
                      Địa điểm làm việc
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-48">
                      <MapContainer
                        center={[mapCoords.lat, mapCoords.lng]}
                        zoom={15}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <Marker position={[mapCoords.lat, mapCoords.lng]}>
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold">{job.location?.address}</p>
                              {job.location?.district && <p>{job.location.district}</p>}
                              {job.location?.province && <p>{job.location.province}</p>}
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    <div className="px-4 pb-4 pt-3">
                      <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                        {job.location?.address || '—'}
                        {job.location?.district && `, ${job.location.district}`}
                        {job.location?.province && `, ${job.location.province}`}
                      </p>
                      <Button
                        as="a"
                        href={`https://www.openstreetmap.org/directions?from=&to=${mapCoords.lat},${mapCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full gap-2"
                      >
                        <MapPin size={14} />
                        Chỉ đường trên bản đồ
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin size={16} className="text-[hsl(var(--primary))]" />
                      Địa điểm làm việc
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {job.location?.address || '—'}
                      {job.location?.district && `, ${job.location.district}`}
                      {job.location?.province && `, ${job.location.province}`}
                    </p>
                    {job.location?.type === 'remote' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700">
                        Công việc này hỗ trợ làm việc từ xa
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Apply CTA */}
              <Card className="bg-gradient-to-br from-[hsl(var(--primary))/5] to-[hsl(var(--primary))/10 border-[hsl(var(--primary))/20]">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    Quan tâm đến vị trí này?
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Ứng tuyển ngay để kết nối với nhà tuyển dụng. Hồ sơ của bạn sẽ được gửi trực tiếp.
                  </p>
                  <Button
                    onClick={handleApply}
                    disabled={applying || applied || isExpired}
                    className="w-full gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/90]"
                  >
                    {applying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : applied ? (
                      <>
                        <CheckCircle size={16} /> Đã ứng tuyển
                      </>
                    ) : isExpired ? (
                      'Đã hết hạn'
                    ) : (
                      <>
                        <Send size={16} /> Ứng tuyển ngay
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    className="w-full gap-2"
                  >
                    <BookmarkSimple size={16} weight={isSaved ? 'fill' : 'regular'} />
                    {isSaved ? 'Đã lưu tin' : 'Lưu tin tuyển dụng'}
                  </Button>
                </CardContent>
              </Card>

              {/* Stats */}
              {job.stats && (
                <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Thống kê tin</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Lượt xem', value: job.stats.views },
                      { label: 'Đơn ứng tuyển', value: job.stats.applications },
                      { label: 'Lọt shortlist', value: job.stats.shortlisted },
                      { label: 'Phỏng vấn', value: job.stats.interviews },
                      { label: 'Tuyển thành công', value: job.stats.hires },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center justify-between">
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">{stat.label}</span>
                        <span className="text-sm font-semibold">{stat.value || 0}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
