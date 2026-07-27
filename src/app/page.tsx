import QuizGame from "@/components/QuizGame";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600">
      <QuizGame />
      <footer className="pb-4 text-center text-xs text-white/50">
        Quiz M1 · bản solo · Next.js
      </footer>
    </main>
  );
}
