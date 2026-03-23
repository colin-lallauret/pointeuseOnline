"use client";

import { CheckInType } from "@/types";
import { CHECK_IN_LABELS, CHECK_IN_ICONS } from "@/lib/timeUtils";

interface CheckInButtonProps {
    nextCheckIn: CheckInType | null;
    isOutOfRange: boolean;
    onCheckIn: () => void;
}

export function CheckInButton({ nextCheckIn, isOutOfRange, onCheckIn }: CheckInButtonProps) {
    if (!nextCheckIn) {
        return (
            <div className="w-full py-6 flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-4xl animate-bounce-slow">
                    ✅
                </div>
                <p className="text-lg font-semibold text-emerald-400">Journée complète !</p>
                <p className="text-sm text-slate-400">Tous vos pointages sont enregistrés.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Out of range alert */}
            {isOutOfRange && (
                <div className="w-full bg-red-950/50 border border-red-700/50 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <span className="text-red-400 text-xl">⚠️</span>
                    <div>
                        <p className="text-sm font-semibold text-red-400">Hors plage horaire</p>
                        <p className="text-xs text-red-500/80">Ce pointage sera marqué comme anomalie</p>
                    </div>
                </div>
            )}

            {/* Big action button */}
            <button
                onClick={onCheckIn}
                className={`
          w-full py-6 rounded-3xl text-xl font-bold
          flex items-center justify-center gap-4
          transition-all duration-200 active:scale-95
          shadow-2xl border
          ${isOutOfRange
                        ? "bg-gradient-to-br from-red-600 to-orange-600 border-red-500/30 shadow-red-500/20 hover:from-red-500 hover:to-orange-500"
                        : "bg-gradient-to-br from-violet-600 to-indigo-600 border-violet-500/30 shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500"
                    }
        `}
                style={{
                    WebkitTapHighlightColor: "transparent",
                }}
            >
                <span className="text-3xl filter drop-shadow">{CHECK_IN_ICONS[nextCheckIn]}</span>
                <span>{CHECK_IN_LABELS[nextCheckIn]}</span>
            </button>

            <p className="text-xs text-slate-500">
                Appuyez pour enregistrer {CHECK_IN_LABELS[nextCheckIn].toLowerCase()}
            </p>
        </div>
    );
}
