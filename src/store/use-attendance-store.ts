import { create } from "zustand";
import type { AttendanceStatus } from "@prisma/client";

export type ColorTheme = "ocean" | "emerald" | "violet" | "rose" | "amber" | "teal";
export type BackgroundStyle = "gradient" | "dots" | "solid";

interface AttendanceFilterState {
  selectedClassroom: string;
  selectedDate: Date;
  searchQuery: string;
  statusFilter: AttendanceStatus | "ALL";
  remedialClassroomFilter: string;
  remedialSearchQuery: string;
  selectedStudentIds: string[];
  activeRole: "TEACHER" | "ADMIN";
  colorTheme: ColorTheme;
  bgStyle: BackgroundStyle;
  setSelectedClassroom: (classroom: string) => void;
  setSelectedDate: (date: Date) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: AttendanceStatus | "ALL") => void;
  setRemedialClassroomFilter: (classroom: string) => void;
  setRemedialSearchQuery: (query: string) => void;
  toggleStudentSelection: (studentId: string) => void;
  setSelectedStudentIds: (ids: string[]) => void;
  clearSelection: () => void;
  setActiveRole: (role: "TEACHER" | "ADMIN") => void;
  setColorTheme: (theme: ColorTheme) => void;
  setBgStyle: (style: BackgroundStyle) => void;
}

export const useAttendanceStore = create<AttendanceFilterState>((set) => ({
  selectedClassroom: "ม.4/1",
  selectedDate: new Date(),
  searchQuery: "",
  statusFilter: "ALL",
  remedialClassroomFilter: "ALL",
  remedialSearchQuery: "",
  selectedStudentIds: [],
  activeRole: "ADMIN",
  colorTheme: "ocean",
  bgStyle: "gradient",
  setSelectedClassroom: (classroom) =>
    set({ selectedClassroom: classroom, selectedStudentIds: [] }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setRemedialClassroomFilter: (classroom) =>
    set({ remedialClassroomFilter: classroom }),
  setRemedialSearchQuery: (query) => set({ remedialSearchQuery: query }),
  toggleStudentSelection: (studentId) =>
    set((state) => ({
      selectedStudentIds: state.selectedStudentIds.includes(studentId)
        ? state.selectedStudentIds.filter((id) => id !== studentId)
        : [...state.selectedStudentIds, studentId],
    })),
  setSelectedStudentIds: (ids) => set({ selectedStudentIds: ids }),
  clearSelection: () => set({ selectedStudentIds: [] }),
  setActiveRole: (role) => set({ activeRole: role }),
  setColorTheme: (colorTheme) => set({ colorTheme }),
  setBgStyle: (bgStyle) => set({ bgStyle }),
}));
