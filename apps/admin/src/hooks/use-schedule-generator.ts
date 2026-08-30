import { useList } from "./use-refine-list";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataProvider, type HttpError } from "@refinedev/core";
import { useAppNotification } from "./use-app-notification";
const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
];

const SLOTS = Array.from({ length: 8 }, (_, index) => index + 1);

export type GeneratorFilters = {
  termId?: string;
  classId?: string;
  classIds?: string[];
  activeClassId?: string;
};

export type ScheduleSlot = {
  id: string;
  classId: string;
  dayOfWeek: number;
  slot: number;
  teacherId: string | null;
  subjectId: string | null;
  status: "EMPTY" | "PREFERENCE" | "COMPROMISE" | "CONFLICT";
  locked?: boolean;
};

export type ScheduleSlotProposal = {
  classId?: string;
  dayOfWeek: number;
  timeSlot: number;
  subjectId: string;
  teacherId: string;
  room?: string | null;
};

export type TeacherPreference = {
  id: string;
  teacherId: string;
  preferredDays?: number[];
  blockedDays?: number[];
  preferredSlots?: number[];
  maxDailySessions?: number;
  maxLoadPerDay?: number;
  maxLoadPerWeek?: number;
  unavailable?: Array<{
    dayOfWeek?: string | number;
    day_of_week?: string;
    timeRange?: string;
    time_range?: string;
  }>;
  availabilityLevel?: "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
};

export type TeacherCard = {
  id: string;
  name: string;
  subjectNames: string[];
  availabilityLevel: TeacherPreference["availabilityLevel"];
  preferredSummary: string;
  assignedCount: number;
  totalSessions: number;
  color: "success" | "warning" | "error";
};

export type DaySchedule = {
  value: number;
  label: string;
  slots: Array<ScheduleSlot & { key: string }>;
};

export type FairnessEntry = {
  teacherId: string;
  teacherName: string;
  daysCount: number;
  sessionCount: number;
  availabilityLevel: TeacherPreference["availabilityLevel"];
};

export type ProposalConflict = {
  type: string;
  message: string;
  slot?: ScheduleSlotProposal;
  meta?: Record<string, any>;
};

export type ScheduleImprovementStats = {
  iterations: number;
  gapPenalty: number;
  loadPenalty: number;
};

export type GenerateSummary = {
  preferenceMatches: number;
  compromise: number;
  conflicts: number;
  empty: number;
  confidence: number;
  score?: number;
  proposalId?: string;
  backendConflicts?: ProposalConflict[];
  backendStats?: ScheduleImprovementStats;
};

const buildSlotKey = (day: number, slot: number, classId?: string) =>
  classId ? `${classId}-${day}-${slot}` : `${day}-${slot}`;

const slotKeyToParts = (key: string) => {
  const parts = key.split("-");
  if (parts.length === 3) {
    const [classId, day, slot] = parts;
    return { classId, dayOfWeek: Number(day), slot: Number(slot) };
  }
  const [day, slot] = parts.map((value) => Number(value));
  return { dayOfWeek: day, slot };
};

const formatPreferredSummary = (preference?: TeacherPreference) => {
  if (!preference) {
    return "Tidak ada preferensi khusus";
  }

  const summaries: string[] = [];

  const maxDay = preference.maxLoadPerDay ?? preference.maxDailySessions;
  if (maxDay) {
    summaries.push(`Maks ${maxDay} sesi/hari`);
  }

  if (preference.maxLoadPerWeek) {
    summaries.push(`Maks ${preference.maxLoadPerWeek} sesi/minggu`);
  }

  if (Array.isArray(preference.unavailable) && preference.unavailable.length > 0) {
    const blockedDays = preference.unavailable
      .map((u) => {
        const d = u.dayOfWeek ?? u.day_of_week;
        return typeof d === "number" ? DAYS.find((item) => item.value === d)?.label : String(d);
      })
      .filter(Boolean);
    const uniqueDays = Array.from(new Set(blockedDays));
    if (uniqueDays.length > 0) {
      summaries.push(`Tidak bisa: ${uniqueDays.join(", ")}`);
    }
  }

  if (Array.isArray(preference.preferredDays) && preference.preferredDays.length > 0) {
    const days = preference.preferredDays
      .map((day) => DAYS.find((item) => item.value === day)?.label ?? `Hari ${day}`)
      .join(", ");
    summaries.push(`Hari: ${days}`);
  }

  if (Array.isArray(preference.preferredSlots) && preference.preferredSlots.length > 0) {
    const slots = preference.preferredSlots.map((slot) => `Jam ${slot}`).join(", ");
    summaries.push(`Slot: ${slots}`);
  }

  if (summaries.length === 0) {
    return preference.notes || "Tidak ada preferensi khusus";
  }

  return summaries.join(" · ");
};

