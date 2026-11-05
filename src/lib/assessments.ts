import { supabase } from "@/lib/supabase";

export type AssessmentData = {
  id?: string;
  _rowIndex?: number;
  date: string; name: string; phone: string; email: string;
  age: string; gender: string; weight: string; height: string;
  bmi: string; bmiCategory: string; wakeTime: string; bedTime: string;
  sleepDuration: string; workoutTime: string; targetWeight: string;
  weightChange: string; foodPref: string; duty?: string; restTime?: string;
  collegeTime: string; workTime: string;
  medicalConditions: string; allergies: string; supplements: string;
  goals: string; remarks: string; status: string;
  foodHistory?: string;
  earlyMorning?: string; breakfast?: string; midMorning?: string;
  lunch?: string; eveningSnack?: string; preWorkout?: string;
  postWorkout?: string; dinner?: string; beforeBed?: string;
  supplementsPlan?: string; notes?: string;
};

export function normalizeAssessment(row: AssessmentData): AssessmentData {
  if (!row || typeof row !== "object") return row;
  const norm = { ...row };

  norm.name = String(norm.name || "").trim();
  norm.phone = String(norm.phone || "").trim();
  norm.email = String(norm.email || "").trim();
  norm.date = String(norm.date || "").trim();

  let fp = String(norm.foodPref || "").trim();
  if (/^veg(etarian)?$/i.test(fp)) fp = "Vegetarian";
  else if (/^non-?veg(etarian)?$/i.test(fp)) fp = "Non-Vegetarian";
  else if (/^egg(etarian)?$/i.test(fp)) fp = "Eggitarian";
  norm.foodPref = fp || "Vegetarian";

  let st = String(norm.status || "").trim();
  if (/^completed$/i.test(st)) st = "Completed";
  else if (/^in\s*progress$/i.test(st)) st = "In Progress";
  else if (!st || /^new$/i.test(st)) st = "New";
  norm.status = st;

  return norm;
}

function mapRowToAssessment(row: any, i: number): AssessmentData {
  return normalizeAssessment({
    id: String(row.id || `assess_${Date.now()}_${i}`),
    _rowIndex: i,
    date: row.date || new Date().toLocaleDateString("en-IN"),
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    age: row.age || "",
    gender: row.gender || "",
    weight: row.weight || "",
    height: row.height || "",
    bmi: row.bmi || "",
    bmiCategory: row.bmi_category || "",
    wakeTime: row.wake_time || "",
    bedTime: row.bed_time || "",
    sleepDuration: row.sleep_duration || "",
    workoutTime: row.workout_time || "",
    targetWeight: row.target_weight || "",
    weightChange: row.weight_change || "",
    foodPref: row.food_pref || "Vegetarian",
    duty: row.duty || "",
    restTime: row.rest_time || "",
    collegeTime: row.college_time || "",
    workTime: row.work_time || "",
    medicalConditions: row.medical_conditions || "None",
    allergies: row.allergies || "None",
    supplements: row.supplements || "None",
    goals: row.goals || "Fitness",
    remarks: row.remarks || "",
    status: row.status || "New",
    foodHistory: row.food_history || "",
    earlyMorning: row.early_morning || "",
    breakfast: row.breakfast || "",
    midMorning: row.mid_morning || "",
    lunch: row.lunch || "",
    eveningSnack: row.evening_snack || "",
    preWorkout: row.pre_workout || "",
    postWorkout: row.post_workout || "",
    dinner: row.dinner || "",
    beforeBed: row.before_bed || "",
    supplementsPlan: row.supplements_plan || "",
    notes: row.notes || "",
  });
}

function mapAssessmentToRow(data: AssessmentData): any {
  return {
    id: data.id || `assess_${Date.now()}`,
    date: data.date || new Date().toLocaleDateString("en-IN"),
    name: data.name || "",
    phone: data.phone || "",
    email: data.email || "",
    age: data.age || "",
    gender: data.gender || "",
    weight: data.weight || "",
    height: data.height || "",
    bmi: data.bmi || "",
    bmi_category: data.bmiCategory || "",
    wake_time: data.wakeTime || "",
    bed_time: data.bedTime || "",
    sleep_duration: data.sleepDuration || "",
    workout_time: data.workoutTime || "",
    target_weight: data.targetWeight || "",
    weight_change: data.weightChange || "",
    food_pref: data.foodPref || "Vegetarian",
    duty: data.duty || "",
    rest_time: data.restTime || "",
    college_time: data.collegeTime || "",
    work_time: data.workTime || "",
    medical_conditions: data.medicalConditions || "None",
    allergies: data.allergies || "None",
    supplements: data.supplements || "None",
    goals: data.goals || "Fitness",
    remarks: data.remarks || "",
    status: data.status || "New",
    food_history: data.foodHistory || "",
    early_morning: data.earlyMorning || "",
    breakfast: data.breakfast || "",
    mid_morning: data.midMorning || "",
    lunch: data.lunch || "",
    evening_snack: data.eveningSnack || "",
    pre_workout: data.preWorkout || "",
    post_workout: data.postWorkout || "",
    dinner: data.dinner || "",
    before_bed: data.beforeBed || "",
    supplements_plan: data.supplementsPlan || "",
    notes: data.notes || "",
  };
}

