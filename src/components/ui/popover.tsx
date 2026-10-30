"use client";

import * as React from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

const Popover = BasePopover.Root;
const PopoverTrigger = BasePopover.Trigger;

function PopoverContent({
  className,
  sideOffset = 8,
  align = "start",
  side = "bottom",
  collisionAvoidance = { side: "shift", align: "none" },
  children,
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> & {
  sideOffset?: number;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  collisionAvoidance?: React.ComponentProps<typeof BasePopover.Positioner>["collisionAvoidance"];
}) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        collisionAvoidance={collisionAvoidance}
        className="z-50"
      >
        <BasePopover.Popup
          className={cn(
            "z-50 rounded-3xl border border-border/80 bg-popover p-2 text-popover-foreground shadow-2xl outline-none transition-all duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
