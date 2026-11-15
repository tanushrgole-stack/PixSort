import Link from "next/link";
import { Camera, Sparkles, Users, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  const eventTypes = [
    { label: "Weddings", emoji: "💍" },
    { label: "Trips", emoji: "✈️" },
    { label: "Parties", emoji: "🎉" },
    { label: "Birthdays", emoji: "🎂" },
    { label: "Family", emoji: "🏡" },
    { label: "College Fests", emoji: "🎓" },
    { label: "Corporate", emoji: "💼" },
  ];

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-4 border-b border-sunset-rose/40">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sunset-coral to-sunset-golden flex items-center justify-center text-white shadow-warm">
            <Camera className="w-5 h-5" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-sunset-text dark:text-sunset-dark-text">
            PixSort
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="px-3 py-1 rounded-full bg-sunset-rose/50 text-sunset-coral font-medium text-xs uppercase tracking-wider">
            Scaffold Ready
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="my-16 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-sunset-dark-surface border border-sunset-rose/60 text-sunset-text text-sm shadow-soft">
          <Sparkles className="w-4 h-4 text-sunset-golden animate-pulse" />
          <span>AI Face Sorting for Every Gathering</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-sunset-text dark:text-sunset-dark-text max-w-3xl mx-auto leading-tight">
          Every moment captured, sorted for{" "}
          <span className="text-sunset-coral underline decoration-sunset-golden/60 decoration-wavy">
            everyone
          </span>.
        </h1>

        <p className="text-lg sm:text-xl text-sunset-text/80 dark:text-sunset-dark-text/80 max-w-2xl mx-auto font-sans leading-relaxed">
          Upload event photos to a shared pool. Our background AI detects faces and instantly builds personal albums for each guest with zero accounts required.
        </p>

        {/* Event Type Badges */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {eventTypes.map((type) => (
            <span
              key={type.label}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-sunset-dark-surface text-sunset-text dark:text-sunset-dark-text text-xs font-medium border border-sunset-rose/30 shadow-sm"
            >
              {type.emoji} {type.label}
            </span>
          ))}
        </div>

        {/* Action Placeholders */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-sunset-coral hover:bg-sunset-coral/90 text-white font-medium shadow-warm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create Event (Coming Soon)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-sunset-dark-surface border border-sunset-rose hover:bg-sunset-rose/20 text-sunset-text dark:text-sunset-dark-text font-medium shadow-soft transition-all cursor-pointer"
          >
            <span>Join with QR / Code</span>
          </button>
        </div>
      </div>

      {/* Pillars Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-8 border-t border-sunset-rose/40">
        <div className="p-5 rounded-2xl bg-white dark:bg-sunset-dark-surface border border-sunset-rose/40 shadow-soft space-y-2">
          <div className="w-9 h-9 rounded-xl bg-sunset-rose/60 flex items-center justify-center text-sunset-coral">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-semibold text-lg">No Accounts Needed</h3>
          <p className="text-sm text-sunset-text/70 dark:text-sunset-dark-text/70">
            Guests join with a quick selfie scan and name. Personal albums populate automatically.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-sunset-dark-surface border border-sunset-rose/40 shadow-soft space-y-2">
          <div className="w-9 h-9 rounded-xl bg-sunset-golden/20 flex items-center justify-center text-sunset-golden">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-semibold text-lg">InsightFace Matching</h3>
          <p className="text-sm text-sunset-text/70 dark:text-sunset-dark-text/70">
            Background embeddings group solo and group shots across moments effortlessly.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-sunset-dark-surface border border-sunset-rose/40 shadow-soft space-y-2">
          <div className="w-9 h-9 rounded-xl bg-sunset-coral/10 flex items-center justify-center text-sunset-coral">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-semibold text-lg">Privacy First</h3>
          <p className="text-sm text-sunset-text/70 dark:text-sunset-dark-text/70">
            Only vectors stored, no raw selfie retention, guest opt-out, and auto-expiring events.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-sunset-text/60 dark:text-sunset-dark-text/60">
        PixSort Project &bull; Sunset Memories Theme &bull; Phase 1 Scaffold
      </footer>
    </main>
  );
}
