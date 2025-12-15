import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

interface GPSLocation {
  location_id: number;
  vehicle_id: number;
  latitude: string;
  longitude: string;
  timestamp: string;
}

interface GPSState {
  locations: GPSLocation[];
  isLoading: boolean;
  error: string | null;
}

const initialState: GPSState = {
  locations: [],
  isLoading: false,
  error: null,
};

export const fetchGPSLocations = createAsyncThunk('gps/fetchLocations', async (vehicleId: number | undefined, { rejectWithValue }) => {
  try {
    const url = vehicleId ? `/gps/${vehicleId}` : '/gps';
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch GPS locations');
  }
});

const gpsSlice = createSlice({
  name: 'gps',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGPSLocations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGPSLocations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.locations = action.payload;
      })
      .addCase(fetchGPSLocations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default gpsSlice.reducer;
