import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { fetchFresh, updateRecord, normalizeAssessment, type AssessmentData } from "@/lib/sheets";
import { ArrowLeft, Download, MessageCircle, CheckCircle2, Save, LogOut, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import AdminGuard from "@/components/AdminGuard";
import { logout } from "@/lib/adminAuth";
import { getSelectedAssessment, clearSelectedAssessment } from "@/lib/adminStore";
import logoPng from "@/assets/images/logo-footer.webp";

// Bottom fields — Suggestion only (fixed)
const EXTRA_FIELDS = [
  { key: "preWorkout", label: "Pre-Workout" },
  { key: "postWorkout", label: "Post-Workout" },
  { key: "supplementsPlan", label: "Supplements" },
  { key: "notes", label: "Notes" },
] as const;

// Dynamic meal entry type
type MealEntry = { id: string; meal: string; time: string; suggestion: string };

function formatDate(raw: string | undefined): string {
  if (!raw) return "--";
  const s = String(raw).trim();
  if (!s.includes("GMT") && !s.includes("00:00:00") && s.length < 20) return s;
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  } catch {}
  return s;
}

function clean(val: string | undefined | null): string {
  const s = String(val ?? "").trim();
  if (!s || s === "0" || s === "undefined" || s === "null" || s === "--") return "--";
  if (s.includes("1899") || s.startsWith("Sat Dec") || s.startsWith("Sun Dec") ||
      s.includes("GMT+") || s.includes("GMT-")) {
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {}
    return "--";
  }
  return s;
}

