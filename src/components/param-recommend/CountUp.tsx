"use client";

import { useEffect, useState } from "react";

// 数字增长动效：从 0 以 ease-out 节奏增长到目标值（下一批次推荐值大数字）；目标值变化时重新增长
export function CountUp({ to, duration = 900, decimals = 2 }: { to: number; duration?: number; decimals?: number }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setVal(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <>{val.toFixed(decimals)}</>;
}
