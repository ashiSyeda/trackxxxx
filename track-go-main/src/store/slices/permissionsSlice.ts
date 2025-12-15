import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

interface Permission {
  permission_id: number;
  category_id: number;
  allowed_area: string;
}

interface PermissionsState {
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PermissionsState = {
  permissions: [],
  isLoading: false,
  error: null,
};

export const fetchPermissions = createAsyncThunk('permissions/fetchPermissions', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/permissions');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch permissions');
  }
});

export const addPermission = createAsyncThunk(
  'permissions/addPermission',
  async (data: { category_id: number; allowed_area: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/permissions', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add permission');
    }
  }
);

export const updatePermission = createAsyncThunk(
  'permissions/updatePermission',
  async ({ id, data }: { id: number; data: Partial<Permission> }, { rejectWithValue }) => {
    try {
      await api.put(`/permissions/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update permission');
    }
  }
);

export const deletePermission = createAsyncThunk('permissions/deletePermission', async (id: number, { rejectWithValue }) => {
  try {
    await api.delete(`/permissions/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to delete permission');
  }
});

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.permissions = action.payload;
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(addPermission.fulfilled, (state, action) => {
        state.permissions.push(action.payload);
      })
      .addCase(updatePermission.fulfilled, (state, action) => {
        const index = state.permissions.findIndex((p) => p.permission_id === action.payload.id);
        if (index !== -1) {
          state.permissions[index] = { ...state.permissions[index], ...action.payload.data };
        }
      })
      .addCase(deletePermission.fulfilled, (state, action) => {
        state.permissions = state.permissions.filter((p) => p.permission_id !== action.payload);
      });
  },
});

export default permissionsSlice.reducer;
