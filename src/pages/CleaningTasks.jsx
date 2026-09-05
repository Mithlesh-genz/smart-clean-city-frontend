// frontend/src/pages/Tasks.jsx (or CleaningTasks.jsx)
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  MapPin, 
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const CleaningTasks = () => {
  const { tasks, setTasks, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, ASSIGNED, IN_PROGRESS, COMPLETED
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Update stats whenever tasks change
  useEffect(() => {
    calculateStats();
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cleaning-tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'PENDING').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      overdue: tasks.filter(t => 
        t.status !== 'COMPLETED' && 
        new Date(t.createdAt) < new Date(now - 24 * 60 * 60 * 1000)
      ).length
    };
    setStats(stats);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/cleaning-tasks/${taskId}/status`, { status: newStatus });
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const assignTask = async (taskId, userId) => {
    try {
      await api.patch(`/cleaning-tasks/${taskId}/assign`, { assignedTo: userId });
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, assignedTo: userId } : task
      ));
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      ASSIGNED: { color: 'bg-blue-100 text-blue-800', icon: User },
      IN_PROGRESS: { color: 'bg-purple-100 text-purple-800', icon: RefreshCw },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    };
    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      HIGH: 'bg-red-100 text-red-800',
      MEDIUM: 'bg-orange-100 text-orange-800',
      LOW: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${configs[priority] || configs.LOW}`}>
        {priority}
      </span>
    );
  };

  const filteredTasks = tasks
    .filter(task => filter === 'ALL' || task.status === filter)
    .filter(task => 
      task.zone?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignedUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧹 Cleaning Tasks</h1>
          <p className="text-gray-600 mt-1">Manage and track all cleaning assignments</p>
        </div>
        <button
          onClick={fetchTasks}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filter === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No cleaning tasks found</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              {/* Task Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0">
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <Clock className="w-6 h-6 text-yellow-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">
                          Task #{task.id.slice(0, 8)}
                        </span>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {task.zone?.name || 'Unknown Zone'}
                        </span>
                        {task.assignedUser && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assignedUser.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.status !== 'COMPLETED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = 
                            task.status === 'PENDING' ? 'ASSIGNED' :
                            task.status === 'ASSIGNED' ? 'IN_PROGRESS' :
                            'COMPLETED';
                          updateTaskStatus(task.id, nextStatus);
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        Advance
                      </button>
                    )}
                    <button className="p-1 hover:bg-gray-100 rounded-lg transition">
                      {expandedTask === task.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTask === task.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Task Details</h4>
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">ID</dt>
                          <dd className="font-mono text-gray-900">{task.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Zone</dt>
                          <dd className="text-gray-900">{task.zone?.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Priority</dt>
                          <dd className="text-gray-900">{task.priority}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Created</dt>
                          <dd className="text-gray-900">
                            {new Date(task.createdAt).toLocaleString()}
                          </dd>
                        </div>
                        {task.completedAt && (
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Completed</dt>
                            <dd className="text-gray-900">
                              {new Date(task.completedAt).toLocaleString()}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Assignment</h4>
                      {task.assignedUser ? (
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{task.assignedUser.name}</p>
                            <p className="text-xs text-gray-500">{task.assignedUser.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500">Unassigned</p>
                          <button
                            onClick={() => assignTask(task.id, user.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                          >
                            Assign to me
                          </button>
                        </div>
                      )}
                      
                      {task.event && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-xs text-yellow-800">
                            ⚡ Triggered by event: {task.event.id}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Confidence: {(task.event.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CleaningTasks;