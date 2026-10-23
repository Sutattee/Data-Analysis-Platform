// 状态颜色标签（PRD §7/§10）：状态 = 颜色标签 + 文字说明，全页统一配色
// 达标/已生成=绿；未达标/超出工艺范围/生成失败=红；数据不足/待核对=琥珀；
// 待生产/更新中=蓝；待回传/标准缺失/待生成=灰
const COLOR_OF: Record<string, string> = {
  达标: "green",
  已生成: "green",
  未达标: "red",
  超出工艺范围: "red",
  生成失败: "red",
  数据不足: "amber",
  待核对: "amber",
  待生产: "blue",
  更新中: "blue",
  待回传: "gray",
  标准缺失: "gray",
  待生成: "gray",
};

const CLASS_OF: Record<string, string> = {
  green: "bg-green-50 text-green-700 ring-green-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  gray: "bg-gray-100 text-gray-600 ring-gray-200",
};

export function StatusTag({ text }: { text: string }) {
  const cls = CLASS_OF[COLOR_OF[text] ?? "gray"];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {text}
    </span>
  );
}
