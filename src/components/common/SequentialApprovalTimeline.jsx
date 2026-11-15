import React from "react";
import {
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCircleAlert,
  LuFastForward,
  LuArrowRight,
  LuUser,
  LuShieldCheck,
  LuCornerDownRight,
} from "react-icons/lu";

/**
 * SequentialApprovalTimeline
 * Visual multi-level stepper & audit trail component
 * (e.g., Employee ➔ Reporting Manager ➔ HOD ➔ HR)
 */
export default function SequentialApprovalTimeline({
  steps = [],
  currentLevel = 1,
  overallStatus = "PENDING",
  applicantName = "Employee",
  submittedAt = null,
  compact = false,
  orientation = "horizontal", // "horizontal" | "vertical"
}) {
  // Sort steps ascending by level order
  const sortedSteps = [...steps].sort((a, b) => a.level_order - b.level_order);

  // Status badge & color resolver
  const getStepVisuals = (step) => {
    switch (step.status) {
      case "APPROVED":
        return {
          icon: <LuCircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          circleBg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700",
          badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          lineColor: "bg-emerald-500",
          label: "Approved",
        };
      case "REJECTED":
        return {
          icon: <LuCircleX className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
          circleBg: "bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-700",
          badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
          lineColor: "bg-rose-500",
          label: "Rejected",
        };
      case "PENDING":
        return {
          icon: <LuClock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin-slow" />,
          circleBg: "bg-blue-100 dark:bg-blue-950/60 border-blue-500 text-blue-700 ring-4 ring-blue-100 dark:ring-blue-950/40",
          badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
          lineColor: "bg-slate-200 dark:bg-slate-700",
          label: "In Review",
        };
      case "SKIPPED":
        return {
          icon: <LuFastForward className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          circleBg: "bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-700",
          badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          lineColor: "bg-emerald-400",
          label: "Auto-Skipped",
        };
      case "CHANGES_REQUESTED":
        return {
          icon: <LuCircleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          circleBg: "bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-700",
          badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          lineColor: "bg-amber-400",
          label: "Changes Needed",
        };
      default: // "WAITING"
        return {
          icon: <span className="text-xs font-bold text-slate-400">{step.level_order}</span>,
          circleBg: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400",
          badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
          lineColor: "bg-slate-200 dark:bg-slate-700",
          label: "Queued",
        };
    }
  };

  // Helper date format
  const formatDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!sortedSteps || sortedSteps.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-2 italic text-center">
        No sequential approval workflow initialized for this request.
      </div>
    );
  }

  // VERTICAL LAYOUT (for mobile or compact detail drawers)
  if (orientation === "vertical") {
    return (
      <div className="space-y-4 relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 ml-3 py-2">
        {/* Applicant node */}
        <div className="relative">
          <div className="absolute -left-[31px] top-0 h-6 w-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold shadow-xs">
            <LuUser className="h-3 w-3" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {applicantName} (Applicant)
            </span>
            <div className="text-[11px] text-slate-400">
              Submitted: {formatDate(submittedAt) || "Recorded"}
            </div>
          </div>
        </div>

        {/* Sequential Steps */}
        {sortedSteps.map((step) => {
          const visual = getStepVisuals(step);
          return (
            <div key={step.id || step.level_order} className="relative pt-2">
              <div
                className={`absolute -left-[31px] top-2 h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-xs ${visual.circleBg}`}
              >
                {visual.icon}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    L{step.level_order}: {step.level_name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${visual.badgeBg}`}
                  >
                    {visual.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <span>Assigned to:</span>
                  <strong className="text-slate-700 dark:text-slate-300">
                    {step.acted_by_name || step.assigned_to_name || step.approver_role || "Department Authority"}
                  </strong>
                </div>
                {step.action_date && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Action Taken: {formatDate(step.action_date)}
                  </div>
                )}
                {step.comments && (
                  <div className="mt-1.5 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 italic flex items-start gap-1">
                    <LuCornerDownRight className="h-3 w-3 mt-0.5 text-slate-400 flex-shrink-0" />
                    <span>"{step.comments}"</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // HORIZONTAL STEPPER LAYOUT (Desktop standard)
  return (
    <div className="w-full py-2">
      <div className="flex items-start justify-between relative overflow-x-auto pb-2 scrollbar-none">
        {/* Step 0: Applicant Submitter */}
        <div className="flex flex-col items-center flex-1 min-w-[120px] text-center relative px-2">
          <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shadow-md z-10">
            <LuUser className="h-4 w-4" />
          </div>
          <div className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
            {applicantName}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Applicant
          </span>
          {submittedAt && (
            <span className="text-[9px] text-slate-400 mt-0.5">
              {formatDate(submittedAt)}
            </span>
          )}
        </div>

        {/* Sequential Steps with Connectors */}
        {sortedSteps.map((step, idx) => {
          const visual = getStepVisuals(step);
          const isPending = step.status === "PENDING";
          const isDone = step.status === "APPROVED";

          return (
            <React.Fragment key={step.id || step.level_order}>
              {/* Connector line between nodes */}
              <div className="flex-1 flex items-center justify-center pt-4 -mx-2">
                <div
                  className={`h-0.5 w-full transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-500"
                      : isPending
                      ? "bg-gradient-to-r from-emerald-500 to-blue-500 animate-pulse"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              </div>

              {/* Step Node */}
              <div className="flex flex-col items-center flex-1 min-w-[130px] text-center relative px-2">
                <div
                  className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md z-10 ${visual.circleBg}`}
                >
                  {visual.icon}
                </div>

                <div className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[130px]" title={step.level_name}>
                  L{step.level_order}: {step.level_name}
                </div>

                <span
                  className={`mt-1 px-2 py-0.2 rounded-full text-[10px] font-bold border ${visual.badgeBg}`}
                >
                  {visual.label}
                </span>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-[120px] truncate" title={step.acted_by_name || step.assigned_to_name || step.approver_role}>
                  {step.acted_by_name || step.assigned_to_name || step.approver_role || "Authority"}
                </div>

                {step.action_date && (
                  <span className="text-[9px] text-slate-400 mt-0.5">
                    {formatDate(step.action_date)}
                  </span>
                )}

                {step.comments && !compact && (
                  <div
                    className="mt-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] text-slate-600 dark:text-slate-300 italic max-w-[130px] line-clamp-2"
                    title={step.comments}
                  >
                    "{step.comments}"
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
