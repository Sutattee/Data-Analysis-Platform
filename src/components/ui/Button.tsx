"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none";

  const variants: Record<string, string> = {
    primary: [
      "bg-primary-600 text-white",
      "hover:bg-primary-700 hover:shadow-md",
      "active:scale-[0.97] active:bg-primary-800",
      "focus:ring-primary-500",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-600 disabled:hover:shadow-none disabled:active:scale-100",
    ].join(" "),
    secondary: [
      "bg-gray-100 text-gray-700",
      "hover:bg-gray-200 hover:shadow-sm",
      "active:scale-[0.97] active:bg-gray-300",
      "focus:ring-gray-400",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:shadow-none disabled:active:scale-100",
    ].join(" "),
    ghost: [
      "text-gray-600 bg-transparent",
      "hover:bg-gray-100 hover:text-gray-800",
      "active:scale-[0.97] active:bg-gray-200",
      "focus:ring-gray-400",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:active:scale-100",
    ].join(" "),
    danger: [
      "bg-red-600 text-white",
      "hover:bg-red-700 hover:shadow-md",
      "active:scale-[0.97] active:bg-red-800",
      "focus:ring-red-500",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600 disabled:hover:shadow-none disabled:active:scale-100",
    ].join(" "),
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs gap-1",
    md: "px-4 py-2 text-sm gap-1.5",
    lg: "px-6 py-3 text-base gap-2",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
