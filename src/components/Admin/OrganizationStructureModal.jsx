import React, { useState, useEffect } from "react";
import { Modal, Button, Tabs, Tab, Table, Badge, Form, Row, Col, Spinner, Card } from "react-bootstrap";
import {
  LuNetwork,
  LuLayers,
  LuBriefcase,
  LuPlus,
  LuCheck,
  LuBuilding2,
  LuShieldCheck,
  LuUsers,
  LuCircleDollarSign,
  LuClock,
} from "react-icons/lu";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

const GRADE_BADGE_COLORS = {
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

const OrganizationStructureModal = ({ show, onHide, onStructureUpdated }) => {
  const [activeTab, setActiveTab] = useState("tree");
  const [loading, setLoading] = useState(false);
  const [structure, setStructure] = useState({
    departments: [],
    global_designations: [],
    grades: [],
  });

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("All");

  // Create Department form
  const [deptForm, setDeptForm] = useState({
    dept_code: "",
    dept_name: "",
    description: "",
  });
  const [savingDept, setSavingDept] = useState(false);

  // Create Designation form
  const [desigForm, setDesigForm] = useState({
    title: "",
    department_id: "",
    grade_id: "",
    job_family: "General",
    is_hod_role: false,
    description: "",
  });
  const [savingDesig, setSavingDesig] = useState(false);

  useEffect(() => {
    if (show) {
      fetchStructure();
    }
  }, [show]);

  const fetchStructure = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/organization/structure?_t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setStructure({
          departments: data.departments || [],
          global_designations: data.global_designations || [],
          grades: data.grades || [],
        });
      } else {
        toast.error("Failed to load organization structure");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching organization data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.dept_code || !deptForm.dept_name) {
      toast.error("Please fill in Department Code and Name");
      return;
    }

    setSavingDept(true);
    try {
      const res = await fetch(`${API}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(deptForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Department created successfully!");
        setDeptForm({ dept_code: "", dept_name: "", description: "" });
        fetchStructure();
        if (onStructureUpdated) onStructureUpdated();
      } else {
        toast.error(data.error || "Failed to create department");
      }
    } catch (err) {
      toast.error("Error creating department: " + err.message);
    } finally {
      setSavingDept(false);
    }
  };

  const handleCreateDesignation = async (e) => {
    e.preventDefault();
    if (!desigForm.title || !desigForm.grade_id) {
      toast.error("Please provide Title and select a Job Grade");
      return;
    }

    setSavingDesig(true);
    try {
      const res = await fetch(`${API}/designations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          ...desigForm,
          department_id: desigForm.department_id ? parseInt(desigForm.department_id, 10) : null,
          grade_id: parseInt(desigForm.grade_id, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Designation "${desigForm.title}" created successfully!`);
        setDesigForm({
          title: "",
          department_id: "",
          grade_id: "",
          job_family: "General",
          is_hod_role: false,
          description: "",
        });
        fetchStructure();
        if (onStructureUpdated) onStructureUpdated();
      } else {
        toast.error(data.error || "Failed to create designation");
      }
    } catch (err) {
      toast.error("Error creating designation: " + err.message);
    } finally {
      setSavingDesig(false);
    }
  };

  const filteredDepartments = structure.departments.filter((dept) => {
    if (filterDept !== "All" && String(dept.id) !== filterDept) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchDept = dept.dept_name.toLowerCase().includes(term) || dept.dept_code.toLowerCase().includes(term);
    const matchDesig = (dept.designations || []).some((d) => d.title.toLowerCase().includes(term));
    return matchDept || matchDesig;
  });

  const filteredGlobals = structure.global_designations.filter((d) => {
    if (filterDept !== "All") return false;
    if (!searchTerm) return true;
    return d.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalHeadcount = structure.departments.reduce((acc, d) => acc + (d.headcount || 0), 0);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable className="org-structure-modal">
      <Modal.Header closeButton className="bg-light border-bottom py-3">
        <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
          <LuNetwork className="text-primary" size={20} />
          <span>Organization Hierarchy & Designation Masters</span>
          <Badge bg="primary" className="ms-2 fw-normal" style={{ fontSize: "11px" }}>
            {structure.departments.length} Departments • {structure.grades.length} Grades
          </Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3 bg-slate-50">
        {/* Quick Stats Header */}
        <Row className="g-2 mb-3">
          <Col xs={12} sm={4}>
            <div className="bg-white border rounded-3 p-2.5 d-flex align-items-center gap-3 shadow-xs">
              <div className="rounded-2 p-2 bg-blue-50 text-primary">
                <LuBuilding2 size={22} />
              </div>
              <div>
                <div className="text-muted small" style={{ fontSize: "11px" }}>Total Departments</div>
                <div className="fw-bold fs-6 text-dark">{structure.departments.length} Business Units</div>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={4}>
            <div className="bg-white border rounded-3 p-2.5 d-flex align-items-center gap-3 shadow-xs">
              <div className="rounded-2 p-2 bg-emerald-50 text-emerald-600">
                <LuBriefcase size={22} />
              </div>
              <div>
                <div className="text-muted small" style={{ fontSize: "11px" }}>Total Position Titles</div>
                <div className="fw-bold fs-6 text-dark">
                  {structure.departments.reduce((acc, d) => acc + (d.designations?.length || 0), 0) + structure.global_designations.length} Active Designations
                </div>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={4}>
            <div className="bg-white border rounded-3 p-2.5 d-flex align-items-center gap-3 shadow-xs">
              <div className="rounded-2 p-2 bg-purple-50 text-purple-600">
                <LuLayers size={22} />
              </div>
              <div>
                <div className="text-muted small" style={{ fontSize: "11px" }}>Universal Hierarchy</div>
                <div className="fw-bold fs-6 text-dark">11 Job Grades (L1 – L11 CXO)</div>
              </div>
            </div>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3 bg-white p-1 rounded-3 border"
          style={{ fontSize: "13px" }}
        >
          {/* TAB 1: ORG TREE */}
          <Tab
            eventKey="tree"
            title={
              <span className="d-flex align-items-center gap-1.5 py-1">
                <LuNetwork size={15} /> Department & Designation Tree
              </span>
            }
          >
            {/* Search and Department Filter Toolbar */}
            <div className="bg-white border rounded-3 p-2.5 mb-3 d-flex flex-wrap gap-2 align-items-center justify-content-between">
              <div className="d-flex flex-wrap gap-2 align-items-center flex-grow-1">
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Search department or designation title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ maxWidth: "300px" }}
                />
                <Form.Select
                  size="sm"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{ maxWidth: "220px" }}
                >
                  <option value="All">All Departments ({structure.departments.length})</option>
                  {structure.departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.dept_code} - {d.dept_name}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab("manage")}
                className="d-flex align-items-center gap-1"
                style={{ fontSize: "12px" }}
              >
                <LuPlus size={14} /> Add Role / Dept
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="text-muted small mt-2">Loading hierarchy structure...</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {/* Department Cards */}
                {filteredDepartments.map((dept) => (
                  <Card key={dept.id} className="border shadow-xs rounded-3 overflow-hidden">
                    <Card.Header className="bg-white border-bottom py-2.5 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 font-monospace fw-bold" style={{ fontSize: "11px" }}>
                          {dept.dept_code}
                        </span>
                        <span className="fw-bold text-dark fs-6">{dept.dept_name}</span>
                        {dept.description && (
                          <span className="text-muted small d-none d-md-inline" style={{ fontSize: "11.5px" }}>
                            • {dept.description}
                          </span>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="light" text="dark" className="border px-2 py-1 d-flex items-center">
                          <LuUsers size={12} className="me-1 text-secondary" />
                          {dept.headcount || 0} Employees
                        </Badge>
                        <Badge bg="info" className="px-2 py-1 bg-opacity-10 text-primary border border-info-subtle">
                          {dept.designations?.length || 0} Positions
                        </Badge>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-3 bg-white">
                      {dept.designations && dept.designations.length > 0 ? (
                        <div className="row g-2">
                          {dept.designations.map((desig) => {
                            const gradeCode = desig.grade?.grade_code || "L2";
                            const colorClass = GRADE_BADGE_COLORS[gradeCode] || "bg-light text-dark";

                            return (
                              <div key={desig.id} className="col-12 col-md-6 col-lg-4">
                                <div className="border rounded-2 p-2.5 bg-slate-50 d-flex flex-column justify-content-between h-100 transition-all hover:bg-slate-100">
                                  <div className="d-flex align-items-start justify-content-between gap-2 mb-1.5">
                                    <span className="fw-semibold text-dark small" style={{ fontSize: "12.5px" }}>
                                      {desig.title}
                                    </span>
                                    {desig.is_hod_role && (
                                      <Badge bg="danger" className="text-uppercase" style={{ fontSize: "9px" }}>
                                        HOD
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 pt-1.5 border-top border-slate-200" style={{ fontSize: "11px" }}>
                                    <span className={`badge border px-1.5 py-0.5 ${colorClass}`}>
                                      {gradeCode} • Rank {desig.grade?.rank_level || 2}
                                    </span>
                                    <span className="text-muted" style={{ fontSize: "10.5px" }}>
                                      ₹{(parseFloat(desig.grade?.min_salary || 0) / 100000).toFixed(1)}L - ₹{(parseFloat(desig.grade?.max_salary || 0) / 100000).toFixed(1)}L
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-muted small py-2 text-center fst-italic">
                          No specific designations created for this department yet. (Global leadership titles apply).
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))}

                {/* Global / Cross-Department Designations */}
                {filteredGlobals.length > 0 && (
                  <Card className="border border-purple-200 shadow-xs rounded-3 overflow-hidden bg-purple-50/20">
                    <Card.Header className="bg-purple-50/60 border-bottom border-purple-200 py-2.5 px-3 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-purple-100 text-purple-800 border border-purple-300 px-2 py-1 font-monospace fw-bold" style={{ fontSize: "11px" }}>
                          GLOBAL
                        </span>
                        <span className="fw-bold text-dark fs-6">Global & Executive Roles (Cross-Department)</span>
                      </div>
                      <Badge bg="purple" className="px-2 py-1 bg-purple-600 text-white">
                        {filteredGlobals.length} Universal Roles
                      </Badge>
                    </Card.Header>
                    <Card.Body className="p-3 bg-white">
                      <div className="row g-2">
                        {filteredGlobals.map((desig) => {
                          const gradeCode = desig.grade?.grade_code || "L5";
                          const colorClass = GRADE_BADGE_COLORS[gradeCode] || "bg-light text-dark";

                          return (
                            <div key={desig.id} className="col-12 col-md-6 col-lg-3">
                              <div className="border border-purple-100 rounded-2 p-2 bg-purple-50/30 d-flex flex-column justify-content-between h-100">
                                <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                                  <span className="fw-semibold text-dark small">{desig.title}</span>
                                  {desig.is_hod_role && (
                                    <Badge bg="danger" style={{ fontSize: "9px" }}>
                                      HOD
                                    </Badge>
                                  )}
                                </div>
                                <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: "10.5px" }}>
                                  <span className={`badge border px-1.5 py-0.5 ${colorClass}`}>
                                    {gradeCode} • Rank {desig.grade?.rank_level || 5}
                                  </span>
                                  <span>{desig.job_family}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card.Body>
                  </Card>
                )}
              </div>
            )}
          </Tab>

          {/* TAB 2: JOB GRADES & PAY BANDS */}
          <Tab
            eventKey="grades"
            title={
              <span className="d-flex align-items-center gap-1.5 py-1">
                <LuLayers size={15} /> Job Grades & Pay Bands (L1 - L11)
              </span>
            }
          >
            <div className="bg-white border rounded-3 p-3 shadow-xs">
              <div className="mb-3">
                <h6 className="fw-bold text-dark mb-1">Universal Career Hierarchy & Compensation Bands</h6>
                <p className="text-muted small mb-0">
                  Universal Job Grades allow automatic routing of approval workflows (Rank 1-11) and ensure employee salaries fall within established corporate pay bands.
                </p>
              </div>

              <Table responsive hover className="align-middle border mb-0" style={{ fontSize: "12.5px" }}>
                <thead className="bg-light text-secondary text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                  <tr>
                    <th className="py-2.5 px-3">Grade Code</th>
                    <th className="py-2.5">Band Title</th>
                    <th className="py-2.5 text-center">Rank Authority</th>
                    <th className="py-2.5">Standard CTC Pay Band</th>
                    <th className="py-2.5 text-center">Notice Period</th>
                    <th className="py-2.5">Applicable Scope / Roles</th>
                    <th className="py-2.5 text-center px-3">Headcount</th>
                  </tr>
                </thead>
                <tbody>
                  {structure.grades.map((grade) => {
                    const colorClass = GRADE_BADGE_COLORS[grade.grade_code] || "bg-light text-dark";

                    return (
                      <tr key={grade.id}>
                        <td className="px-3">
                          <span className={`badge border px-2 py-1 font-monospace fw-bold ${colorClass}`} style={{ fontSize: "11.5px" }}>
                            {grade.grade_code}
                          </span>
                        </td>
                        <td className="fw-semibold text-dark">{grade.grade_name}</td>
                        <td className="text-center">
                          <span className="badge bg-secondary-subtle text-secondary border px-2 py-1" style={{ fontSize: "11px" }}>
                            Level {grade.rank_level} {grade.rank_level >= 5 ? "👑 Approver" : ""}
                          </span>
                        </td>
                        <td className="font-monospace text-dark">
                          ₹{(parseFloat(grade.min_salary) / 100000).toFixed(2)}L – ₹{(parseFloat(grade.max_salary) / 100000).toFixed(2)}L CTC
                        </td>
                        <td className="text-center text-muted">{grade.notice_period_days} Days</td>
                        <td className="text-muted small" style={{ fontSize: "11.5px" }}>{grade.description || "Standard band"}</td>
                        <td className="text-center px-3">
                          <Badge bg="light" text="dark" className="border">
                            {grade.headcount || 0}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Tab>

          {/* TAB 3: ADD / EDIT MASTER ENTRIES */}
          <Tab
            eventKey="manage"
            title={
              <span className="d-flex align-items-center gap-1.5 py-1">
                <LuPlus size={15} /> Add Department / Designation
              </span>
            }
          >
            <Row className="g-3">
              {/* Form 1: Add Department */}
              <Col xs={12} lg={5}>
                <Card className="border shadow-xs rounded-3 h-100">
                  <Card.Header className="bg-light border-bottom py-2.5 px-3">
                    <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                      <LuBuilding2 size={16} className="text-primary" /> Create New Department
                    </span>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Form onSubmit={handleCreateDepartment}>
                      <Form.Group className="mb-2.5">
                        <Form.Label className="small fw-semibold">Department Code *</Form.Label>
                        <Form.Control
                          size="sm"
                          placeholder="e.g. ENG, SALES, RND, QA"
                          value={deptForm.dept_code}
                          onChange={(e) => setDeptForm({ ...deptForm, dept_code: e.target.value.toUpperCase() })}
                          required
                        />
                        <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                          Short identifier (2-6 letters)
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-2.5">
                        <Form.Label className="small fw-semibold">Department Name *</Form.Label>
                        <Form.Control
                          size="sm"
                          placeholder="e.g. Quality Assurance & Testing"
                          value={deptForm.dept_name}
                          onChange={(e) => setDeptForm({ ...deptForm, dept_name: e.target.value })}
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">Description / Purpose</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          size="sm"
                          placeholder="Brief operational purpose or scope of this department..."
                          value={deptForm.description}
                          onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                        />
                      </Form.Group>

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={savingDept}
                        className="w-100 d-flex align-items-center justify-content-center gap-1"
                      >
                        {savingDept ? <Spinner animation="border" size="sm" /> : <LuPlus size={15} />}
                        <span>Save Department</span>
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>

              {/* Form 2: Add Designation */}
              <Col xs={12} lg={7}>
                <Card className="border shadow-xs rounded-3 h-100">
                  <Card.Header className="bg-light border-bottom py-2.5 px-3">
                    <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                      <LuBriefcase size={16} className="text-emerald-600" /> Create New Designation / Job Title
                    </span>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Form onSubmit={handleCreateDesignation}>
                      <Row className="g-2.5 mb-2.5">
                        <Col xs={12} sm={8}>
                          <Form.Label className="small fw-semibold">Designation Title *</Form.Label>
                          <Form.Control
                            size="sm"
                            placeholder="e.g. Senior Backend Engineer, BDA, Floor Lead"
                            value={desigForm.title}
                            onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
                            required
                          />
                        </Col>
                        <Col xs={12} sm={4}>
                          <Form.Label className="small fw-semibold">Job Family</Form.Label>
                          <Form.Control
                            size="sm"
                            placeholder="e.g. Engineering, Sales"
                            value={desigForm.job_family}
                            onChange={(e) => setDesigForm({ ...desigForm, job_family: e.target.value })}
                          />
                        </Col>
                      </Row>

                      <Row className="g-2.5 mb-2.5">
                        <Col xs={12} sm={6}>
                          <Form.Label className="small fw-semibold">Department Scope</Form.Label>
                          <Form.Select
                            size="sm"
                            value={desigForm.department_id}
                            onChange={(e) => setDesigForm({ ...desigForm, department_id: e.target.value })}
                          >
                            <option value="">Global / All Departments (Cross-functional)</option>
                            {structure.departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.dept_name} ({d.dept_code})
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                            Leave empty for universal leadership roles (e.g. GM, Manager)
                          </Form.Text>
                        </Col>

                        <Col xs={12} sm={6}>
                          <Form.Label className="small fw-semibold">Universal Job Grade *</Form.Label>
                          <Form.Select
                            size="sm"
                            value={desigForm.grade_id}
                            onChange={(e) => setDesigForm({ ...desigForm, grade_id: e.target.value })}
                            required
                          >
                            <option value="">Select Grade (L1 - L11)...</option>
                            {structure.grades.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.grade_code} - {g.grade_name} (Rank {g.rank_level})
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                            Determines approval rank & standard pay band
                          </Form.Text>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="is_hod_checkbox"
                          label="Designation is Department Head (HOD) role (Authorizes leave & appraisal approvals)"
                          checked={desigForm.is_hod_role}
                          onChange={(e) => setDesigForm({ ...desigForm, is_hod_role: e.target.checked })}
                          className="small fw-medium text-dark"
                        />
                      </Form.Group>

                      <Button
                        type="submit"
                        variant="success"
                        size="sm"
                        disabled={savingDesig}
                        className="d-flex align-items-center justify-content-center gap-1"
                      >
                        {savingDesig ? <Spinner animation="border" size="sm" /> : <LuCheck size={15} />}
                        <span>Save Designation</span>
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer className="bg-light py-2">
        <Button variant="secondary" size="sm" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OrganizationStructureModal;

