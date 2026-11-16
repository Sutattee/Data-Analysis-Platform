import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store/AppContext";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "智能分析平台",
  description: "智能分析平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <AppProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
