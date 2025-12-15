import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

interface AccessLog {
  name: string;
  category_name: string;
  card_uid: string;
  action_type: string;
  timestamp: string;
}

interface AccessLogsState {
  logs: AccessLog[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AccessLogsState = {
  logs: [],
  isLoading: false,
  error: null,
};

export const fetchAccessLogs = createAsyncThunk('accessLogs/fetchAccessLogs', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/access_logs');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch access logs');
  }
});

export const addAccessLog = createAsyncThunk('accessLogs/addAccessLog', async (logData: { user_id: number; card_id: number; action_type: string }, { rejectWithValue }) => {
  try {
    const response = await api.post('/access_logs', logData);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to add access log');
  }
});

const accessLogsSlice = createSlice({
  name: 'accessLogs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccessLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccessLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload;
      })
      .addCase(fetchAccessLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default accessLogsSlice.reducer;
