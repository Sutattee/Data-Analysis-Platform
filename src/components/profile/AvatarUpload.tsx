"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const PREVIEW_SIZE = 200;
const OUTPUT_SIZE = 200;
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

interface AvatarUploadProps {
  currentAvatar?: string;
  fallbackText?: string;
  onConfirm: (dataUrl: string) => void;
}

export function AvatarUpload({ currentAvatar, fallbackText = "U", onConfirm }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const baseScaleRef = useRef(1);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [userScale, setUserScale] = useState(1); // 用户缩放倍数 (1~3)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  const displayScale = baseScaleRef.current * userScale;

  // 打开文件选择
  const handlePick = () => {
    setErrorMsg("");
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrorMsg("仅支持 JPG / PNG 格式");
      return;
    }
    if (file.size > MAX_SIZE) {
      setErrorMsg("图片大小不能超过 2MB（当前 " + (file.size / 1024 / 1024).toFixed(1) + "MB）");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        // baseScale = 以短边填满 PREVIEW_SIZE 的缩放
        baseScaleRef.current = PREVIEW_SIZE / Math.min(img.width, img.height);
        setUserScale(1);
        // 居中偏移
        const dw = img.width * baseScaleRef.current;
        const dh = img.height * baseScaleRef.current;
        setOffset({ x: (PREVIEW_SIZE - dw) / 2, y: (PREVIEW_SIZE - dh) / 2 });
        setRawSrc(src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // 拖拽事件
  useEffect(() => {
    if (!rawSrc) return;
    const handleMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !imgRef.current) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const ds = baseScaleRef.current * userScale;
      const dw = imgRef.current.width * ds;
      const dh = imgRef.current.height * ds;
      // clamp: 图片始终覆盖预览框
      const nx = Math.min(0, Math.max(PREVIEW_SIZE - dw, drag.baseX + dx));
      const ny = Math.min(0, Math.max(PREVIEW_SIZE - dh, drag.baseY + dy));
      setOffset({ x: nx, y: ny });
    };
    const handleUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [rawSrc, userScale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  // 确认裁剪
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const ds = displayScale;
    const sx = -offset.x / ds;
    const sy = -offset.y / ds;
    const sSize = PREVIEW_SIZE / ds;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // 白底防止透明
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onConfirm(dataUrl);
    setRawSrc(null);
  };

  const handleCancel = () => setRawSrc(null);

  const imgLayoutW = (imgRef.current?.width ?? PREVIEW_SIZE) * baseScaleRef.current;
  const imgLayoutH = (imgRef.current?.height ?? PREVIEW_SIZE) * baseScaleRef.current;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 当前头像 */}
      <button
        type="button"
        onClick={handlePick}
        className="group relative w-24 h-24 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-3xl font-bold overflow-hidden ring-2 ring-white shadow-sm hover:ring-primary-300 transition-all"
        title="点击上传头像"
      >
        {currentAvatar ? (
          <img src={currentAvatar} alt="头像" className="w-full h-full object-cover" />
        ) : (
          fallbackText.charAt(0).toUpperCase()
        )}
        <span className="absolute inset-0 bg-black/40 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          更换
        </span>
      </button>
      <p className="text-xs text-gray-400 text-center">
        点击头像上传，支持 JPG/PNG，建议 200×200 以上，≤2MB
      </p>
      {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 裁剪弹窗 */}
      <Modal open={!!rawSrc} onClose={handleCancel} title="裁剪头像" size="sm">
        <div className="flex flex-col items-center gap-4">
          {/* 圆形预览框 */}
          <div
            className="relative rounded-full overflow-hidden bg-gray-200 cursor-move select-none"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            onMouseDown={handleMouseDown}
          >
            {rawSrc && (
              <img
                src={rawSrc}
                alt="裁剪"
                draggable={false}
                className="absolute top-0 left-0 max-w-none"
                style={{
                  width: imgLayoutW,
                  height: imgLayoutH,
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${userScale})`,
                  transformOrigin: "0 0",
                }}
              />
            )}
            {/* 圆形遮罩边框 */}
            <div className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none" />
          </div>

          {/* 缩放手柄 */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs text-gray-500 whitespace-nowrap">缩放</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={userScale}
              onChange={(e) => setUserScale(Number(e.target.value))}
              className="flex-1 accent-primary-600"
            />
            <span className="text-xs text-gray-400 w-8 text-right">{userScale.toFixed(1)}x</span>
          </div>
          <p className="text-xs text-gray-400">拖拽图片调整裁剪区域</p>

          <div className="flex justify-end gap-2 w-full pt-2">
            <Button variant="ghost" onClick={handleCancel}>取消</Button>
            <Button onClick={handleConfirm}>确认保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
