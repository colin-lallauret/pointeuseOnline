"use client";

import { useState } from "react";
import { CheckIn, CheckInType } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { CHECK_IN_LABELS, CHECK_IN_ICONS, getDayKey } from "@/lib/timeUtils";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const TZ = "Europe/Paris";

interface HistoryModalProps {
    checkIns: CheckIn[];
    onClose: () => void;
    onUpdate: () => void;
    userId: string;
}

interface EditState {
    id: string;
    timestamp: string;
}

export function HistoryModal({ checkIns, onClose, onUpdate, userId }: HistoryModalProps) {
    const supabase = createClient();
    const [editState, setEditState] = useState<EditState | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Group by day
    const byDay: Record<string, CheckIn[]> = {};
    for (const ci of checkIns) {
        const day = getDayKey(ci.timestamp);
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(ci);
    }
    const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

    async function handleEdit(ci: CheckIn) {
        if (!editState) return;
        const [h, m] = editState.timestamp.split(":");
        const original = parseISO(ci.timestamp);
        const paris = toZonedTime(original, TZ);
        paris.setHours(parseInt(h), parseInt(m), 0, 0);

        const { error } = await supabase
            .from("check_ins")
            .update({ timestamp: paris.toISOString(), is_manual: true })
            .eq("id", ci.id);

        if (error) {
            toast.error("Erreur lors de la modification");
        } else {
            toast.success("Pointage modifié");
            setEditState(null);
            onUpdate();
        }
    }

    async function handleDelete(ci: CheckIn) {
        setIsDeleting(ci.id);
        const { error } = await supabase.from("check_ins").delete().eq("id", ci.id);
        if (error) {
            toast.error("Erreur lors de la suppression");
        } else {
            toast.success("Pointage supprimé");
            onUpdate();
        }
        setIsDeleting(null);
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
            {/* Header */}
            <div className="px-5 pt-14 pb-4 flex items-center justify-between border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">Historique</h2>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-95 transition-all"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {sortedDays.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <p className="text-4xl mb-3">📭</p>
                        <p>Aucun pointage cette semaine</p>
                    </div>
                )}

                {sortedDays.map((day) => {
                    const paris = toZonedTime(parseISO(`${day}T12:00:00`), TZ);
                    const dayLabel = format(paris, "EEEE d MMMM", { locale: fr });

                    return (
                        <div key={day}>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2 capitalize">
                                {dayLabel}
                            </p>
                            <div className="space-y-2">
                                {byDay[day].map((ci) => {
                                    const parisTs = toZonedTime(parseISO(ci.timestamp), TZ);
                                    const isEditing = editState?.id === ci.id;

                                    return (
                                        <div
                                            key={ci.id}
                                            className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{CHECK_IN_ICONS[ci.type]}</span>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{CHECK_IN_LABELS[ci.type]}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {isEditing ? (
                                                            <input
                                                                type="time"
                                                                defaultValue={format(parisTs, "HH:mm")}
                                                                onChange={(e) => setEditState({ id: ci.id, timestamp: e.target.value })}
                                                                className="text-xs font-mono bg-slate-800 border border-violet-600 rounded-lg px-2 py-0.5 text-white focus:outline-none"
                                                            />
                                                        ) : (
                                                            <span className="text-xs font-mono text-slate-400">
                                                                {format(parisTs, "HH:mm")}
                                                            </span>
                                                        )}
                                                        {ci.is_manual && (
                                                            <Badge variant="outline" className="text-xs border-amber-700/50 text-amber-500 py-0">
                                                                Manuel
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(ci)}
                                                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                                                        >
                                                            ✓ Sauver
                                                        </button>
                                                        <button
                                                            onClick={() => setEditState(null)}
                                                            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setEditState({ id: ci.id, timestamp: format(parisTs, "HH:mm") })}
                                                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                                                            title="Modifier"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(ci)}
                                                            disabled={isDeleting === ci.id}
                                                            className="w-8 h-8 rounded-xl bg-red-950/50 hover:bg-red-900/50 flex items-center justify-center text-red-400 active:scale-95 transition-all"
                                                            title="Supprimer"
                                                        >
                                                            {isDeleting === ci.id ? "…" : "🗑️"}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
