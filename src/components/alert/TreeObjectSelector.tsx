"use client";

import { useState } from "react";
import { ENERGY_ORG_TREE, type OrgNode } from "@/lib/mock-data/alerts";

interface TreeObjectSelectorProps {
  objects: string[];
  onChange: (v: string[]) => void;
}

// 车间—能源网格—设备 三级树形多选：各层级对象独立选择，选父级不自动联动子级。
export function TreeObjectSelector({ objects, onChange }: TreeObjectSelectorProps) {
  // 默认展开车间层
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ENERGY_ORG_TREE.map((w) => w.name)));

  function toggle(name: string) {
    onChange(objects.includes(name) ? objects.filter((x) => x !== name) : [...objects, name]);
  }
  function toggleExpand(name: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }

  function renderNode(node: OrgNode, depth: number) {
    const hasChildren = !!node.children && node.children.length > 0;
    const isOpen = expanded.has(node.name);
    const checked = objects.includes(node.name);
    return (
      <div key={node.name}>
        <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: depth * 18 }}>
          {hasChildren ? (
            <button
              type="button"
              className="w-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
              onClick={() => toggleExpand(node.name)}
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" checked={checked} onChange={() => toggle(node.name)} className="accent-primary-600" />
            {node.name}
          </label>
        </div>
        {hasChildren && isOpen && node.children!.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  return <div className="max-h-64 overflow-auto">{ENERGY_ORG_TREE.map((n) => renderNode(n, 0))}</div>;
}
