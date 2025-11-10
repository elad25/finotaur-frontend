import PageTitle from "@/components/PageTitle";

export default function JournalCommunity() {
  return (
    <div className="p-6 space-y-6">
      <PageTitle title="Community Blog" subtitle="" />
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-zinc-100">
            Coming Soon
          </h2>
          <p className="text-xl text-zinc-400">
            Stay Tuned! 🚀
          </p>
          <div className="pt-4">
            <div className="inline-block px-6 py-2 rounded-full bg-zinc-800/50 border border-zinc-700">
              <span className="text-sm text-zinc-500">
                We're working on something amazing
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}