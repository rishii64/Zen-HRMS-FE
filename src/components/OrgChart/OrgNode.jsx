import React, { useState } from "react";
import { Badge, Button } from "react-bootstrap";
import {
  LuUsers,
  LuChevronDown,
  LuChevronRight,
  LuEye,
  LuUserCheck,
  LuBuilding2,
  LuShieldCheck,
  LuSparkles
} from "react-icons/lu";

// Grade badge color mappings for 11-Tier Rank Ladder
const GRADE_COLORS = {
  L1: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  L2: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  L3: { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  L4: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  L5: { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  L6: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  L7: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  L8: { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  L9: { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  L10: { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  L11: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
};

const getInitials = (name) => {
  if (!name) return "EM";
  const clean = name.replace(/^(mr\.|ms\.|mrs\.|dr\.)\s+/i, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
};

const OrgNode = ({
  node,
  searchTerm = "",
  filterDept = "All",
  onSelectNode,
  onReassignManager,
  canManage = false,
  depth = 1,
  collapsedMap = {},
  onToggleCollapse
}) => {
  const isCollapsed = !!collapsedMap[node.employee_id];
  const hasChildren = node.children && node.children.length > 0;

  // Search match check
  const isMatch =
    searchTerm &&
    (node.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.department_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const gradeStyle = GRADE_COLORS[node.grade_code] || {
    bg: "#f8fafc",
    text: "#334155",
    border: "#e2e8f0",
  };

  const isExecutive = node.rank_level >= 11;
  const isSeniorLeader = node.rank_level >= 8 && node.rank_level < 11;

  return (
    <div className="org-tree-branch d-flex flex-column align-items-center">
      {/* Node Card Container */}
      <div
        className={`org-node-card position-relative bg-white rounded-3 shadow-sm transition-all text-start ${
          isMatch ? "ring-4 ring-amber-400 border-amber-500 shadow-md scale-105" : "border"
        } ${isExecutive ? "border-amber-400 bg-gradient-to-b from-amber-50/40 to-white" : isSeniorLeader ? "border-purple-300" : "border-slate-200"}`}
        style={{
          width: "270px",
          padding: "12px 14px",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isMatch
            ? "0 10px 25px -5px rgba(245, 158, 11, 0.3)"
            : "0 2px 8px -2px rgba(15, 23, 42, 0.08)",
        }}
        onClick={() => onSelectNode(node)}
      >
        {/* Top Executive or HOD Ribbon */}
        {isExecutive && (
          <div
            className="position-absolute top-0 end-0 bg-amber-500 text-white px-2 py-0.5 rounded-bottom-start-2 text-3xs font-bold uppercase tracking-wider d-flex align-items-center gap-1"
            style={{ fontSize: "9px" }}
          >
            <LuSparkles size={10} /> C-Level / CXO
          </div>
        )}
        {!isExecutive && node.is_hod && (
          <div
            className="position-absolute top-0 end-0 bg-purple-600 text-white px-2 py-0.5 rounded-bottom-start-2 text-3xs font-bold uppercase tracking-wider d-flex align-items-center gap-1"
            style={{ fontSize: "9px" }}
          >
            <LuShieldCheck size={10} /> Dept Head
          </div>
        )}

        {/* Card Header: Avatar & Names */}
        <div className="d-flex align-items-center gap-2.5 mb-2">
          {node.avatar ? (
            <img
              src={node.avatar}
              alt={node.name}
              className="rounded-circle border"
              style={{
                width: "44px",
                height: "44px",
                objectFit: "cover",
                borderColor: gradeStyle.border,
              }}
            />
          ) : (
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-xs flex-shrink-0"
              style={{
                width: "44px",
                height: "44px",
                fontSize: "15px",
                background: isExecutive
                  ? "linear-gradient(135deg, #d97706, #b45309)"
                  : isSeniorLeader
                  ? "linear-gradient(135deg, #7c3aed, #4c1d95)"
                  : "linear-gradient(135deg, #2563eb, #1e40af)",
              }}
            >
              {getInitials(node.name)}
            </div>
          )}

          <div className="flex-grow-1 overflow-hidden">
            <h6
              className={`mb-0 fw-bold text-truncate ${
                isMatch ? "text-amber-900" : "text-slate-900"
              }`}
              style={{ fontSize: "13.5px" }}
              title={node.name}
            >
              {node.name}
            </h6>
            <div className="d-flex align-items-center gap-1.5 mt-0.5">
              <span className="font-mono text-3xs text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                {node.employee_id}
              </span>
              <span
                className="badge px-1.5 py-0.5 text-3xs fw-semibold border rounded"
                style={{
                  backgroundColor: gradeStyle.bg,
                  color: gradeStyle.text,
                  borderColor: gradeStyle.border,
                  fontSize: "10px",
                }}
              >
                {node.grade_code}
              </span>
            </div>
          </div>
        </div>

        {/* Designation */}
        <div
          className="text-slate-700 fw-semibold text-truncate mb-1.5"
          style={{ fontSize: "11.5px" }}
          title={node.designation}
        >
          {node.designation}
        </div>

        {/* Department & Location */}
        <div className="d-flex align-items-center justify-content-between text-xs text-slate-500 pt-1 border-top border-slate-100">
          <span className="d-inline-flex align-items-center gap-1 text-truncate" style={{ maxWidth: "150px" }}>
            <LuBuilding2 size={11} className="text-slate-400 flex-shrink-0" />
            <span className="text-truncate">{node.department_name}</span>
          </span>
          <span className="text-slate-400 font-medium">
            {node.work_location || "Kolkata"}
          </span>
        </div>

        {/* Card Footer: Reports Count & Expand/Collapse */}
        {hasChildren && (
          <div className="mt-2 pt-1.5 border-top border-slate-100 d-flex align-items-center justify-content-between">
            <span
              className="badge bg-blue-50 text-blue-700 border border-blue-200 text-xs fw-semibold d-inline-flex align-items-center gap-1"
              style={{ fontSize: "10px" }}
            >
              <LuUsers size={11} />
              {node.direct_reports_count} Direct ({node.total_reports_count} Total)
            </span>

            <button
              type="button"
              className="btn btn-xs btn-outline-secondary py-0 px-1.5 d-inline-flex align-items-center gap-1 text-xs rounded-pill"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(node.employee_id);
              }}
              title={isCollapsed ? "Expand Sub-tree" : "Collapse Sub-tree"}
            >
              {isCollapsed ? (
                <>
                  <LuChevronRight size={12} /> Expand
                </>
              ) : (
                <>
                  <LuChevronDown size={12} /> Collapse
                </>
              )}
            </button>
          </div>
        )}

        {/* Quick Manager Reassign Trigger (HR/Admin only) */}
        {canManage && (
          <div className="org-node-hover-actions position-absolute top-1 start-1">
            <button
              type="button"
              className="btn btn-xs btn-light border py-0 px-1 text-xs text-slate-600 d-flex items-center gap-1 rounded opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onReassignManager(node);
              }}
              title="Reassign Reporting Manager"
            >
              <LuUserCheck size={11} /> Reassign
            </button>
          </div>
        )}
      </div>

      {/* Children connector lines and recursive render */}
      {hasChildren && !isCollapsed && (
        <div className="org-children-wrapper position-relative d-flex flex-column align-items-center mt-3 pt-3">
          {/* Vertical connecting line from parent */}
          <div
            className="position-absolute bg-slate-300"
            style={{ width: "2px", height: "16px", top: "-12px", left: "50%", transform: "translateX(-50%)" }}
          />

          {/* Horizontal crossbar linking all child nodes */}
          {node.children.length > 1 && (
            <div
              className="position-absolute bg-slate-300"
              style={{
                height: "2px",
                top: "4px",
                left: "calc(270px / 2 + 16px)",
                right: "calc(270px / 2 + 16px)",
              }}
            />
          )}

          {/* Render Children in Flex Row */}
          <div className="d-flex flex-row justify-content-center gap-4 flex-nowrap">
            {node.children.map((child) => (
              <div key={child.employee_id} className="position-relative d-flex flex-column align-items-center">
                {/* Vertical line into child */}
                <div
                  className="bg-slate-300"
                  style={{ width: "2px", height: "14px", marginBottom: "2px" }}
                />
                <OrgNode
                  node={child}
                  searchTerm={searchTerm}
                  filterDept={filterDept}
                  onSelectNode={onSelectNode}
                  onReassignManager={onReassignManager}
                  canManage={canManage}
                  depth={depth + 1}
                  collapsedMap={collapsedMap}
                  onToggleCollapse={onToggleCollapse}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed Pill Indicator */}
      {hasChildren && isCollapsed && (
        <div className="mt-2">
          <button
            type="button"
            className="btn btn-xs btn-outline-primary rounded-pill py-0.5 px-2.5 text-3xs fw-bold shadow-2xs d-inline-flex align-items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.employee_id);
            }}
          >
            <LuUsers size={11} /> +{node.direct_reports_count} direct reports hidden
          </button>
        </div>
      )}
    </div>
  );
};

export default OrgNode;

