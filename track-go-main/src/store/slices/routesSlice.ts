import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

interface Route {
  route_id: number;
  route_name: string;
  start_point: string;
  end_point: string;
}

interface RoutesState {
  routes: Route[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RoutesState = {
  routes: [],
  isLoading: false,
  error: null,
};

export const fetchRoutes = createAsyncThunk('routes/fetchRoutes', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/routes');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch routes');
  }
});

export const createRoute = createAsyncThunk(
  'routes/createRoute',
  async (data: { route_name: string; start_point: string; end_point: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/routes', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create route');
    }
  }
);

export const updateRoute = createAsyncThunk(
  'routes/updateRoute',
  async ({ id, data }: { id: number; data: Partial<Route> }, { rejectWithValue }) => {
    try {
      await api.put(`/routes/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update route');
    }
  }
);

export const deleteRoute = createAsyncThunk('routes/deleteRoute', async (id: number, { rejectWithValue }) => {
  try {
    await api.delete(`/routes/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to delete route');
  }
});

const routesSlice = createSlice({
  name: 'routes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoutes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoutes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.routes = action.payload;
      })
      .addCase(fetchRoutes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createRoute.fulfilled, (state, action) => {
        // Refetch will update the list
      })
      .addCase(updateRoute.fulfilled, (state, action) => {
        const index = state.routes.findIndex((r) => r.route_id === action.payload.id);
        if (index !== -1) {
          state.routes[index] = { ...state.routes[index], ...action.payload.data };
        }
      })
      .addCase(deleteRoute.fulfilled, (state, action) => {
        state.routes = state.routes.filter((r) => r.route_id !== action.payload);
      });
  },
});

export default routesSlice.reducer;