function mapUpdatesToRow(updates: Partial<AssessmentData>): any {
  const row: any = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.email !== undefined) row.email = updates.email;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.remarks !== undefined) row.remarks = updates.remarks;
  if (updates.goals !== undefined) row.goals = updates.goals;
  if (updates.foodPref !== undefined) row.food_pref = updates.foodPref;
  if (updates.targetWeight !== undefined) row.target_weight = updates.targetWeight;
  if (updates.earlyMorning !== undefined) row.early_morning = updates.earlyMorning;
  if (updates.breakfast !== undefined) row.breakfast = updates.breakfast;
  if (updates.midMorning !== undefined) row.mid_morning = updates.midMorning;
  if (updates.lunch !== undefined) row.lunch = updates.lunch;
  if (updates.eveningSnack !== undefined) row.evening_snack = updates.eveningSnack;
  if (updates.preWorkout !== undefined) row.pre_workout = updates.preWorkout;
  if (updates.postWorkout !== undefined) row.post_workout = updates.postWorkout;
  if (updates.dinner !== undefined) row.dinner = updates.dinner;
  if (updates.beforeBed !== undefined) row.before_bed = updates.beforeBed;
  if (updates.supplementsPlan !== undefined) row.supplements_plan = updates.supplementsPlan;
  if (updates.notes !== undefined) row.notes = updates.notes;
  return row;
}

const LOCAL_KEY = "me_assessments";

function getLocal(): AssessmentData[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(normalizeAssessment) : [];
  } catch {
    return [];
  }
}

function saveLocal(data: AssessmentData[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {}
}

export async function submitAssessment(data: AssessmentData): Promise<void> {
  const id = data.id || `assess_${Date.now()}`;
  const payload = { ...data, id };
  const row = mapAssessmentToRow(payload);

  const existing = getLocal();
  existing.unshift(normalizeAssessment({ ...payload, _rowIndex: 0 }));
  existing.forEach((item, i) => { item._rowIndex = i; });
  saveLocal(existing);

  try {
    const { error } = await supabase.from("assessments").insert([row]);
    if (error) console.error("Supabase submitAssessment error:", error);
  } catch (err) {
    console.error("Failed to submit assessment to Supabase:", err);
  }
}

export async function fetchSubmissions(forceRefresh = false): Promise<AssessmentData[]> {
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const items = data.map((r, i) => mapRowToAssessment(r, i));
      saveLocal(items);
      return items;
    }
  } catch (err) {
    console.warn("Supabase fetchSubmissions fallback:", err);
  }
  return getLocal();
}

export async function fetchFresh(): Promise<AssessmentData[]> {
  return fetchSubmissions(true);
}

export async function updateRecord(rowIndex: number, updates: Partial<AssessmentData>): Promise<void> {
  const existing = getLocal();
  const target = existing.find((e) => (e._rowIndex ?? existing.indexOf(e)) === rowIndex);
  if (target) {
    Object.assign(target, updates);
    saveLocal(existing);

    try {
      const rowUpdates = mapUpdatesToRow(updates);
      if (target.id) {
        await supabase.from("assessments").update(rowUpdates).eq("id", target.id);
      }
    } catch (err) {
      console.error("Failed to update assessment in Supabase:", err);
    }
  }
}

export async function deleteRecord(rowIndex: number): Promise<void> {
  const existing = getLocal();
  const targetIdx = existing.findIndex((e) => (e._rowIndex ?? existing.indexOf(e)) === rowIndex);
  if (targetIdx >= 0) {
    const [deleted] = existing.splice(targetIdx, 1);
    existing.forEach((item, i) => { item._rowIndex = i; });
    saveLocal(existing);

    try {
      if (deleted?.id) {
        await supabase.from("assessments").delete().eq("id", deleted.id);
      }
    } catch (err) {
      console.error("Failed to delete assessment from Supabase:", err);
    }
  }
}

// Supabase Realtime Listener for live CRM updates
if (typeof window !== "undefined") {
  supabase
    .channel("public:assessments")
    .on("postgres_changes", { event: "*", schema: "public", table: "assessments" }, () => {
      fetchSubmissions(true).catch(() => {});
      window.dispatchEvent(new CustomEvent("assessmentsUpdated"));
    })
    .subscribe();
}
