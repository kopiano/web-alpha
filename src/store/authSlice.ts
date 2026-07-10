import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getMe } from "@/api/auth";

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  userRefreshVersion: number;
  refreshRequestId: string | null;
}

const initialState: AuthState = {
  user: null,
  status: "loading",
  userRefreshVersion: 0,
  refreshRequestId: null,
};

export const refreshUser = createAsyncThunk<
  User | null,
  void,
  { rejectValue: { status?: number; transient: boolean } }
>("auth/refreshUser", async (_, { rejectWithValue }) => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await getMe();
    return res.data.data as User;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      return rejectWithValue({ status, transient: false });
    }
    return rejectWithValue({ status, transient: true });
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.status = action.payload ? "authenticated" : "anonymous";
      state.refreshRequestId = null;
    },
    mergeUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    clearUser(state) {
      state.user = null;
      state.status = "anonymous";
      state.refreshRequestId = null;
    },
    bumpUserRefreshVersion(state) {
      state.userRefreshVersion += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshUser.pending, (state, action) => {
        state.refreshRequestId = action.meta.requestId;
        if (!state.user) state.status = "loading";
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        if (state.refreshRequestId !== action.meta.requestId) return;
        state.refreshRequestId = null;
        state.user = action.payload;
        state.status = action.payload ? "authenticated" : "anonymous";
      })
      .addCase(refreshUser.rejected, (state, action) => {
        if (state.refreshRequestId !== action.meta.requestId) return;
        state.refreshRequestId = null;
        if (action.payload?.transient) {
          if (state.user) state.status = "authenticated";
          return;
        }
        state.user = null;
        state.status = "anonymous";
      });
  },
});

export const { setUser, mergeUser, clearUser, bumpUserRefreshVersion } = authSlice.actions;
export default authSlice.reducer;