function cleanText(val: string | undefined | null): string {
  const s = String(val ?? "").trim();
  if (!s || s === "0" || s === "undefined" || s === "null" || s === "--") return "--";
  if (s.includes("1899") || s.includes("GMT+") || s.includes("GMT-")) return "--";
  return s;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2 border-b border-white/5">
      <span className="text-white/40 text-xs uppercase tracking-widest font-bold w-40 shrink-0">{label}</span>
      <span className="text-white text-sm break-all min-w-0">{clean(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#161b22] border border-white/10 rounded-xl p-5 mb-4">
      <h3 className="text-green-400 font-black uppercase tracking-widest text-xs mb-4 pb-2 border-b border-white/10">{title}</h3>
      {children}
    </div>
  );
}

function bodyFatCategoryLabel(bf: number, gender: string): string {
  const isMale = String(gender || "").toLowerCase() === "male";
  if (isMale) {
    if (bf < 6) return "Essential Fat";
    if (bf < 14) return "Athletic/Fit";
    if (bf < 18) return "Fitness";
    if (bf < 25) return "Average";
    return "Obese";
  } else {
    if (bf < 14) return "Essential Fat";
    if (bf < 21) return "Athletic/Fit";
    if (bf < 25) return "Fitness";
    if (bf < 32) return "Average";
    return "Obese";
  }
}

function getBodyFatStr(bmiStr: string | undefined, ageStr: string | undefined, genderStr: string | undefined): string {
  const bmiVal = parseFloat(String(bmiStr || "0"));
  const ageVal = parseFloat(String(ageStr || "0"));
  const gender = String(genderStr || "");
  if (!bmiVal || !ageVal || !gender) return "--";
  const genderVal = gender.toLowerCase() === "male" ? 1 : 0;
  const bf = (1.20 * bmiVal) + (0.23 * ageVal) - (10.8 * genderVal) - 5.4;
  if (bf <= 0 || isNaN(bf)) return "--";
  const cat = bodyFatCategoryLabel(bf, gender);
  return `${bf.toFixed(1)}% (${cat})`;
}

function getNormalizedCustomer(c: AssessmentData): AssessmentData {
  return normalizeAssessment(c);
}

export default function AdminCustomer({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const [customer, setCustomer] = useState<AssessmentData | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [rowIdx, setRowIdx] = useState<number>(0);
  const isLoaded = useRef(false);

  useEffect(() => {
    // PRIMARY: module-level store — set synchronously before navigation, always correct
    const stored = getSelectedAssessment();
    if (stored) {
      clearSelectedAssessment();
      const normStored = getNormalizedCustomer(stored);
      setCustomer(normStored);
      loadPlanFromRecord(normStored);
      const ri = normStored._rowIndex;
      if (ri !== undefined) {
        setRowIdx(ri);
        if (normStored.status === "New") {
          updateRecord(ri, { status: "In Progress" });
          setCustomer(c => c ? { ...c, status: "In Progress" } : c);
        }
      }
      return;
    }
    // FALLBACK: direct URL access — fetch from Sheets
    localStorage.removeItem("me_assessments_ts");
    fetchFresh().then(async (data) => {
      const paramId = params.id;
      const ni = parseInt(paramId);
      let idx = data.findIndex(d => (d._rowIndex ?? -1) === ni);
      let found = idx >= 0 ? data[idx] : undefined;
      if (!found && !isNaN(ni) && data[ni]) { idx = ni; found = data[ni]; }
      if (!found) {
        idx = data.findIndex(d => String(d.id) === paramId);
        found = idx >= 0 ? data[idx] : undefined;
      }
      if (!found || idx < 0) return;
      setRowIdx(idx);
      let normFound = getNormalizedCustomer(found);
      if (normFound.status === "New") {
        await updateRecord(idx, { status: "In Progress" });
        normFound = { ...normFound, status: "In Progress" };
      }
      setCustomer(normFound);
      loadPlanFromRecord(normFound);
    });
  }, [params.id]);

  function loadPlanFromRecord(rec: AssessmentData) {
    isLoaded.current = false; // Pause auto-save while loading record
    const r = rec as Record<string, unknown>;
    const raw = (r["earlyMorning"] || r["Early Morning"] || r["breakfast"] || r["Breakfast"] || r["remarks"] || r["status"] || "") as string;
    let parsed: MealEntry[] = [];
    if (typeof raw === "string" && (raw.startsWith("[") || raw.startsWith("{"))) {
      try {
        const attempt = JSON.parse(raw);
        if (Array.isArray(attempt)) parsed = attempt;
      } catch { /* not JSON */ }
    }

    setMeals(parsed);
    const e: Record<string, string> = {};
    const isReal = (v: string) => !!v && !v.includes("GMT") && !v.includes("1899") && !v.startsWith("[") && !v.startsWith("{") && !v.toLowerCase().includes("payment id") && v !== "--" && v !== "0" && v !== "undefined" && v !== "null";
    
    EXTRA_FIELDS.forEach(f => {
      // Search all key variations returned by Google Sheets (preWorkout, Pre-Workout, pre_workout, etc.)
      const val = String(
        r[f.key] ??
        r[f.label] ??
        r[f.key.toLowerCase()] ??
        r[f.label.toLowerCase()] ??
        (f.key === "preWorkout" ? (r["dinner"] || r["Dinner"]) : "") ??
        (f.key === "postWorkout" ? (r["beforeBed"] || r["Before Bed"]) : "") ??
        ""
      ).trim();
      e[f.key] = isReal(val) ? val : "";
    });
    setExtras(e);
    // Enable auto-save ONLY after state has settled
    setTimeout(() => { isLoaded.current = true; }, 400);
  }

  // Debounced auto-save effect: saves automatically to localStorage and Sheets whenever meals/extras change
  useEffect(() => {
    if (!customer || !isLoaded.current) return;
    // Safety guard: do not auto-save if extras object is completely empty
    if (Object.keys(extras).length === 0) return;

    const timer = setTimeout(() => {
      const sheetsIdx = customer._rowIndex ?? rowIdx;
      const updates: Partial<AssessmentData> = {
        earlyMorning: JSON.stringify(meals),
        status: customer.status === "New" ? "In Progress" : customer.status,
        ...Object.fromEntries(EXTRA_FIELDS.map(f => [f.key, extras[f.key] || ""])),
      };
      updateRecord(sheetsIdx, updates);
    }, 300);

    return () => clearTimeout(timer);
  }, [meals, extras, customer, rowIdx]);

  const addMeal = () => {
    setMeals(m => [...m, { id: Date.now().toString(), meal: "", time: "", suggestion: "" }]);
  };

  const removeMeal = (id: string) => {
    setMeals(m => m.filter(e => e.id !== id));
  };

  const updateMeal = (id: string, field: keyof MealEntry, value: string) => {
    setMeals(m => m.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleMarkComplete = async () => {
    if (!customer) return;
    const sheetsIdx = customer._rowIndex ?? rowIdx;
    await updateRecord(sheetsIdx, { status: "Completed" });
    setCustomer(c => c ? { ...c, status: "Completed" } : c);
  };

  const sendPDF = async () => {
    if (!customer) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 10;
    const usableW = W - margin * 2;
    let y = 10;

    const formatPdfDate = (raw: string | undefined): string => {
      if (!raw) return new Date().toLocaleDateString("en-IN");
      const s = String(raw).trim();
      if (s.includes("GMT") || s.includes("Dec 1899") || s.length > 20) {
        try {
          const d = new Date(s);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
          }
        } catch {}
      }
      return s.split("T")[0] || s;
    };

    let logoDataUrl = "";
    try {
      const response = await fetch(logoPng);
      const blob = await response.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
    } catch { logoDataUrl = ""; }

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", margin, y, 28, 28);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(21);
    doc.setTextColor(0, 0, 0);
    doc.text("MUSCLE EMPIRE NUTRITION", margin + 31, y + 12);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Office : - 9137870108  |  Sagar Kharat : -  9773053632  |  8779682084  |  9702268603", margin + 31, y + 22);

    y += 30;
    doc.setLineWidth(0.6);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, W - margin, y);
    y += 5;

    const drawSectionHeader = (title: string) => {
      if (y > 270) { doc.addPage(); y = 12; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(title.toUpperCase(), margin, y);
      y += 2;
      doc.setLineWidth(0.3);
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, W - margin, y);
      y += 4.5;
    };

    const col1LabelX = margin;
    const col1ValX = margin + 35;
    const col1MaxW = 52;

    const col2LabelX = margin + 100;
    const col2ValX = margin + 132;
    const col2MaxW = 52;

    const drawRow2Col = (l1: string, v1: string, l2?: string, v2?: string) => {
      const val1Str = String(v1 || "--").trim() || "--";
      const val2Str = l2 ? (String(v2 || "--").trim() || "--") : "";

      doc.setFontSize(8.5);

      const lines1 = doc.splitTextToSize(val1Str, col1MaxW) as string[];
      const lines2 = l2 ? (doc.splitTextToSize(val2Str, col2MaxW) as string[]) : [];

      const maxLines = Math.max(lines1.length, lines2.length, 1);
      const rowHeight = maxLines * 4.5 + 1.5;

      if (y + rowHeight > 275) {
        doc.addPage();
        y = 12;
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(l1, col1LabelX, y);
      doc.text(":", col1ValX - 3, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      lines1.forEach((line, i) => {
        doc.text(line, col1ValX, y + i * 4.2);
      });

      if (l2) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(l2, col2LabelX, y);
        doc.text(":", col2ValX - 3, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        lines2.forEach((line, i) => {
          doc.text(line, col2ValX, y + i * 4.2);
        });
      }

      y += rowHeight;
    };

    const mfNoStr = String((customer._rowIndex !== undefined ? customer._rowIndex + 1 : customer.id) || "00001").padStart(5, "0");
    const bfStr = getBodyFatStr(customer.bmi, customer.age, customer.gender);

    const sanitizeRemarks = (raw: string | undefined): string => {
      if (!raw) return "--";
      const s = raw.trim();
      if (s.startsWith("[") || s.startsWith("{") || /meal\s*#|breakfast|lunch|dinner|early morning|before bed|\d{1,2}\s*(am|pm)/i.test(s)) {
        return "--";
      }
      return cleanText(s);
    };

    drawSectionHeader("PERSONAL DETAILS");
    drawRow2Col("Name", cleanText(customer.name), "MF No.", mfNoStr);
    drawRow2Col("Date", formatPdfDate(customer.date), "Contact", cleanText(customer.phone));
    drawRow2Col("Email", cleanText(customer.email), "Age", cleanText(customer.age));
    drawRow2Col("Gender", cleanText(customer.gender));
    y += 2;

    drawSectionHeader("BODY & FITNESS");
    drawRow2Col("Height", customer.height ? `${cleanText(customer.height)} cm` : "--", "Weight", customer.weight ? `${cleanText(customer.weight)} kg` : "--");
    drawRow2Col("BMI", customer.bmi ? `${cleanText(customer.bmi)} (${cleanText(customer.bmiCategory)})` : "--", "Body Fat", bfStr);
    drawRow2Col("Goals", cleanText(customer.goals), "Workout", cleanText(customer.workoutTime));
    y += 2;

    drawSectionHeader("LIFESTYLE");
    drawRow2Col("Wake-up Time", clean(customer.wakeTime), "Bedtime", clean(customer.bedTime));
    drawRow2Col("Sleep Duration", customer.sleepDuration ? `${cleanText(customer.sleepDuration)} hrs` : "--", "College", clean(customer.collegeTime));
    drawRow2Col("Working Time", clean(customer.workTime));
    y += 2;

    drawSectionHeader("HEALTH & NUTRITION");
    drawRow2Col("Medical Conditions", cleanText(customer.medicalConditions), "Allergies", cleanText(customer.allergies));
    drawRow2Col("Supplements", cleanText(customer.supplements), "Remark", sanitizeRemarks(customer.remarks));
    y += 4;

    doc.setLineWidth(0.6);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, W - margin, y);
    y += 5;

    const histTimeW = 18;
    const histFoodW = 52;
    const dietTimeW = 22;
    const suggColW = usableW - histTimeW - histFoodW - dietTimeW;

    if (y + 15 > 275) { doc.addPage(); y = 12; }

    doc.setFillColor(0, 0, 0);
    doc.rect(margin, y, usableW, 7, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.text("Time", margin + 1, y + 5);
    doc.text("Foods Items / History", margin + histTimeW + 1, y + 5);
    doc.text("Time", margin + histTimeW + histFoodW + 1, y + 5);
    doc.text("Suggestion", margin + histTimeW + histFoodW + dietTimeW + 1, y + 5);
    y += 7;

    doc.setTextColor(0, 0, 0); doc.setFontSize(7.5); doc.setDrawColor(0, 0, 0);

    let historyLines = (customer.foodHistory || "").split("\n").filter(l => l.trim() && !l.startsWith("[") && !l.startsWith("{"));
    if (historyLines.length === 0 && meals.length > 0) {
      historyLines = meals.map((m, idx) => `Meal #${idx + 1}: ${m.meal || "Meal"} (${m.time || ""}) - ${m.suggestion || ""}`);
    }

    const dietRows = meals.filter(m => m.meal || m.suggestion);
    const maxRows = Math.max(historyLines.length, dietRows.length, 1);

    const parseHistoryLine = (line: string): { time: string; food: string } => {
      // Format 1: "Meal #1: Early Morning (7:00 AM) - warm water"
      const mealFmt = line.match(/^Meal\s*#\d+:\s*([^(]+)\s*\(([^)]+)\)\s*[-:]\s*(.*)/i);
      if (mealFmt) {
        return { time: mealFmt[2].trim(), food: `${mealFmt[1].trim()}: ${mealFmt[3].trim()}` };
      }
      // Format 2: "7am - Early Morning: warm water" or "7:30am: warm water"
      const timeFmt = line.match(/^\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2})\s*[-:]\s*(.*)/i);
      if (timeFmt) {
        return { time: timeFmt[1].trim(), food: timeFmt[2].trim() };
      }
      // Format 3: "Early Morning (7:00 AM) - warm water"
      const labelTimeFmt = line.match(/^\s*([^(]+)\s*\(([^)]+)\)\s*[-:]\s*(.*)/i);
      if (labelTimeFmt) {
        return { time: labelTimeFmt[2].trim(), food: `${labelTimeFmt[1].trim()}: ${labelTimeFmt[3].trim()}` };
      }
      return { time: "", food: line.trim() };
    };

    let altRow = false;
    for (let i = 0; i < maxRows; i++) {
      const histLine = historyLines[i] || "";
      const { time: histTime, food: histFood } = parseHistoryLine(histLine);

      const dietRow = dietRows[i];
      const dietMeal = (dietRow?.meal || "") + (dietRow?.time ? " (" + dietRow.time + ")" : "");
      const dietSugg = dietRow?.suggestion || "";

      const histFoodSafe = histFood || " ";
      const dietSuggSafe = dietSugg || " ";

      const histFoodLines = doc.splitTextToSize(histFoodSafe, histFoodW - 3) as string[];
      const dietMealLines = doc.splitTextToSize(dietMeal || " ", dietTimeW - 2) as string[];
      const suggLines = doc.splitTextToSize(dietSuggSafe, suggColW - 3) as string[];
      const rowH = Math.max(7, Math.max(histFoodLines.length, dietMealLines.length, suggLines.length) * 5 + 2);

      if (y + rowH > 278) { doc.addPage(); y = 12; }

      if (altRow) { doc.setFillColor(245, 245, 245); doc.rect(margin, y, usableW, rowH, "F"); }
      altRow = !altRow;

      doc.setLineWidth(0.2);
      doc.rect(margin, y, histTimeW, rowH);
      doc.rect(margin + histTimeW, y, histFoodW, rowH);
      doc.rect(margin + histTimeW + histFoodW, y, dietTimeW, rowH);
      doc.rect(margin + histTimeW + histFoodW + dietTimeW, y, suggColW, rowH);

      doc.setFont("helvetica", "normal");
      if (histTime) doc.text(histTime, margin + 1, y + 5);
      histFoodLines.forEach((line, li) => doc.text(line, margin + histTimeW + 1, y + 5 + li * 5));
      doc.setFont("helvetica", "bold");
      dietMealLines.forEach((line, li) => doc.text(line, margin + histTimeW + histFoodW + 1, y + 5 + li * 5));
      doc.setFont("helvetica", "normal");
      suggLines.forEach((line, li) => doc.text(line, margin + histTimeW + histFoodW + dietTimeW + 1, y + 5 + li * 5));
      y += rowH;
    }

    const hasExtra = EXTRA_FIELDS.some(f => extras[f.key]);
    if (hasExtra) {
      const extraColW = 45;
      if (y + 15 > 278) { doc.addPage(); y = 15; }
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, y, usableW, 6, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text("Additional", margin + 2, y + 4.5);
      doc.text("Suggestion", margin + extraColW + 2, y + 4.5);
      y += 6;
      doc.setTextColor(0, 0, 0); doc.setFontSize(8); altRow = false;
      EXTRA_FIELDS.filter(f => extras[f.key]).forEach((f) => {
        const lines = doc.splitTextToSize(extras[f.key], usableW - extraColW - 4) as string[];
        const rowH = Math.max(7, lines.length * 5 + 3);
        if (y + rowH > 278) { doc.addPage(); y = 15; }
        if (altRow) { doc.setFillColor(245, 245, 245); doc.rect(margin, y, usableW, rowH, "F"); }
        altRow = !altRow;
        doc.setLineWidth(0.2);
        doc.rect(margin, y, extraColW, rowH);
        doc.rect(margin + extraColW, y, usableW - extraColW, rowH);
        doc.setFont("helvetica", "bold"); doc.text(f.label, margin + 2, y + 5);
        doc.setFont("helvetica", "normal");
        lines.forEach((line, i) => doc.text(line, margin + extraColW + 2, y + 5 + i * 5));
        y += rowH;
      });
    }

    // --- PRE-WRITTEN REMARKS & GUIDELINES SECTION AT THE VERY BOTTOM ---
    const defaultRemarks = [
      "1. Avoid eating oily foods.",
      "2. Avoid street food, junk food, and salty snacks or chaat.",
      "3. Do not consume spicy food.",
      "4. Avoid consuming stale food, water, or other beverages taken directly from the refrigerator.",
      "5. Avoid ice cream and unnecessary dairy products.",
      "6. Completely avoid sugary foods, such as sweets and tea.",
      "7. Completely avoid consuming tea; instead, make it a habit to drink a cup of warm water if needed."
    ];

    if (y + 45 > 278) {
      doc.addPage();
      y = 15;
    } else {
      y += 5;
    }

    doc.setFillColor(0, 0, 0);
    doc.rect(margin, y, usableW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Remarks & Guidelines", margin + 2, y + 4.5);
    y += 9;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");

    defaultRemarks.forEach((lineText) => {
      const splitLines = doc.splitTextToSize(lineText, usableW - 4) as string[];
      const lineH = splitLines.length * 4.2;
      if (y + lineH > 278) {
        doc.addPage();
        y = 15;
      }
      splitLines.forEach((l) => {
        doc.text(l, margin + 2, y);
        y += 4.2;
      });
    });

    doc.save("Diet_Sheet_" + customer.name.replace(/\s+/g, "_") + ".pdf");
    setTimeout(() => {
      const phone = String(customer.phone).replace(/\D/g, "");
      const waPhone = phone.startsWith("91") ? phone : "91" + phone;
      const msg = encodeURIComponent("Hello " + customer.name + ",\n\nYour personalized diet plan has been prepared. Please find the attached PDF.\n\nThank you,\nMuscle Empire Nutrition Team");
      window.open("https://wa.me/" + waPhone + "?text=" + msg, "_blank");
    }, 1200);
  };

  const sendWhatsApp = () => {
    if (!customer) return;
    const mealText = meals.filter(m => m.meal || m.suggestion)
      .map(m => "*" + (m.meal || "Meal") + (m.time ? " (" + m.time + ")" : "") + ":*\n" + (m.suggestion || "")).join("\n\n");
    const extraText = EXTRA_FIELDS.filter(f => extras[f.key])
      .map(f => "*" + f.label + ":*\n" + extras[f.key]).join("\n\n");
    const msg = "Hello " + customer.name + ",\n\nYour personalized diet plan:\n\n" + mealText +
      (extraText ? "\n\n" + extraText : "") + "\n\nThank you,\nMuscle Empire Nutrition Team";
    const phone = String(customer.phone).replace(/\D/g, "");
    const waPhone = phone.startsWith("91") ? phone : "91" + phone;
    window.open("https://wa.me/" + waPhone + "?text=" + encodeURIComponent(msg), "_blank");
    try { navigator.clipboard.writeText(msg); } catch {}
  };

  if (!customer) {
    return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white/40">Loading assessment...</div>;
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#0d1117] text-white">
        <div className="bg-[#161b22] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => navigate("/sagarkharat/dashboard")}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="flex items-center gap-4">
            <span className={"px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border " + (
              customer.status === "Completed" ? "bg-green-400/15 text-green-400 border-green-400/30" :
              customer.status === "In Progress" ? "bg-blue-400/15 text-blue-400 border-blue-400/30" :
              "bg-yellow-400/15 text-yellow-400 border-yellow-400/30"
            )}>{customer.status || "New"}</span>
            <button onClick={() => { logout(); navigate("/sagarkharat"); }}
              className="flex items-center gap-1.5 text-red-400/60 hover:text-red-400 text-xs transition-colors">
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-black text-white mb-1">{customer.name}</h1>
            <p className="text-white/40 text-sm mb-8">{customer.phone} &middot; Submitted {formatDate(customer.date)}</p>
          </motion.div>

          <Section title="Personal Information">
            <InfoRow label="Full Name" value={customer.name} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Age" value={customer.age} />
            <InfoRow label="Gender" value={customer.gender} />
          </Section>

          <Section title="Body Measurements">
            <InfoRow label="Weight" value={customer.weight ? customer.weight + " kg" : "--"} />
            <InfoRow label="Height" value={customer.height ? customer.height + " cm" : "--"} />
            <InfoRow label="BMI" value={customer.bmi} />
            <InfoRow label="BMI Category" value={customer.bmiCategory} />
            <InfoRow label="Body Fat (Est.)" value={getBodyFatStr(customer.bmi, customer.age, customer.gender)} />
          </Section>

          <Section title="Lifestyle">
            <InfoRow label="Duty Type" value={customer.duty || "--"} />
            <InfoRow label="Rest Time" value={customer.restTime || "--"} />
            <InfoRow label="Workout Time" value={customer.workoutTime} />
            <InfoRow label="Food Preference" value={customer.foodPref} />
            <InfoRow label="College Timing" value={customer.collegeTime} />
            <InfoRow label="Work Timing" value={customer.workTime} />
          </Section>

          <Section title="Health and Goals">
            <InfoRow label="Goals" value={customer.goals} />
            <InfoRow label="Medical Conditions" value={customer.medicalConditions} />
            <InfoRow label="Allergies" value={customer.allergies} />
            <InfoRow label="Supplements" value={customer.supplements} />
            <InfoRow label="Remarks" value={customer.remarks} />
          </Section>

          {/* Food History — always show */}
          <Section title="Food Items / History (Last 7 Days)">
            {customer.foodHistory && !customer.foodHistory.startsWith("[") ? (
              <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{customer.foodHistory}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No food history submitted.</p>
            )}
          </Section>

          {/* Diet Plan Editor */}
          <div className="bg-[#161b22] border border-green-400/20 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <h3 className="text-green-400 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Diet Plan <span className="text-white/40 font-normal text-xs normal-case ml-2">(Auto-saved ✓)</span>
              </h3>
              <button onClick={addMeal}
                className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-400/30 text-green-400 font-black text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-colors">
                <Plus size={14} /> Add Meal
              </button>
            </div>

            {/* Customer food history reference */}
            {customer.foodHistory && !customer.foodHistory.startsWith("[") && (
              <div className="mb-5 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-4">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-2">Customer Food History (Last 7 Days) — Reference</p>
                <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">{customer.foodHistory}</pre>
              </div>
            )}

            {meals.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">
                Click "+ Add Meal" to add meal entries to the diet plan.
              </div>
            )}

            <div className="space-y-3">
              {meals.map((entry, idx) => (
                <div key={entry.id} className="bg-[#0d1117] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Meal {idx + 1}</span>
                    <button onClick={() => removeMeal(entry.id)}
                      className="text-red-400/50 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">Meal Name</label>
                      <input type="text" placeholder="e.g. Breakfast"
                        value={entry.meal}
                        onChange={e => updateMeal(entry.id, "meal", e.target.value)}
                        className="w-full bg-[#161b22] border border-white/10 focus:border-green-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">Time</label>
                      <input type="text" placeholder="e.g. 8:00 AM"
                        value={entry.time}
                        onChange={e => updateMeal(entry.id, "time", e.target.value)}
                        className="w-full bg-[#161b22] border border-white/10 focus:border-green-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">Food Suggestion</label>
                      <textarea rows={2} placeholder="Enter food details..."
                        value={entry.suggestion}
                        onChange={e => updateMeal(entry.id, "suggestion", e.target.value)}
                        className="w-full bg-[#161b22] border border-white/10 focus:border-green-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg resize-none transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra fields */}
          <div className="bg-[#161b22] border border-blue-400/20 rounded-xl p-5 mb-6">
            <h3 className="text-blue-400 font-black uppercase tracking-widest text-sm mb-5 pb-3 border-b border-white/10">
              Pre/Post Workout, Supplements &amp; Notes
            </h3>
            <div className="space-y-4">
              {EXTRA_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-black uppercase tracking-widest text-blue-400 mb-2">{f.label}</label>
                  <textarea rows={2} placeholder={"Enter " + f.label.toLowerCase() + " suggestion..."}
                    value={extras[f.key] || ""}
                    onChange={e => setExtras(ex => ({ ...ex, [f.key]: e.target.value }))}
                    className="w-full bg-[#0d1117] border border-white/10 focus:border-blue-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg resize-none transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions (Auto-saved, no manual Save Draft button) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={sendPDF}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-black uppercase tracking-wider py-3.5 rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/20">
              <Download size={14} />
              Send PDF
            </button>
            <button onClick={sendWhatsApp}
              className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black uppercase tracking-wider py-3.5 rounded-xl text-xs transition-colors shadow-lg shadow-green-500/20">
              <MessageCircle size={14} />
              Send WhatsApp
            </button>
            <button onClick={handleMarkComplete} disabled={customer.status === "Completed"}
              className={"flex items-center justify-center gap-2 font-black uppercase tracking-wider py-3.5 rounded-xl text-xs transition-colors " + (
                customer.status === "Completed"
                  ? "bg-green-500/20 text-green-400 border border-green-400/30 cursor-default"
                  : "bg-white/10 hover:bg-green-500 hover:text-black text-white"
              )}>
              <CheckCircle2 size={14} />
              {customer.status === "Completed" ? "Completed" : "Mark Complete"}
            </button>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
