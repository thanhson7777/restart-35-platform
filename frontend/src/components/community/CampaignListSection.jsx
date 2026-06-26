import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Card, Badge } from '@/components/ui';
import { fetchCampaigns, selectCampaigns, selectCampaignLoading } from '@/redux/campaign/campaignSlice';
import { Rocket, Info, HeartHandshake } from 'lucide-react';
import { formatCurrency } from '@/utils/formatter';
import dayjs from 'dayjs';

const CampaignListSection = () => {
  const dispatch = useDispatch();
  const campaigns = useSelector(selectCampaigns);
  const loading = useSelector(selectCampaignLoading);
  const [filter, setFilter] = useState('funding'); // 'funding' | 'funded' | 'all'

  useEffect(() => {
    // Only fetch campaigns that are public (funding, funded, disbursing, completed)
    const filters = {};
    if (filter !== 'all') filters.status = filter;
    else filters.status = 'funding,funded,disbursing,completed';
    
    dispatch(fetchCampaigns(filters));
  }, [dispatch, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dự án Khởi nghiệp (Micro-grant)</h2>
          <p className="text-gray-500">Chung tay góp vốn giúp lực lượng lao động 35+ hiện thực hóa ý tưởng</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === 'funding' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setFilter('funding')}
          >
            Đang gọi vốn
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === 'funded' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setFilter('funded')}
          >
            Đã thành công
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center bg-gray-50">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có dự án nào</h3>
          <p className="text-gray-500 max-w-md">Hiện tại không có dự án nào đang ở trạng thái này. Vui lòng quay lại sau.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const progress = camp.targetAmount > 0 ? Math.min(100, Math.round((camp.raisedAmount / camp.targetAmount) * 100)) : 0;
            return (
              <Card key={camp._id} className="overflow-hidden flex flex-col hover:shadow-lg transition-all hover:-translate-y-1 duration-300 border-gray-200">
                <div className="aspect-[16/9] bg-gray-100 relative group">
                  {camp.images && camp.images[0] ? (
                    <img src={camp.images[0]} alt={camp.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-200">
                      <Rocket className="w-16 h-16" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge className="bg-white/90 text-gray-900 hover:bg-white backdrop-blur-sm border-0 font-medium">
                      Bởi: {camp.workerName}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                    <Info className="w-3.5 h-3.5" />
                    Bảo lãnh bởi {camp.ngoName}
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    <Link to={`/community/campaigns/${camp._id}`}>{camp.title}</Link>
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-5 flex-1 line-clamp-3">{camp.description}</p>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <div className="text-xl font-bold text-gray-900 leading-none">{formatCurrency(camp.raisedAmount)}</div>
                        <div className="text-xs text-gray-500 mt-1">Quyên góp được</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">{progress}%</div>
                        <div className="text-xs text-gray-500 mt-0.5">Mục tiêu: {formatCurrency(camp.targetAmount)}</div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        Hạn: {dayjs(camp.deadline).format('DD/MM/YYYY')}
                      </span>
                      <Button size="sm" asChild className="rounded-full px-5">
                        <Link to={`/community/campaigns/${camp._id}`}>Ủng hộ</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignListSection;
