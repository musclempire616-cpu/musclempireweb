import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { fetchFresh, type AssessmentData } from "@/lib/assessments";
import { ArrowLeft, LogOut, Calendar, Target, TrendingDown, TrendingUp, User, Activity } from "lucide-react";
import { motion } from "framer-motion";
import AdminGuard from "@/components/AdminGuard";
import { logout } from "@/lib/adminAuth";
import Lenis from "lenis";

function StatusBadge({ status }: { status: string }) {
  const s = (status || "New").trim();
  const colors: Record<string, string> = {
    New: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
    "In Progress": "bg-blue-400/15 text-blue-400 border-blue-400/30",
    Completed: "bg-green-400/15 text-green-400 border-green-400/30",
  };
  return (
    <span className={"px-2 py-0.5 text-xs font-bold uppercase tracking-wider border rounded-full " + (colors[s] || "bg-white/10 text-white border-white/20")}>
      {s}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-green-400" }: {
  label: string; value: string; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-[#161b22] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
      </div>
      <p className={"text-lg font-black " + color}>{value || "--"}</p>
    </div>
  );
}

export default function AdminTrackRecord({ params }: { params: { phone: string } }) {
  const [, navigate] = useLocation();
  const [records, setRecords] = useState<(AssessmentData & { _arrayIndex: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const phone = decodeURIComponent(params.phone);

  useEffect(() => {
    fetchFresh().then((data) => {
      const matched = data
        .map((d, i) => ({ ...d, _arrayIndex: i }))
        .filter((d) => {
          const normalize = (p: string) => {
            const digits = String(p).replace(/\D/g, "");
            // Strip leading country code (91) if present and number is 12 digits
            return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(-10);
          };
          return normalize(String(d.phone)) === normalize(String(phone));
        })
        .sort((a, b) => {
          const da = new Date(a.date).getTime() || 0;
          const db = new Date(b.date).getTime() || 0;
          return da - db;
        });
      setRecords(matched);
      setLoading(false);
    });
  }, [phone]);

  const customerName = records[0]?.name ?? "Unknown";
  const firstRecord = records[0];
  const latestRecord = records[records.length - 1];

  const dietPlanStatus = (record: AssessmentData) => {
    const keys = ["earlyMorning", "breakfast", "midMorning", "lunch", "eveningSnack", "preWorkout", "postWorkout", "dinner", "beforeBed", "supplementsPlan", "notes"];
    const filled = keys.filter((k) => !!(record as Record<string, unknown>)[k]);
    if (filled.length === 0) return { label: "Not Prepared", color: "text-red-400" };
    if (filled.length < 5) return { label: "Partial", color: "text-yellow-400" };
    return { label: "Ready", color: "text-green-400" };
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#0d1117] text-white">
        <div className="bg-[#161b22] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => navigate("/sagarkharat/dashboard")}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-green-400" />
            <span className="text-green-400 font-black uppercase tracking-widest text-sm">Track Record</span>
          </div>
          <button onClick={() => { logout(); navigate("/sagarkharat"); }}
            className="flex items-center gap-1.5 text-red-400/60 hover:text-red-400 text-xs transition-colors">
            <LogOut size={13} /> Logout
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          {loading ? (
            <div className="text-center py-20 text-white/40">Loading track record...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-20 text-white/40">No assessments found for this phone number.</div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-green-400/15 border border-green-400/30 rounded-full flex items-center justify-center">
                    <User size={18} className="text-green-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white">{customerName}</h1>
                    <p className="text-white/40 text-sm">{phone}</p>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <StatCard label="First Consultation" value={firstRecord?.date ?? "--"} icon={Calendar} color="text-white/70" />
                <StatCard label="Latest Consultation" value={latestRecord?.date ?? "--"} icon={Calendar} color="text-green-400" />
                <StatCard label="Total Consultations" value={String(records.length)} icon={Activity} color="text-blue-400" />
                <StatCard label="Starting Weight" value={firstRecord?.weight ? firstRecord.weight + " kg" : "--"} icon={TrendingDown} color="text-yellow-400" />
                <StatCard label="Current Weight" value={latestRecord?.weight ? latestRecord.weight + " kg" : "--"} icon={TrendingUp} color="text-green-400" />
                <StatCard label="Target Weight" value={latestRecord?.targetWeight ? latestRecord.targetWeight + " kg" : "--"} icon={Target} color="text-purple-400" />
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-green-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Assessment History ({records.length})
              </h2>

              <div className="space-y-4">
                {records.map((record, idx) => {
                  const dp = dietPlanStatus(record);
                  return (
                    <motion.div key={record.id ?? record._arrayIndex}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-[#161b22] border border-white/10 rounded-xl p-5">
                      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-green-400/10 border border-green-400/20 rounded-full flex items-center justify-center text-xs font-black text-green-400">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{record.date}</p>
                            <p className="text-white/40 text-xs">Consultation #{idx + 1}</p>
                          </div>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                        <div>
                          <span className="text-white/40 text-xs uppercase tracking-widest block mb-0.5">BMI</span>
                          <span className="text-white font-bold">{record.bmi || "--"} <span className="text-white/40 font-normal text-xs">({record.bmiCategory || "--"})</span></span>
                        </div>
                        <div>
                          <span className="text-white/40 text-xs uppercase tracking-widest block mb-0.5">Weight</span>
                          <span className="text-white font-bold">{record.weight ? record.weight + " kg" : "--"}</span>
                        </div>
                        <div>
                          <span className="text-white/40 text-xs uppercase tracking-widest block mb-0.5">Goals</span>
                          <span className="text-white font-bold truncate block max-w-[200px]">{record.goals || "--"}</span>
                        </div>
                      </div>

                      {record.remarks && (
                        <div className="mb-4">
                          <span className="text-white/40 text-xs uppercase tracking-widest block mb-1">Remarks</span>
                          <p className="text-white/70 text-sm bg-white/5 rounded-lg px-3 py-2">{record.remarks}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-xs uppercase tracking-widest">Diet Plan:</span>
                          <span className={"text-xs font-bold " + dp.color}>{dp.label}</span>
                        </div>
                        <button onClick={() => navigate("/sagarkharat/customer/" + (record.id ?? record._arrayIndex))}
                          className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-400/30 text-green-400 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-colors">
                          View Assessment
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
