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
  title: "UDA Assessment Hub — học tập và khảo thí thông minh",
  description:
    "Biến tài liệu thành bộ câu hỏi có cấu trúc để học, ôn, thi và chơi trực tiếp.",
  openGraph: {
    title: "UDA Assessment Hub — Học tập và khảo thí thông minh",
    description: "Tạo đề từ tài liệu, học, ôn, thi và tổ chức trò chơi trực tiếp.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "UDA Assessment Hub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "UDA Assessment Hub — Học tập và khảo thí thông minh",
    description: "Tạo đề từ tài liệu, học, ôn, thi và tổ chức trò chơi trực tiếp.",
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
