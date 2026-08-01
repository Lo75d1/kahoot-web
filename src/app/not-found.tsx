import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#071b16] p-5 text-center text-white">
      <div className="max-w-md rounded-[2rem] bg-[#f3efdf] p-8 text-slate-800 shadow-2xl">
        <SearchX className="mx-auto text-emerald-700" size={44} aria-hidden />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-800">Lỗi 404</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#173c31]">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Đường dẫn này có thể đã thay đổi hoặc không còn tồn tại.</p>
        <Link href="/" className="mx-auto mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#173c31] px-5 font-bold text-white hover:bg-[#205040]"><ArrowLeft size={18} />Về ngân hàng đề</Link>
      </div>
    </main>
  );
}
