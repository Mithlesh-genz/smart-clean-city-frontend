import React, { useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useSocket } from '../hooks/useSocket';
import StatCard from '../components/StatCard';
import { Camera, Trash2, Mic, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  // Fetch statistics
  const { data: stats, loading, refetch } = useFetch('/dashboard/stats', {
    immediate: true,
    onSuccess: (data) => console.log('Stats loaded', data),
  });

  // Socket for real-time updates
  const { isConnected, subscribe, events: socketEvents } = useSocket();

  useEffect(() => {
    if (isConnected) {
      subscribe('event', ['*']);
      subscribe('camera', ['*']);
      subscribe('dustbin', ['*']);
    }
  }, [isConnected]);

  // Refetch stats when new event arrives
  useEffect(() => {
    if (socketEvents.length > 0) {
      refetch();
    }
  }, [socketEvents]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Cameras"
            value={stats?.totalCameras || 0}
            icon={Camera}
            color="blue"
          />
          <StatCard
            title="Online Cameras"
            value={stats?.onlineCameras || 0}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Events Today"
            value={stats?.eventsToday || 0}
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            title="Dustbins Full"
            value={stats?.dustbinsFull || 0}
            icon={Trash2}
            color="red"
          />
          <StatCard
            title="Online Speakers"
            value={stats?.onlineSpeakers || 0}
            icon={Mic}
            color="purple"
          />
          <StatCard
            title="Cleanliness Score"
            value={`${stats?.cleanlinessScore || 0}%`}
            icon={Activity}
            color="green"
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;