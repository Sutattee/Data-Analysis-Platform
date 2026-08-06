"use client";

import { useApp } from "@/lib/store/AppContext";
import { formatDate } from "@/lib/utils";

export default function FavoritesPage() {
  const { state, toggleFavorite } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">我的收藏</h1>
        <p className="text-sm text-gray-500 mt-1">收藏的AI问答内容</p>
      </div>

      {state.favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-4xl mb-3">⭐</span>
          <p className="text-sm">暂无收藏内容</p>
          <p className="text-xs mt-1">在智能问答页面点击&ldquo;收藏&rdquo;按钮即可添加到此处</p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.favorites.map((msg) => (
            <div key={msg.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{formatDate(msg.timestamp)}</span>
                <button
                  onClick={() => toggleFavorite(msg)}
                  className="text-yellow-500 text-xs hover:text-yellow-600"
                >
                  ⭐ 取消收藏
                </button>
              </div>
              {msg.question && (
                <div className="text-sm text-gray-800 mb-2 pb-2 border-b border-gray-50">
                  <span className="text-gray-400">问题：</span>{msg.question}
                </div>
              )}
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
