import React, { useState } from "react";
import { Card, Row, Col, Badge, Table, Form, Button } from "react-bootstrap";
import {
  LuBuilding2,
  LuUsers,
  LuShieldCheck,
  LuWallet,
  LuChevronDown,
  LuChevronRight,
  LuSearch,
  LuLayers,
  LuUser
} from "react-icons/lu";

const GRADE_PILLS = {
  L1: "bg-slate-100 text-slate-700 border-slate-300",
  L2: "bg-blue-50 text-blue-700 border-blue-300",
  L3: "bg-cyan-50 text-cyan-700 border-cyan-300",
  L4: "bg-emerald-50 text-emerald-700 border-emerald-300",
  L5: "bg-teal-50 text-teal-700 border-teal-300",
  L6: "bg-indigo-50 text-indigo-700 border-indigo-300",
  L7: "bg-violet-50 text-violet-700 border-violet-300",
  L8: "bg-purple-50 text-purple-700 border-purple-300",
  L9: "bg-pink-50 text-pink-700 border-pink-300",
  L10: "bg-rose-50 text-rose-700 border-rose-300",
  L11: "bg-amber-100 text-amber-900 border-amber-400",
};

const formatCurrency = (val) => {
  if (!val) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
};

const DepartmentHierarchyView = ({ departments = [], onSelectEmployee }) => {
  const [selectedDeptId, setSelectedDeptId] = useState("ALL");
  const [memberSearch, setMemberSearch] = useState("");
  const [expandedDepts, setExpandedDepts] = useState({});

  const toggleDeptExpand = (id) => {
    setExpandedDepts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredDepartments = departments.filter((d) => {
    if (selectedDeptId !== "ALL" && String(d.id) !== String(selectedDeptId)) {
      return false;
    }
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      const matchDept = d.dept_name.toLowerCase().includes(q) || d.dept_code.toLowerCase().includes(q);
      const matchEmp = d.employees?.some(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employee_id.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q)
      );
      return matchDept || matchEmp;
    }
    return true;
  });

  return (
    <div className="department-hierarchy-view">
      {/* Top Filter Bar */}
      <div className="bg-white p-3 rounded-3 border border-slate-200 mb-4 shadow-2xs d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: "450px" }}>
          <div className="position-relative w-100">
            <LuSearch className="position-absolute top-50 start-0 translate-middle-y ms-2.5 text-slate-400" size={15} />
            <Form.Control
              type="text"
              size="sm"
              placeholder="Search department or employee..."
              className="ps-4 text-xs"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Department:</span>
          <Form.Select
            size="sm"
            className="text-xs"
            style={{ width: "220px" }}
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
          >
            <option value="ALL">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.dept_name} ({d.total_headcount})
              </option>
            ))}
          </Form.Select>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="d-flex flex-column gap-3.5">
        {filteredDepartments.map((dept) => {
          const isExpanded = expandedDepts[dept.id] !== false; // default open
          return (
            <Card key={dept.id} className="border border-slate-200 shadow-2xs overflow-hidden">
              {/* Department Header */}
              <Card.Header
                className="bg-slate-50/70 border-bottom border-slate-200 py-3 px-3.5 d-flex align-items-center justify-content-between cursor-pointer hover:bg-slate-100/60 transition-colors"
                onClick={() => toggleDeptExpand(dept.id)}
              >
                <div className="d-flex align-items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-2 border border-blue-200">
                    <LuBuilding2 size={18} />
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h6 className="mb-0 fw-bold text-slate-900" style={{ fontSize: "15px" }}>
                        {dept.dept_name}
                      </h6>
                      <span className="badge bg-slate-200 text-slate-700 border text-3xs font-mono">
                        {dept.dept_code}
                      </span>
                      {dept.is_active ? (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500 border text-3xs">Inactive</span>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-3xs text-slate-500 mb-0 mt-0.5">{dept.description}</p>
                    )}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="text-end d-none d-md-block">
                    <span className="d-block text-2xs text-slate-400 text-uppercase font-semibold tracking-wider">
                      Staff Count
                    </span>
                    <strong className="text-slate-800 fs-6">{dept.total_headcount} Members</strong>
                  </div>

                  <Button
                    variant="light"
                    size="sm"
                    className="border p-1 text-slate-600 rounded-circle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDeptExpand(dept.id);
                    }}
                  >
                    {isExpanded ? <LuChevronDown size={15} /> : <LuChevronRight size={15} />}
                  </Button>
                </div>
              </Card.Header>

              {/* Collapsible Content */}
              {isExpanded && (
                <Card.Body className="p-3.5">
                  <Row className="g-3 mb-3">
                    {/* HOD Card */}
                    <Col md={5} lg={4}>
                      <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-200 rounded-3 p-3 h-100">
                        <span className="d-flex align-items-center gap-1.5 text-3xs fw-bold uppercase tracking-wider text-purple-800 mb-2">
                          <LuShieldCheck size={13} className="text-purple-600" /> Department Head (HOD)
                        </span>

                        {dept.hod ? (
                          <div className="d-flex align-items-center gap-2.5">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-xs flex-shrink-0"
                              style={{
                                width: "42px",
                                height: "42px",
                                background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                                fontSize: "14px",
                              }}
                            >
                              {dept.hod.name?.slice(0, 2).toUpperCase() || "HD"}
                            </div>
                            <div className="overflow-hidden">
                              <h6 className="mb-0 fw-bold text-slate-900 text-truncate" style={{ fontSize: "13.5px" }}>
                                {dept.hod.name}
                              </h6>
                              <div className="text-3xs text-purple-700 fw-semibold text-truncate mt-0.5">
                                {dept.hod.designation || "Head of Department"}
                              </div>
                              <span className="badge bg-purple-100 text-purple-800 border border-purple-200 text-3xs font-mono mt-1">
                                {dept.hod.employee_id}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-xs py-2 fst-italic">
                            No HOD currently assigned
                          </div>
                        )}
                      </div>
                    </Col>

                    {/* Department KPI Stats */}
                    <Col md={7} lg={8}>
                      <div className="bg-slate-50/60 border border-slate-200 rounded-3 p-3 h-100 d-flex flex-column justify-content-between">
                        <span className="text-3xs fw-bold uppercase tracking-wider text-slate-500 mb-2">
                          Talent & Rank Distribution
                        </span>

                        <div className="d-flex flex-wrap gap-2">
                          <div className="bg-white border rounded-2 px-2.5 py-1 text-center shadow-2xs">
                            <span className="text-3xs text-slate-400 d-block">Executive (L11)</span>
                            <strong className="text-amber-700 fs-6">
                              {dept.rank_breakdown?.executive || 0}
                            </strong>
                          </div>
                          <div className="bg-white border rounded-2 px-2.5 py-1 text-center shadow-2xs">
                            <span className="text-3xs text-slate-400 d-block">Sr. Leadership (L8-L10)</span>
                            <strong className="text-purple-700 fs-6">
                              {dept.rank_breakdown?.senior_leadership || 0}
                            </strong>
                          </div>
                          <div className="bg-white border rounded-2 px-2.5 py-1 text-center shadow-2xs">
                            <span className="text-3xs text-slate-400 d-block">Management (L4-L7)</span>
                            <strong className="text-indigo-700 fs-6">
                              {dept.rank_breakdown?.management || 0}
                            </strong>
                          </div>
                          <div className="bg-white border rounded-2 px-2.5 py-1 text-center shadow-2xs">
                            <span className="text-3xs text-slate-400 d-block">Core Staff (L1-L3)</span>
                            <strong className="text-blue-700 fs-6">
                              {dept.rank_breakdown?.staff || 0}
                            </strong>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-top border-slate-200/80 d-flex align-items-center justify-content-between text-xs text-slate-600">
                          <span>
                            Monthly Payroll Budget: <strong>{formatCurrency(dept.total_payroll)}</strong>
                          </span>
                          <span>
                            Avg Member CTC: <strong>{formatCurrency(dept.avg_salary)}/mo</strong>
                          </span>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {/* Department Member Roster */}
                  <div className="border border-slate-200 rounded-2 overflow-hidden">
                    <Table hover responsive className="mb-0 text-xs align-middle">
                      <thead className="table-light text-2xs text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th>Employee</th>
                          <th>Rank / Level</th>
                          <th>Designation</th>
                          <th>Reports To</th>
                          <th>Employment Type</th>
                          <th>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dept.employees && dept.employees.length > 0 ? (
                          dept.employees.map((emp) => (
                            <tr
                              key={emp.employee_id}
                              className="cursor-pointer hover:bg-blue-50/40"
                              onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                            >
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      fontSize: "11px",
                                      background: emp.rank_level >= 10 ? "#b45309" : "#2563eb",
                                    }}
                                  >
                                    {emp.name?.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="fw-bold text-slate-900">{emp.name}</div>
                                    <span className="text-3xs text-slate-400 font-mono">
                                      {emp.employee_id}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`badge border text-3xs font-semibold ${
                                    GRADE_PILLS[emp.grade_code] || "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {emp.grade_code}
                                </span>
                              </td>
                              <td className="text-slate-800 fw-medium">{emp.designation}</td>
                              <td className="text-slate-600">
                                {emp.reporting_manager_id ? (
                                  <span className="badge bg-slate-100 text-slate-700 border font-mono">
                                    {emp.reporting_manager_id}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 fst-italic">Top Executive</span>
                                )}
                              </td>
                              <td>
                                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {emp.employment_type}
                                </span>
                              </td>
                              <td className="text-slate-500">{emp.work_location}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-400 py-3">
                              No employees assigned to this department yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DepartmentHierarchyView;

