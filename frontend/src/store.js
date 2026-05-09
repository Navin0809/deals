import { create } from 'zustand';

export const useUiStore = create((set) => ({
  location: null,
  locationStatus: 'idle',
  filters: {
    radius: 15,
    categoryId: '',
    sort: 'nearby',
    best: false
  },
  setLocation: (location) => set({ location, locationStatus: 'granted' }),
  setLocationStatus: (locationStatus) => set({ locationStatus }),
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } }))
}));
