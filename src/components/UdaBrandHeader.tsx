export default function UdaBrandHeader() {
  return (
    <header className="relative z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 pr-20 sm:px-8 sm:pr-24">
        {/* Logo lấy nguyên bản từ trang nhận diện chính thức của Đại học Đông Á. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://donga.edu.vn/Portals/0/LOGO_UDA_vn_2023_duyet.png"
          alt="Đại học Đông Á"
          className="h-12 w-auto max-w-[210px] object-contain sm:h-14 sm:max-w-[270px]"
        />
        <div className="hidden border-l-2 border-[#ef9b83] pl-5 text-right sm:block">
          <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#018f41]">
            UDA Assessment Hub
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            AI nhập đề · Chuẩn hóa ngân hàng câu hỏi
          </p>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-[#018f41] via-[#00aa4d] to-[#ef9b83]" />
    </header>
  );
}