const AVAILABILITY_COLORS: Record<
  NonNullable<TeacherPreference["availabilityLevel"]>,
  TeacherCard["color"]
> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "error",
};

export const useScheduleGenerator = (filters: GeneratorFilters) => {
  // `useDataProvider` returns a *getter*, not the provider itself. Calling
  // `.update`/`.create`/`.custom` straight off it throws at runtime, so resolve
  // the default provider once here.
  const getDataProvider = useDataProvider();
  const dataProvider = useMemo(() => getDataProvider(), [getDataProvider]);
  // `custom` is optional on the DataProvider interface. Ours implements it, but
  // resolve it once with an explicit failure so a provider swap surfaces here
  // rather than as a confusing "not a function" deep inside a callback.
  const customRequest = useMemo(() => {
    const custom = dataProvider.custom;
    if (!custom) {
      return undefined;
    }
    return custom.bind(dataProvider);
  }, [dataProvider]);
  const { open: notify } = useAppNotification();

  const termsQuery = useList<{
    id: string;
    name: string;
    semester?: number;
    year?: string;
    isActive?: boolean;
    active?: boolean;
  }>({
    resource: "terms",
    pagination: { current: 1, pageSize: 50 },
    sorters: [{ field: "startDate", order: "asc" }],
  });

  const teachersQuery = useList<{ id: string; fullName: string; expertise?: string; nip?: string }>(
    {
      resource: "teachers",
      pagination: { current: 1, pageSize: 200 },
    }
  );

  const subjectsQuery = useList<{ id: string; name: string; code?: string }>({
    resource: "subjects",
    pagination: { current: 1, pageSize: 200 },
  });

  const classesQuery = useList<{ id: string; name: string; termId?: string }>({
    resource: "classes",
    pagination: { current: 1, pageSize: 200 },
  });

  const classSubjectsQuery = useList<{
    id: string;
    classroomId?: string;
    classId?: string;
    subjectId: string;
    teacherId: string;
    subjectName?: string;
    subjectCode?: string;
    className?: string;
  }>({
    resource: "class-subjects",
    pagination: { current: 1, pageSize: 500 },
  });

  const preferencesQuery = useList<TeacherPreference>({
    resource: "teacher-preferences",
    pagination: { current: 1, pageSize: 200 },
  });

  const targetClassId =
    filters.activeClassId || filters.classId || (filters.classIds && filters.classIds[0]);
  const hasRequiredParams = Boolean(filters.termId && targetClassId);

  const semesterScheduleQuery = useList<ScheduleSlot>({
    resource: "semester-schedule",
    pagination: { current: 1, pageSize: 5000 },
    filters: hasRequiredParams
      ? [
          { field: "termId", operator: "eq", value: filters.termId },
          { field: "classId", operator: "eq", value: targetClassId },
        ]
      : undefined,
    queryOptions: {
      enabled: hasRequiredParams,
    },
  });

  const teacherPreferences = useMemo(
    () => preferencesQuery.data?.data ?? [],
    [preferencesQuery.data?.data]
  );

  const teachers = useMemo(() => teachersQuery.data?.data ?? [], [teachersQuery.data?.data]);
  const subjects = useMemo(() => subjectsQuery.data?.data ?? [], [subjectsQuery.data?.data]);
  const classSubjects = useMemo(
    () => classSubjectsQuery.data?.data ?? [],
    [classSubjectsQuery.data?.data]
  );
  const semesterSlots = useMemo(
    () => semesterScheduleQuery.data?.data ?? [],
    [semesterScheduleQuery.data?.data]
  );

  const teacherPreferenceMap = useMemo(() => {
    const map = new Map<string, TeacherPreference>();
    teacherPreferences.forEach((pref) => map.set(pref.teacherId, pref));
    return map;
  }, [teacherPreferences]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject) => map.set(subject.id, subject.name));
    return map;
  }, [subjects]);

  const targetClassIds = useMemo(() => {
    if (filters.classIds && filters.classIds.length > 0) {
      return filters.classIds;
    }
    return filters.classId ? [filters.classId] : [];
  }, [filters.classId, filters.classIds]);

  const activeClassId = useMemo(() => {
    if (filters.activeClassId) {
      return filters.activeClassId;
    }
    if (filters.classId) {
      return filters.classId;
    }
    if (filters.classIds && filters.classIds.length > 0) {
      return filters.classIds[0];
    }
    return "";
  }, [filters.activeClassId, filters.classId, filters.classIds]);

  const classSubjectByTeacher = useMemo(() => {
    const targetSet = new Set(targetClassIds);
    const map = new Map<
      string,
      { subjectId: string; classSubjectId: string; classId: string; subjectName?: string }[]
    >();
    classSubjects
      .filter((mapping) => {
        const cId = mapping.classId || mapping.classroomId;
        if (targetSet.size === 0) return true;
        return cId ? targetSet.has(cId) : false;
      })
      .forEach((mapping) => {
        if (!mapping.teacherId) return;
        const cId = mapping.classId || mapping.classroomId || "";
        const list = map.get(mapping.teacherId) ?? [];
        list.push({
          subjectId: mapping.subjectId,
          classSubjectId: mapping.id,
          classId: cId,
          subjectName: mapping.subjectName,
        });
        map.set(mapping.teacherId, list);
      });
    return map;
  }, [classSubjects, targetClassIds]);

  const [slotState, setSlotState] = useState<Record<string, ScheduleSlot>>({});
  const [hoveredTeacherId, setHoveredTeacherId] = useState<string | null>(null);
  const [generateSummary, setGenerateSummary] = useState<GenerateSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastProposalId, setLastProposalId] = useState<string | null>(null);

  const initialiseSlots = useCallback((slots: ScheduleSlot[]) => {
    const map: Record<string, ScheduleSlot> = {};
    slots.forEach((slot) => {
      const key = buildSlotKey(slot.dayOfWeek, slot.slot, slot.classId);
      map[key] = { ...slot };
    });
    setSlotState(map);
  }, []);

  useEffect(() => {
    if (targetClassIds.length === 0) {
      setSlotState({});
      return;
    }
    const matchingSlots = semesterSlots.filter((slot) => targetClassIds.includes(slot.classId));
    if (matchingSlots.length > 0) {
      initialiseSlots(matchingSlots);
    } else {
      setSlotState({});
    }
  }, [targetClassIds, initialiseSlots, semesterSlots]);

  const evaluateSlots = useCallback(
    (currentSlots: Record<string, ScheduleSlot>) => {
      const teacherDailyLoad = new Map<string, Record<number, number>>();

      Object.values(currentSlots).forEach((slot) => {
        if (!slot.teacherId || slot.status === "EMPTY") {
          return;
        }
        const load = teacherDailyLoad.get(slot.teacherId) ?? {};
        load[slot.dayOfWeek] = (load[slot.dayOfWeek] ?? 0) + 1;
        teacherDailyLoad.set(slot.teacherId, load);
      });

      const evaluated: Record<string, ScheduleSlot> = {};

      Object.entries(currentSlots).forEach(([key, slot]) => {
        if (!slot.teacherId || !slot.subjectId) {
          evaluated[key] = { ...slot, status: "EMPTY" };
          return;
        }
        const preference = teacherPreferenceMap.get(slot.teacherId);
        const preferredDay = preference?.preferredDays
          ? preference.preferredDays.includes(slot.dayOfWeek)
          : true;
        const preferredSlot = preference?.preferredSlots
          ? preference.preferredSlots.includes(slot.slot)
          : true;
        const blocked = preference?.blockedDays
          ? preference.blockedDays.includes(slot.dayOfWeek)
          : false;
        const dailyLoad = teacherDailyLoad.get(slot.teacherId);
        const maxSessions = preference?.maxDailySessions || preference?.maxLoadPerDay || 8;
        const overload = dailyLoad ? (dailyLoad[slot.dayOfWeek] ?? 0) > maxSessions : false;

        let status: ScheduleSlot["status"] = "PREFERENCE";
        if (blocked || overload) {
          status = "CONFLICT";
        } else if (!(preferredDay && preferredSlot)) {
          status = "COMPROMISE";
        }

        evaluated[key] = { ...slot, status };
      });

      return evaluated;
    },
    [teacherPreferenceMap]
  );

  const teacherCards = useMemo<TeacherCard[]>(() => {
    return teachers.map((teacher) => {
      const preference = teacherPreferenceMap.get(teacher.id);
      const assignments = Object.values(slotState).filter((slot) => slot.teacherId === teacher.id);

      let subjectNames = (classSubjectByTeacher.get(teacher.id) ?? [])
        .map((item) => item.subjectName || subjectMap.get(item.subjectId) || "Mapel")
        .filter((value, index, self) => self.indexOf(value) === index);

      if (subjectNames.length === 0) {
        const allTeacherSubjects = classSubjects
          .filter((cs) => cs.teacherId === teacher.id)
          .map((cs) => cs.subjectName || subjectMap.get(cs.subjectId) || "")
          .filter(Boolean);
        subjectNames = Array.from(new Set(allTeacherSubjects));
      }

      if (subjectNames.length === 0 && teacher.expertise) {
        subjectNames = [teacher.expertise];
      }

      return {
        id: teacher.id,
        name: teacher.fullName,
        subjectNames,
        availabilityLevel: preference?.availabilityLevel ?? "HIGH",
        preferredSummary: formatPreferredSummary(preference),
        assignedCount: assignments.length,
        totalSessions: classSubjectByTeacher.get(teacher.id)?.length ?? 0,
        color: AVAILABILITY_COLORS[preference?.availabilityLevel ?? "HIGH"],
      };
    });
  }, [classSubjectByTeacher, classSubjects, slotState, subjectMap, teacherPreferenceMap, teachers]);

  const daySchedules = useMemo<DaySchedule[]>(() => {
    const evaluated = evaluateSlots(slotState);
    return DAYS.map((day) => {
      const slots = SLOTS.map((slot) => {
        const classKey = buildSlotKey(day.value, slot, activeClassId);
        const fallbackKey = buildSlotKey(day.value, slot);
        const assignment = evaluated[classKey] || evaluated[fallbackKey];
        const key = classKey;
        if (assignment) {
          return { ...assignment, key };
        }
        return {
          id: `slot_${activeClassId}_${day.value}_${slot}`,
          classId: activeClassId,
          dayOfWeek: day.value,
          slot,
          teacherId: null,
          subjectId: null,
          status: "EMPTY" as const,
          locked: false,
          key,
        };
      });
      return { value: day.value, label: day.label, slots };
    });
  }, [evaluateSlots, activeClassId, slotState]);

  const fairnessSummary = useMemo<FairnessEntry[]>(() => {
    const uniqueDaysByTeacher = new Map<string, Set<number>>();
    const sessionCount = new Map<string, number>();

    Object.values(slotState).forEach((slot) => {
      if (!slot.teacherId || slot.status === "EMPTY") {
        return;
      }
      const daysSet = uniqueDaysByTeacher.get(slot.teacherId) ?? new Set<number>();
      daysSet.add(slot.dayOfWeek);
      uniqueDaysByTeacher.set(slot.teacherId, daysSet);
      sessionCount.set(slot.teacherId, (sessionCount.get(slot.teacherId) ?? 0) + 1);
    });

    return teacherCards.map((card) => {
      const days = uniqueDaysByTeacher.get(card.id)?.size ?? 0;
      const sessions = sessionCount.get(card.id) ?? 0;
      return {
        teacherId: card.id,
        teacherName: card.name,
        daysCount: days,
        sessionCount: sessions,
        availabilityLevel: card.availabilityLevel,
      };
    });
  }, [slotState, teacherCards]);

  const crossClassConflicts = useMemo(() => {
    const teacherTimeMap = new Map<string, string[]>();
    const conflicts: { teacherId: string; dayOfWeek: number; slot: number; classIds: string[] }[] =
      [];

    Object.values(slotState).forEach((s) => {
      if (!s.teacherId || s.status === "EMPTY") return;
      const key = `${s.teacherId}-${s.dayOfWeek}-${s.slot}`;
      const list = teacherTimeMap.get(key) ?? [];
      list.push(s.classId);
      teacherTimeMap.set(key, list);
    });

    teacherTimeMap.forEach((cIds, key) => {
      if (cIds.length > 1) {
        const [teacherId, dayStr, slotStr] = key.split("-");
        conflicts.push({
          teacherId,
          dayOfWeek: Number(dayStr),
          slot: Number(slotStr),
          classIds: cIds,
        });
      }
    });

    return conflicts;
  }, [slotState]);

  const assignTeacherToSlot = useCallback(
    (teacherId: string, slotKey: string) => {
      const { classId, dayOfWeek, slot } = slotKeyToParts(slotKey);
      const targetClass = classId || activeClassId;
      const teacherMappings = classSubjectByTeacher.get(teacherId);
      const mapping =
        teacherMappings?.find((m) => m.classId === targetClass) ||
        classSubjects.find(
          (cs) =>
            cs.teacherId === teacherId &&
            (cs.classId === targetClass || cs.classroomId === targetClass)
        ) ||
        teacherMappings?.[0];

      setSlotState((prev) => {
        const next = { ...prev };
        const existing = next[slotKey] ?? {
          id: `slot_${targetClass}_${dayOfWeek}_${slot}`,
          classId: targetClass,
          dayOfWeek,
          slot,
          teacherId: null,
          subjectId: null,
          status: "EMPTY" as const,
        };
        next[slotKey] = {
          ...existing,
          teacherId,
          subjectId: mapping?.subjectId ?? null,
        };
        return evaluateSlots(next);
      });
    },
    [activeClassId, classSubjectByTeacher, classSubjects, evaluateSlots]
  );

  const clearSlot = useCallback(
    (slotKey: string) => {
      setSlotState((prev) => {
        if (!prev[slotKey]) {
          return prev;
        }
        const next = { ...prev };
        next[slotKey] = {
          ...next[slotKey],
          teacherId: null,
          subjectId: null,
          status: "EMPTY",
          locked: false,
        };
        return evaluateSlots(next);
      });
    },
    [evaluateSlots]
  );

  const toggleLock = useCallback((slotKey: string) => {
    setSlotState((prev) => {
      const next = { ...prev };
      if (!next[slotKey]) {
        return prev;
      }
      next[slotKey] = { ...next[slotKey], locked: !next[slotKey].locked };
      return next;
    });
  }, []);

  const generateSchedule = useCallback(async () => {
    if (targetClassIds.length === 0) {
      notify?.({
        type: "warning",
        message: "Pilih kelas terlebih dahulu",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const isMultiClass = targetClassIds.length > 1;
      const days = [1, 2, 3, 4, 5];
      const timeSlotsPerDay = 6;
      const totalSlotsPerClass = days.length * timeSlotsPerDay; // 30 slots

      const subjectLoads: Array<{
        classId?: string;
        subjectId: string;
        teacherId: string;
        weeklyCount: number;
      }> = [];

      targetClassIds.forEach((cId) => {
        const classMappings = classSubjects.filter((m) => (m.classId || m.classroomId) === cId);
        if (classMappings.length === 0) return;

        const countPerSubject = Math.floor(totalSlotsPerClass / classMappings.length);
        let remainder = totalSlotsPerClass % classMappings.length;

        classMappings.forEach((m) => {
          const load = countPerSubject + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;

          subjectLoads.push({
            classId: cId,
            subjectId: m.subjectId,
            teacherId: m.teacherId,
            weeklyCount: Math.max(1, load),
          });
        });
      });

      if (subjectLoads.length === 0) {
        notify?.({
          type: "warning",
          message: "Data mapel kelas belum tersedia",
          description: "Tambahkan pembagian mapel (class-subjects) terlebih dahulu.",
        });
        setIsGenerating(false);
        return;
      }

      const payload: any = {
        termId: filters.termId,
        timeSlotsPerDay,
        days,
        subjectLoads,
        hardConstraints: [],
        softConstraints: [],
      };

      if (isMultiClass) {
        payload.classIds = targetClassIds;
      } else {
        payload.classId = targetClassIds[0];
      }

      const response = await customRequest?.<{
        mode: string;
        proposal: {
          proposalId: string;
          score: number;
          slots: ScheduleSlotProposal[];
          conflicts: ProposalConflict[];
          stats: ScheduleImprovementStats;
        };
      }>({
        url: "/schedules/generator",
        method: "post",
        payload,
      });
      const proposal = response?.data?.proposal;
      if (proposal && Array.isArray(proposal.slots) && proposal.slots.length > 0) {
        const slots: ScheduleSlot[] = proposal.slots.map((p: any) => {
          const slotClassId = p.classId || (targetClassIds.length === 1 ? targetClassIds[0] : "");
          return {
            id: `slot_${slotClassId}_${p.dayOfWeek}_${p.timeSlot}`,
            classId: slotClassId,
            dayOfWeek: p.dayOfWeek,
            slot: p.timeSlot,
            teacherId: p.teacherId,
            subjectId: p.subjectId,
            status: "PREFERENCE" as const,
            locked: false,
          };
        });
        initialiseSlots(slots);
      }
      setGenerateSummary({
        preferenceMatches: proposal?.slots?.length ?? 0,
        compromise: 0,
        conflicts: proposal?.conflicts?.length ?? 0,
        empty: 0,
        confidence: proposal?.score ? proposal.score * 100 : 0,
        score: proposal?.score,
        proposalId: proposal?.proposalId,
        backendConflicts: proposal?.conflicts,
        backendStats: proposal?.stats,
      });
      if (proposal?.proposalId) {
        setLastProposalId(proposal.proposalId);
      }
      if (proposal) {
        notify?.({
          type: "success",
          message: "Jadwal otomatis dibuat",
          description: `Skor ${proposal.score.toFixed(2)} · ${proposal.conflicts?.length ?? 0} konflik`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat jadwal";
      notify?.({ type: "error", message });
    } finally {
      setIsGenerating(false);
    }
  }, [customRequest, targetClassIds, filters.termId, initialiseSlots, notify, classSubjects]);

  const saveSchedule = useCallback(async () => {
    if (targetClassIds.length === 0) {
      notify?.({
        type: "warning",
        message: "Pilih kelas terlebih dahulu",
      });
      return;
    }
    if (!lastProposalId) {
      notify?.({
        type: "warning",
        message: "Belum ada proposal jadwal yang dihasilkan",
      });
      return;
    }
    setIsSaving(true);
    try {
      await customRequest?.({
        url: "/schedule/save",
        method: "post",
        payload: {
          proposalId: lastProposalId,
          commitToDaily: true,
        },
      });
      notify?.({ type: "success", message: "Jadwal berhasil disimpan" });
    } catch (error) {
      const message = (error as HttpError)?.message ?? "Gagal menyimpan jadwal";
      notify?.({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  }, [customRequest, targetClassIds, notify, lastProposalId]);

  const terms = useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data?.data]);

  const isLoading =
    termsQuery.isLoading ||
    teachersQuery.isLoading ||
    subjectsQuery.isLoading ||
    classesQuery.isLoading ||
    classSubjectsQuery.isLoading ||
    preferencesQuery.isLoading ||
    semesterScheduleQuery.isLoading;

  const isFetching =
    termsQuery.isFetching ||
    teachersQuery.isFetching ||
    subjectsQuery.isFetching ||
    classesQuery.isFetching ||
    classSubjectsQuery.isFetching ||
    preferencesQuery.isFetching ||
    semesterScheduleQuery.isFetching;

  return {
    isLoading,
    isFetching,
    isGenerating,
    isSaving,
    terms,
    classes: classesQuery.data?.data ?? [],
    subjects,
    teachers: teacherCards,
    preferences: teacherPreferences,
    daySchedules,
    hoveredTeacherId,
    setHoveredTeacherId,
    assignTeacherToSlot,
    clearSlot,
    toggleLock,
    generateSchedule,
    saveSchedule,
    fairnessSummary,
    generateSummary,
    lastProposalId,
    crossClassConflicts,
    targetClassIds,
    activeClassId,
  };
};
