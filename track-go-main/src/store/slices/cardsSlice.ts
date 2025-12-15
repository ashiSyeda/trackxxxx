import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

interface Card {
  card_id: number;
  card_uid: string;
  user_id: number | null;
  status: string;
}

interface CardsState {
  cards: Card[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CardsState = {
  cards: [],
  isLoading: false,
  error: null,
};

export const fetchCards = createAsyncThunk('cards/fetchCards', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/cards');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch cards');
  }
});

export const createCard = createAsyncThunk(
  'cards/createCard',
  async (data: { card_uid: string; user_id?: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cards', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create card');
    }
  }
);

export const updateCard = createAsyncThunk(
  'cards/updateCard',
  async ({ id, data }: { id: number; data: Partial<Card> }, { rejectWithValue }) => {
    try {
      await api.put(`/cards/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update card');
    }
  }
);

export const deleteCard = createAsyncThunk('cards/deleteCard', async (id: number, { rejectWithValue }) => {
  try {
    await api.delete(`/cards/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to delete card');
  }
});

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cards = action.payload;
      })
      .addCase(fetchCards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCard.fulfilled, (state, action) => {
        const index = state.cards.findIndex((c) => c.card_id === action.payload.id);
        if (index !== -1) {
          state.cards[index] = { ...state.cards[index], ...action.payload.data };
        }
      })
      .addCase(deleteCard.fulfilled, (state, action) => {
        state.cards = state.cards.filter((c) => c.card_id !== action.payload);
      });
  },
});

export default cardsSlice.reducer;
