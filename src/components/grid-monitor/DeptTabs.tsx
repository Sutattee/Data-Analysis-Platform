"use client";

interface DeptTabItem {
  name: string;
  abnormal: number;
}

// 部门页签：异常部门排前（按异常数降序），名称后带「N异常」/「正常」标记
export function DeptTabs({ depts, active, onChange }: { depts: DeptTabItem[]; active: string; onChange: (name: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {depts.map((d) => {
        const isActive = d.name === active;
        return (
          <button
            key={d.name}
            onClick={() => onChange(d.name)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive ? "bg-primary-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d.name}
            {d.abnormal > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  isActive ? "bg-white/90 text-red-600" : "bg-red-100 text-red-700"
                }`}
              >
                {d.abnormal}异常
              </span>
            ) : (
              <span className={`text-[10px] leading-none ${isActive ? "text-white/70" : "text-gray-400"}`}>正常</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
