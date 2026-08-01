import QuizApp from "@/components/QuizApp";
import SoundToggle from "@/components/SoundToggle";
import SiteFooter from "@/components/SiteFooter";
import UdaBrandHeader from "@/components/UdaBrandHeader";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#018f41]">
      {/* Quầng sáng mờ trôi nền */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="animate-float absolute -left-24 top-8 h-72 w-72 rounded-full bg-white/15 blur-3xl"
          style={{ animationDuration: "14s" }}
        />
        <div
          className="animate-float absolute right-[-4rem] top-1/3 h-80 w-80 rounded-full bg-[#ef9b83]/20 blur-3xl"
          style={{ animationDuration: "19s", animationDelay: "-4s" }}
        />
        <div
          className="animate-float absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          style={{ animationDuration: "16s", animationDelay: "-8s" }}
        />
        <div
          className="animate-float absolute bottom-8 right-1/4 h-64 w-64 rounded-full bg-[#f58220]/15 blur-3xl"
          style={{ animationDuration: "21s", animationDelay: "-2s" }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <UdaBrandHeader />
        <SoundToggle />
        <QuizApp />
        <SiteFooter />
      </div>
    </main>
  );
}
