"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { th } from "date-fns/locale";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div className={cn("p-2", className)}>
      <DayPicker
        locale={th}
        showOutsideDays
        className="rdp-custom text-sm"
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
