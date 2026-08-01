import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kahoot-web-pi.vercel.app"),
  title: "UDA Assessment Hub — AI phân tích, code nhập đề",
  description:
    "Dùng AI ngoài hoặc AI local tạo quy tắc, rồi chạy code nhập tài liệu thành bộ đề có cấu trúc.",
  openGraph: {
    title: "UDA Assessment Hub — AI nhập đề từ tài liệu",
    description: "Một ô tải tài liệu để AI nhận diện và chuẩn hóa bộ đề.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "UDA Assessment Hub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "UDA Assessment Hub — AI nhập đề từ tài liệu",
    description: "Một ô tải tài liệu để AI nhận diện và chuẩn hóa bộ đề.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
