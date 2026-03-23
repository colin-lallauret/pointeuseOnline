"use client";

import { useState } from "react";
import { CheckIn, CheckInType } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { CHECK_IN_LABELS, CHECK_IN_ICONS } from "@/lib/timeUtils";
import { format, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { toast } from "sonner";

const TZ = "Europe/Paris";

interface ManualEntryModalProps {
    type: CheckInType;
    existingCheckIn: CheckIn | null; // null = ajout, object = modification
    defaultDate: string;             // "yyyy-MM-dd" du jour concerné
    userId: string;
    onClose: () => void;
    onSave: () => void;
}

export function ManualEntryModal({
    type,
    existingCheckIn,
    defaultDate,
    userId,
    onClose,
    onSave,
}: ManualEntryModalProps) {
    const supabase = createClient();

    // Initialise avec l'heure existante ou une valeur sensée par type
    const defaultTimes: Record<CheckInType, string> = {
        morning_in: "08:30",
        lunch_out: "12:00",
        lunch_in: "13:00",
        evening_out: "17:00",
    };

    const [date, setDate] = useState(() => {
        if (existingCheckIn) {
            return format(toZonedTime(parseISO(existingCheckIn.timestamp), TZ), "yyyy-MM-dd");
        }
        return defaultDate;
    });

    const [time, setTime] = useState(() => {
        if (existingCheckIn) {
            return format(toZonedTime(parseISO(existingCheckIn.timestamp), TZ), "HH:mm");
        }
        return defaultTimes[type];
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleSave() {
        setIsSaving(true);
        // Convertit date + time Paris → UTC ISO
        const [h, m] = time.split(":").map(Number);
        const localDate = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
        const utcTimestamp = fromZonedTime(localDate, TZ).toISOString();

        if (existingCheckIn) {
            const { error } = await supabase
                .from("check_ins")
                .update({ timestamp: utcTimestamp, is_manual: true })
                .eq("id", existingCheckIn.id);
            if (error) {
                toast.error("Erreur lors de la modification");
                setIsSaving(false);
                return;
            }
            toast.success("✏️ Pointage modifié");
        } else {
            const { error } = await supabase.from("check_ins").insert({
                user_id: userId,
                type,
                timestamp: utcTimestamp,
                is_manual: true,
            });
            if (error) {
                toast.error("Erreur lors de l'ajout");
                setIsSaving(false);
                return;
            }
            toast.success("➕ Pointage ajouté manuellement");
        }

        onSave();
        onClose();
    }

    async function handleDelete() {
        if (!existingCheckIn) return;
        setIsDeleting(true);
        const { error } = await supabase.from("check_ins").delete().eq("id", existingCheckIn.id);
        if (error) {
            toast.error("Erreur lors de la suppression");
            setIsDeleting(false);
            return;
        }
        toast.success("🗑️ Pointage supprimé");
        onSave();
        onClose();
    }

    return (
        // Overlay
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Bottom sheet */}
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl p-6 animate-in slide-in-from-bottom-4 duration-300">
                {/* Handle */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6" />

                {/* Title */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl">
                        {CHECK_IN_ICONS[type]}
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white">{CHECK_IN_LABELS[type]}</p>
                        <p className="text-xs text-slate-400">
                            {existingCheckIn ? "Modifier le pointage" : "Ajouter manuellement"}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Date picker */}
                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-base focus:outline-none focus:border-violet-500 transition-colors"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>

                    {/* Time picker */}
                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                            Heure
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-2xl font-bold tabular-nums focus:outline-none focus:border-violet-500 transition-colors text-center"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="mt-6 space-y-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-base active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                    >
                        {isSaving ? "Enregistrement…" : existingCheckIn ? "✓ Modifier" : "➕ Ajouter"}
                    </button>

                    {existingCheckIn && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full py-3 rounded-2xl bg-red-950/50 border border-red-800/50 text-red-400 font-medium text-sm active:scale-95 transition-all disabled:opacity-50 hover:bg-red-900/50"
                        >
                            {isDeleting ? "Suppression…" : "🗑️ Supprimer ce pointage"}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl bg-slate-800 text-slate-400 font-medium text-sm active:scale-95 transition-all hover:bg-slate-700"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
}
