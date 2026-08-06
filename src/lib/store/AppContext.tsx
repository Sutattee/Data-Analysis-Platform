"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { User, QaMessage } from "@/types";
import { DEFAULT_USER } from "@/lib/constants";
import { getLocal, setLocal } from "@/lib/utils";

// ========== State ==========
interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  favorites: QaMessage[];
  history: QaMessage[];
  sidebarOpen: boolean;
}

const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  favorites: [],
  history: [],
  sidebarOpen: true,
};

// ========== Actions ==========
type Action =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: Partial<User> }
  | { type: "ADD_FAVORITE"; payload: QaMessage }
  | { type: "REMOVE_FAVORITE"; payload: string }
  | { type: "ADD_HISTORY"; payload: QaMessage }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "LOAD_STATE"; payload: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.payload, isLoggedIn: true };
    case "LOGOUT":
      return { ...state, user: null, isLoggedIn: false };
    case "UPDATE_USER":
      return state.user
        ? { ...state, user: { ...state.user, ...action.payload } }
        : state;
    case "ADD_FAVORITE": {
      if (state.favorites.find((f) => f.id === action.payload.id)) return state;
      return { ...state, favorites: [{ ...action.payload, favorited: true }, ...state.favorites] };
    }
    case "REMOVE_FAVORITE":
      return { ...state, favorites: state.favorites.filter((f) => f.id !== action.payload) };
    case "ADD_HISTORY": {
      const exists = state.history.find((h) => h.id === action.payload.id);
      if (exists) {
        return { ...state, history: state.history.map((h) => h.id === action.payload.id ? action.payload : h) };
      }
      return { ...state, history: [action.payload, ...state.history] };
    }
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "LOAD_STATE":
      return action.payload;
    default:
      return state;
  }
}

// ========== Context ==========
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  toggleFavorite: (msg: QaMessage, question?: string) => void;
  addHistory: (msg: QaMessage) => void;
  isFavorited: (id: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 从 localStorage 加载状态
  useEffect(() => {
    const savedUser = getLocal<User | null>("app_user", null);
    const savedFavorites = getLocal<QaMessage[]>("app_favorites", []);
    const savedHistory = getLocal<QaMessage[]>("app_history", []);
    dispatch({
      type: "LOAD_STATE",
      payload: {
        user: savedUser,
        isLoggedIn: !!savedUser,
        favorites: savedFavorites,
        history: savedHistory,
        sidebarOpen: true,
      },
    });
  }, []);

  // 持久化
  useEffect(() => {
    setLocal("app_user", state.user);
  }, [state.user]);

  useEffect(() => {
    setLocal("app_favorites", state.favorites);
  }, [state.favorites]);

  useEffect(() => {
    setLocal("app_history", state.history.slice(0, 100)); // 最多保存100条
  }, [state.history]);

  const login = (username: string, password: string): boolean => {
    // 模拟登录验证
    if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
      dispatch({ type: "LOGIN", payload: { id: "u1", username: DEFAULT_USER.username, password: "", phone: DEFAULT_USER.phone, role: DEFAULT_USER.role, nickname: DEFAULT_USER.nickname, alias: DEFAULT_USER.alias, email: DEFAULT_USER.email } });
      return true;
    }
    const savedUser = getLocal<User | null>("app_user", null);
    if (savedUser && savedUser.username === username && savedUser.password === password) {
      dispatch({ type: "LOGIN", payload: savedUser });
      return true;
    }
    return false;
  };

  const logout = () => {
    dispatch({ type: "LOGOUT" });
    localStorage.removeItem("app_user");
  };

  const updateUser = (data: Partial<User>) => {
    dispatch({ type: "UPDATE_USER", payload: data });
  };

  const toggleFavorite = (msg: QaMessage, question?: string) => {
    if (state.favorites.find((f) => f.id === msg.id)) {
      dispatch({ type: "REMOVE_FAVORITE", payload: msg.id });
    } else {
      dispatch({ type: "ADD_FAVORITE", payload: { ...msg, favorited: true, question } });
    }
  };

  const addHistory = (msg: QaMessage) => {
    dispatch({ type: "ADD_HISTORY", payload: msg });
  };

  const isFavorited = (id: string) => {
    return state.favorites.some((f) => f.id === id);
  };

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout, updateUser, toggleFavorite, addHistory, isFavorited }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
