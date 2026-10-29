"use client";

import * as React from "react";
import {
  CalendarDays,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  CalendarStudentDirectoryItem,
  StudentMonthlyCalendarData,
} from "@/actions/calendar";
import { StudentMonthlyCalendar } from "@/components/attendance/student-monthly-calendar";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarPageClientProps {
  classrooms: string[];
  students: CalendarStudentDirectoryItem[];
  initialStudentCode: string;
  initialCalendarData: StudentMonthlyCalendarData | null;
}

export function CalendarPageClient({
  classrooms,
  students,
  initialStudentCode,
  initialCalendarData,
}: CalendarPageClientProps) {
  const [selectedClassroom, setSelectedClassroom] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedStudentCode, setSelectedStudentCode] = React.useState<string>(
    initialStudentCode || students[0]?.studentId || ""
  );

  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => {
      const matchRoom =
        selectedClassroom === "ALL" || s.classroom === selectedClassroom;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        s.studentId.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q);
      return matchRoom && matchQuery;
    });
  }, [students, selectedClassroom, searchQuery]);

  const currentIdx = React.useMemo(
    () =>
      filteredStudents.findIndex((s) => s.studentId === selectedStudentCode),
    [filteredStudents, selectedStudentCode]
  );

  const handlePrevStudent = () => {
    if (filteredStudents.length === 0) return;
    const prevIdx =
      currentIdx > 0 ? currentIdx - 1 : filteredStudents.length - 1;
    setSelectedStudentCode(filteredStudents[prevIdx].studentId);
  };

  const handleNextStudent = () => {
    if (filteredStudents.length === 0) return;
    const nextIdx =
      currentIdx >= 0 && currentIdx < filteredStudents.length - 1
        ? currentIdx + 1
        : 0;
    setSelectedStudentCode(filteredStudents[nextIdx].studentId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              ปฏิทินการเข้าแถวรายบุคคล (Monthly Calendar)
            </h1>
            <Badge variant="info" className="text-xs">
              ดูรายเดือนเข้าใจง่าย
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            ตรวจสอบวันมาเรียน พักโควตา วันขาด และผลสรุปเกณฑ์รายสัปดาห์ของนักเรียนแต่ละคนตลอดทั้งเดือน
          </p>
        </div>

        {/* Quick Prev / Next Student Switcher */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevStudent}
            disabled={filteredStudents.length <= 1}
            className="gap-1 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>คนก่อนหน้า</span>
          </Button>
          <span className="text-xs font-medium text-muted-foreground px-1">
            {currentIdx >= 0
              ? `${currentIdx + 1} / ${filteredStudents.length}`
              : `${filteredStudents.length} คน`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextStudent}
            disabled={filteredStudents.length <= 1}
            className="gap-1 rounded-xl"
          >
            <span>คนถัดไป</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Student Picker */}
        <Card className="lg:col-span-3 border-border/70">
          <CardContent className="p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>เลือกนักเรียน ({filteredStudents.length} คน)</span>
            </div>

            {/* Classroom Pills */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedClassroom("ALL")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer border",
                  selectedClassroom === "ALL"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                )}
              >
                ทุกห้อง
              </button>
              {classrooms.map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => setSelectedClassroom(room)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer border",
                    selectedClassroom === room
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  {room}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัส / ชื่อนักเรียน..."
                className="h-8 pl-8 text-xs rounded-xl"
              />
            </div>

            {/* Scrollable Student List */}
            <div className="max-h-[220px] lg:max-h-[520px] overflow-y-auto space-y-1 pr-1">
              {filteredStudents.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  ไม่พบรายชื่อนักเรียน
                </p>
              ) : (
                filteredStudents.map((st) => {
                  const isActive = st.studentId === selectedStudentCode;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStudentCode(st.studentId)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-all cursor-pointer border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "bg-card hover:bg-muted/60 border-transparent text-foreground"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "font-mono text-[11px] font-bold",
                              isActive
                                ? "text-primary-foreground"
                                : "text-primary"
                            )}
                          >
                            {st.studentId}
                          </span>
                          <span className="truncate">{st.fullName}</span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px]",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {st.classroom}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Right Area: Monthly Calendar */}
        <div className="lg:col-span-9">
          {selectedStudentCode ? (
            <StudentMonthlyCalendar
              studentIdOrCode={selectedStudentCode}
              initialData={
                initialCalendarData?.student.studentId === selectedStudentCode
                  ? initialCalendarData
                  : null
              }
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">กรุณาเลือกนักเรียนจากรายการด้านซ้ายเพื่อดูปฏิทินรายเดือน</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
