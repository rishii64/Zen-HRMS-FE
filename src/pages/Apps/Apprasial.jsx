import React from "react";
import { Container } from "react-bootstrap";
import { LuAward, LuSparkles } from "react-icons/lu";
import ProbationAppraisalReviews from "./ProbationAppraisalReviews";

export default function AppraisalPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-6 space-y-4">
      <Container fluid className="px-0">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm mb-4 d-flex flex-wrap justify-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 d-flex align-items-center justify-center font-bold">
                <LuAward size={18} />
              </span>
              <h4 className="text-xl font-bold text-slate-800 m-0">
                Performance Appraisals & 6-Month Probation Reviews
              </h4>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Multi-tier evaluation lifecycle: <strong>Employee Self-Rating → Team Lead (if avail) → Reporting Manager → HOD Approval → HR Final Sign-Off</strong>
            </p>
          </div>
        </div>

        {/* Core Review Component */}
        <ProbationAppraisalReviews />
      </Container>
    </div>
  );
}