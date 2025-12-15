import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

interface Vehicle {
  vehicle_id: number;
  vehicle_number: string;
  driver_name: string;
  capacity: number;
  route_id: number | null;
}

interface VehiclesState {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
}

const initialState: VehiclesState = {
  vehicles: [],
  isLoading: false,
  error: null,
};

export const fetchVehicles = createAsyncThunk('vehicles/fetchVehicles', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/vehicles');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch vehicles');
  }
});

export const createVehicle = createAsyncThunk(
  'vehicles/createVehicle',
  async (data: { vehicle_number: string; driver_name: string; capacity: number; route_id?: number }, { rejectWithValue }) => {
    try {
      const response = await api.post('/vehicles', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create vehicle');
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ id, data }: { id: number; data: Partial<Vehicle> }, { rejectWithValue }) => {
    try {
      await api.put(`/vehicles/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update vehicle');
    }
  }
);

export const deleteVehicle = createAsyncThunk('vehicles/deleteVehicle', async (id: number, { rejectWithValue }) => {
  try {
    await api.delete(`/vehicles/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to delete vehicle');
  }
});

const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const index = state.vehicles.findIndex((v) => v.vehicle_id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = { ...state.vehicles[index], ...action.payload.data };
        }
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter((v) => v.vehicle_id !== action.payload);
      });
  },
});

export default vehiclesSlice.reducer;
