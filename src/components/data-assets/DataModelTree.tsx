"use client";

import { useState } from "react";
import { DataModel } from "@/types";

function TreeNode({
  model,
  selectedId,
  onSelect,
  depth = 0,
}: {
  model: DataModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = selectedId === model.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm transition-colors
          ${isSelected ? "bg-primary-50 text-primary-700" : "hover:bg-gray-50 text-gray-700"}
          ${depth > 0 ? "ml-3" : ""}`}
        onClick={() => {
          setExpanded(!expanded);
          onSelect(model.id);
        }}
      >
        <span className="text-xs w-4 text-center">{expanded ? "▼" : "▶"}</span>
        <span className="truncate">{model.name}</span>
        {model.type === "table" && model.fields.length > 0 && (
          <span className="text-xs text-gray-400 ml-auto">{model.fields.length} 字段</span>
        )}
      </div>
      {expanded && model.children?.map((child) => (
        <TreeNode
          key={child.id}
          model={child}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

interface DataModelTreeProps {
  models: DataModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DataModelTree({ models, selectedId, onSelect }: DataModelTreeProps) {
  return (
    <div className="space-y-0.5">
      {models.map((model) => (
        <TreeNode
          key={model.id}
          model={model}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// 获取所有叶子模型（有字段的table）
export function getLeafModels(models: DataModel[]): DataModel[] {
  const leaves: DataModel[] = [];
  function walk(list: DataModel[]) {
    for (const m of list) {
      if (m.children && m.children.length > 0) {
        walk(m.children);
      } else if (m.fields.length > 0) {
        leaves.push(m);
      }
    }
  }
  walk(models);
  return leaves;
}
