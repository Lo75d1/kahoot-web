"use client";

import { useState } from "react";
import { Bot, Heart, Info, ShieldCheck, X } from "lucide-react";

type InfoPage = "about" | "privacy" | "ai";

const CONTENT: Record<InfoPage, { title: string; icon: typeof Info; body: React.ReactNode }> = {
  about: {
    title: "Về UDA Assessment Hub",
    icon: Heart,
    body: <p>UDA Assessment Hub là đồ án đề xuất giúp giảng viên biến tài liệu thành ngân hàng câu hỏi và sử dụng nội dung đã kiểm duyệt cho học, ôn, thi hoặc lớp học trực tiếp.</p>,
  },
  privacy: {
    title: "Quyền riêng tư",
    icon: ShieldCheck,
    body: <><p>Bộ đề của khách được lưu trên thiết bị. Khi đăng nhập, dữ liệu được lưu trong tài khoản Supabase và chỉ chủ sở hữu hoặc lớp học được cấp quyền mới truy cập được.</p><p className="mt-3">Không gửi mật khẩu, khóa API hoặc tài liệu nhạy cảm vào ô nội dung công khai. Tệp dùng cho AI chỉ nên chứa dữ liệu mà bạn có quyền xử lý.</p></>,
  },
  ai: {
    title: "Minh bạch về AI",
    icon: Bot,
    body: <><p>AI có thể trích xuất hoặc tạo câu hỏi nhưng vẫn có thể hiểu sai tài liệu. Mọi câu do AI xử lý được đưa về trạng thái cần kiểm tra trước khi xuất bản.</p><p className="mt-3">Giáo viên chịu trách nhiệm duyệt đáp án, lời giải và nguồn trích dẫn trước khi giao cho học sinh.</p></>,
  },
};

export default function SiteFooter() {
  const [page, setPage] = useState<InfoPage | null>(null);
  const info = page ? CONTENT[page] : null;
  const InfoIcon = info?.icon;

  return (
    <>
      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pb-6 pt-2 text-xs text-white/60 sm:px-8">
        <p>© {new Date().getFullYear()} UDA Assessment Hub · Đồ án đề xuất cho Đại học Đông Á</p>
        <nav className="flex flex-wrap gap-1" aria-label="Thông tin website">
          <button onClick={() => setPage("about")} className="min-h-11 rounded-lg px-3 hover:bg-white/10 hover:text-white">Về hệ thống</button>
          <button onClick={() => setPage("privacy")} className="min-h-11 rounded-lg px-3 hover:bg-white/10 hover:text-white">Quyền riêng tư</button>
          <button onClick={() => setPage("ai")} className="min-h-11 rounded-lg px-3 hover:bg-white/10 hover:text-white">Cách dùng AI</button>
        </nav>
      </footer>

      {info && InfoIcon && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPage(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="site-info-title" className="w-full max-w-lg rounded-[1.75rem] border border-white/15 bg-[#f7f4e9] p-6 text-slate-800 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#173c31] text-[#d7f37b]"><InfoIcon size={22} aria-hidden /></span>
                <h2 id="site-info-title" className="text-xl font-extrabold text-[#173c31]">{info.title}</h2>
              </div>
              <button onClick={() => setPage(null)} aria-label="Đóng" className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-900"><X size={20} /></button>
            </div>
            <div className="mt-5 text-sm leading-7 text-slate-600">{info.body}</div>
          </section>
        </div>
      )}
    </>
  );
}
