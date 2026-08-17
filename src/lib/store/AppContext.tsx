"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { User, QaMessage, RecentVisit } from "@/types";
import { DEFAULT_USER } from "@/lib/constants";
import { getLocal, setLocal } from "@/lib/utils";
import { ALERT_RECORDS } from "@/lib/mock-data/alerts";

// ========== State ==========
interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  favorites: QaMessage[];
  history: QaMessage[];
  recentVisits: RecentVisit[];
  sidebarOpen: boolean;
}

// 预置最近访问样例（首次进入首页展示；移除后持久化，全部移除则显示空态）
const DEFAULT_RECENT_VISITS: RecentVisit[] = [
  {
    id: "rv-alert-1",
    title: "卷包车间2号包装机包装设备运行效率低于基准（未处理）",
    board: "生产管理",
    contentType: "告警记录",
    creator: "系统",
    editable: false,
    lastVisitedAt: "2026-08-17 09:42",
    route: "/alert/records/" + ALERT_RECORDS[0].id,
  },
  {
    id: "rv-qa-1",
    title: "本月单箱综合能耗同比变化趋势如何？",
    board: "能源消耗",
    contentType: "智能问数对话",
    creator: "admin",
    editable: false,
    lastVisitedAt: "2026-08-16 16:05",
    route: "/qa?query=" + encodeURIComponent("本月单箱综合能耗同比变化趋势如何？"),
  },
  {
    id: "rv-forecast-1",
    title: "9月能耗情景测算（产量 +10%）",
    board: "能源消耗",
    contentType: "预测分析记录",
    creator: "admin",
    editable: true,
    lastVisitedAt: "2026-08-16 10:20",
    route: "/energy/forecast/records?record=FR-20260809-012", // 直接进入该记录详情
  },
  {
    id: "rv-event-1",
    title: "空压站 2 号空压机故障（已确认）",
    board: "生产管理",
    contentType: "重大事件记录",
    creator: "王五",
    editable: false,
    lastVisitedAt: "2026-08-15 14:30",
    route: "/energy/yearbook/events?id=SJ20260801008", // 进入事件列表并打开该事件详情
  },
  {
    id: "rv-yearbook-1",
    title: "2025年度重大事件年鉴报告",
    board: "能源消耗",
    contentType: "年鉴报告",
    creator: "admin",
    editable: true,
    lastVisitedAt: "2026-08-14 11:12",
    route: "/energy/yearbook/reports/YB2025001", // 直接进入报告详情
  },
  {
    id: "rv-report-1",
    title: "2026年7月生产运营分析报告",
    board: "生产管理",
    contentType: "普通报告",
    creator: "张三",
    editable: false,
    lastVisitedAt: "2026-08-13 17:40",
    route: "/reports?type=rt1", // 进入报告页并自动选中该报告
  },
  {
    id: "rv-grid-monitor-1",
    title: "制丝车间网格监控 — 烘丝机能耗异常",
    board: "能源消耗",
    contentType: "重点网格监测",
    creator: "admin",
    editable: false,
    lastVisitedAt: "2026-08-12 15:22",
    route: "/grid-monitor",
  },
  {
    id: "rv-metric-trace-1",
    title: "单箱综合能耗指标溯源",
    board: "能源消耗",
    contentType: "指标溯源",
    creator: "admin",
    editable: false,
    lastVisitedAt: "2026-08-11 09:10",
    route: "/metric-trace",
  },
  {
    id: "rv-qa-2",
    title: "各产线本月产量完成率是多少？",
    board: "生产管理",
    contentType: "智能问数对话",
    creator: "admin",
    editable: false,
    lastVisitedAt: "2026-08-10 14:35",
    route: "/qa?query=" + encodeURIComponent("各产线本月产量完成率是多少？"),
  },
  {
    id: "rv-data-assets-1",
    title: "数据资产 — 能耗域数据表概览",
    board: "能源消耗",
    contentType: "数据资产",
    creator: "admin",
    editable: false,
    lastVisitedAt: "2026-08-09 11:08",
    route: "/data-assets",
  },
];

const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  favorites: [],
  history: [],
  recentVisits: DEFAULT_RECENT_VISITS,
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
  | { type: "UPSERT_RECENT_VISIT"; payload: RecentVisit }
  | { type: "REMOVE_RECENT_VISIT"; payload: string }
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
    case "UPSERT_RECENT_VISIT": {
      // 同一内容重复访问仅更新最近访问时间（置顶），不生成重复记录
      const exists = state.recentVisits.find((v) => v.id === action.payload.id);
      const next = exists
        ? state.recentVisits.map((v) =>
            v.id === action.payload.id ? { ...v, ...action.payload, lastVisitedAt: action.payload.lastVisitedAt } : v
          )
        : [action.payload, ...state.recentVisits];
      // 按最近访问时间倒序，最多保留 50 条
      return {
        ...state,
        recentVisits: next
          .sort((a, b) => (a.lastVisitedAt < b.lastVisitedAt ? 1 : -1))
          .slice(0, 50),
      };
    }
    case "REMOVE_RECENT_VISIT":
      // 仅移除当前账号的最近访问记录，不删除原始内容
      return { ...state, recentVisits: state.recentVisits.filter((v) => v.id !== action.payload) };
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
  addRecentVisit: (visit: Omit<RecentVisit, "lastVisitedAt"> & { lastVisitedAt?: string }) => void;
  removeRecentVisit: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 从 localStorage 加载状态
  useEffect(() => {
    const savedUser = getLocal<User | null>("app_user", null);
    const savedFavorites = getLocal<QaMessage[]>("app_favorites", []);
    const savedHistory = getLocal<QaMessage[]>("app_history", []);
    const savedVisits = getLocal<RecentVisit[]>("app_recent_visits", DEFAULT_RECENT_VISITS);
    dispatch({
      type: "LOAD_STATE",
      payload: {
        user: savedUser,
        isLoggedIn: !!savedUser,
        favorites: savedFavorites,
        history: savedHistory,
        recentVisits: savedVisits,
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

  useEffect(() => {
    setLocal("app_recent_visits", state.recentVisits);
  }, [state.recentVisits]);

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

  // 记录最近访问：同一内容重复访问仅更新最近访问时间（不生成重复记录）
  const addRecentVisit = (visit: Omit<RecentVisit, "lastVisitedAt"> & { lastVisitedAt?: string }) => {
    const d = new Date();
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const now = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    dispatch({ type: "UPSERT_RECENT_VISIT", payload: { ...visit, lastVisitedAt: visit.lastVisitedAt ?? now } });
  };

  const removeRecentVisit = (id: string) => {
    dispatch({ type: "REMOVE_RECENT_VISIT", payload: id });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout, updateUser, toggleFavorite, addHistory, isFavorited, addRecentVisit, removeRecentVisit }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
