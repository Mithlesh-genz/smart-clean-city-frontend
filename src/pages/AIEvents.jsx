import React, { useState, useEffect } from 'react';
import { useFetchList, useMutation } from '../hooks/useFetch';
import EventCard from '../components/EventCard';
import { RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Events = () => {
  // ========================================
  // State
  // ========================================
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  // ========================================
  // Fetch Events
  // ========================================
  const {
    data: events,
    loading,
    error,
    page,
    total,
    pages,
    nextPage,
    prevPage,
    goToPage,
    refetch,
    setFilters,
  } = useFetchList('/events', {
    pageSize: 10,
    filters: {
      status: statusFilter,
      zoneId: zoneFilter,
    },
  });

  // ========================================
  // Mutations
  // ========================================
  const { mutate: updateStatus } = useMutation('/events/:id/status', {
    method: 'PUT',
    onSuccess: () => {
      toast.success('Event status updated');
      refetch();
    },
    onError: (err) => {
      toast.error('Failed to update status');
      console.error(err);
    },
  });

  const { mutate: deleteEvent } = useMutation('/events/:id', {
    method: 'DELETE',
    onSuccess: () => {
      toast.success('Event deleted');
      refetch();
    },
  });

  // ========================================
  // Handlers
  // ========================================
  const handleStatusChange = (eventId, newStatus) => {
    updateStatus({ status: newStatus }, { url: `/events/${eventId}/status` });
  };

  const handleDelete = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEvent(null, { url: `/events/${eventId}` });
    }
  };

  const handleFilterChange = (field, value) => {
    if (field === 'status') {
      setStatusFilter(value);
    } else if (field === 'zone') {
      setZoneFilter(value);
    }
    // Reset to page 1 when filters change
    setFilters({ status: value });
  };

  // ========================================
  // Render
  // ========================================
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Events</h1>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="DETECTED">Detected</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="ANNOUNCEMENT_SENT">Announced</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_POSITIVE">False Positive</option>
        </select>

        <input
          type="text"
          placeholder="Search by event ID..."
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => {
            // Implement search if needed
          }}
        />
      </div>

      {/* Event List */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg">
          Error loading events: {error}
        </div>
      )}

      {!loading && !error && events?.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No events found. Try adjusting your filters.
        </div>
      )}

      <div className="space-y-4">
        {events?.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onViewDetails={() => console.log('View details', event)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
          <div className="text-gray-400 text-sm">
            Showing {page * 10 - 9}–{Math.min(page * 10, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevPage}
              disabled={page === 1}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="flex items-center px-4 text-white">
              Page {page} of {pages}
            </span>
            <button
              onClick={nextPage}
              disabled={page === pages}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;