"use client";

interface DemoCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}

export function DemoCard({ title, description, icon, onClick }: DemoCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:border-primary-200 active:scale-[0.98] cursor-pointer transition-all duration-200 group"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-gray-800 mb-1.5 group-hover:text-primary-600 transition-all duration-200">
        {title}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
