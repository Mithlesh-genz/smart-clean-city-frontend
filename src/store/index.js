import { create } from 'zustand';

export const useStore = create((set) => ({
    user: null,
    events: [],
    cameras: [],
    dustbins: [],
    tasks: [],
    setUser: (user) => set({ user }),
    setEvents: (events) => set({ events }),
    setCameras: (cameras) => set({ cameras }),
    setDustbins: (dustbins) => set({ dustbins }),
    setTasks: (tasks) => set({ tasks }),
    // Add other state or actions as needed
}));