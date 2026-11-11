import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Badge,
  Spinner,
  Modal,
  Offcanvas,
  Card,
  Alert
} from "react-bootstrap";
import {
  LuNetwork,
  LuLayers,
  LuTrendingUp,
  LuSearch,
  LuZoomIn,
  LuZoomOut,
  LuRotateCcw,
  LuUserCheck,
  LuBuilding2,
  LuShieldCheck,
  LuUsers,
  LuWallet,
  LuCalendar,
  LuChevronRight,
  LuX,
  LuRefreshCw,
  LuFolderTree,
  LuChevronsDown,
  LuChevronsUp,
  LuSparkles
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { getAuthRole, getAuthUser } from "../../utils/auth";
import OrgNode from "../../components/OrgChart/OrgNode";
import DepartmentHierarchyView from "../../components/OrgChart/DepartmentHierarchyView";
import VisualAnalyticsDashboard from "../../components/OrgChart/VisualAnalyticsDashboard";

const OrgChart = () => {
  const [activeView, setActiveView] = useState("tree"); // "tree" | "departments" | "analytics"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tree & Hierarchy State
  const [treeData, setTreeData] = useState({
    roots: [],
    all_nodes: [],
    total_nodes: 0,
    max_depth: 1,
    departments_summary: [],
    top_executive: null
  });

  // Department Hierarchy State
  const [deptHierarchy, setDeptHierarchy] = useState([]);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);

  // Interactive Controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [collapsedMap, setCollapsedMap] = useState({});

  // Employee Detail Drawer State
  const [selectedNode, setSelectedNode] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Reassign Manager Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTargetNode, setReassignTargetNode] = useState(null);
  const [selectedNewManagerId, setSelectedNewManagerId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const treeViewportRef = useRef(null);

  const rawRole = (getAuthRole() || "").toLowerCase();
  const canManageHierarchy = ["admin", "hr", "hrmanager", "management", "ceo", "coo", "chro"].includes(rawRole);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [treeRes, deptRes, analyticsRes] = await Promise.allSettled([
        api.get("/organization/tree"),
        api.get("/organization/department-hierarchy"),
        api.get("/organization/analytics")
      ]);

      if (treeRes.status === "fulfilled" && treeRes.value.data.success) {
        setTreeData(treeRes.value.data);
      }
      if (deptRes.status === "fulfilled" && deptRes.value.data.success) {
        setDeptHierarchy(deptRes.value.data.departments || []);
      }
      if (analyticsRes.status === "fulfilled" && analyticsRes.value.data.success) {
        setAnalyticsData(analyticsRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load organization data:", err);
      toast.error("Failed to load organization hierarchy.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Zoom Handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => setZoomLevel(1);

  // Expand / Collapse All
  const handleExpandAll = () => setCollapsedMap({});
  const handleCollapseAll = () => {
    const newMap = {};
    treeData.all_nodes.forEach((n) => {
      if (n.direct_reports_count > 0) {
        newMap[n.employee_id] = true;
      }
    });
    setCollapsedMap(newMap);
  };

  const handleToggleCollapse = (empId) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [empId]: !prev[empId]
    }));
  };

  // Node Selection for Detail Drawer
  const handleSelectNode = (node) => {
    setSelectedNode(node);
    setShowDrawer(true);
  };

  // Reassign Manager Modal
  const handleOpenReassignModal = (node) => {
    setReassignTargetNode(node);
    setSelectedNewManagerId(node.reporting_manager_id || "");
    setShowReassignModal(true);
  };

  const handleSaveReassignment = async () => {
    if (!reassignTargetNode) return;
    setReassigning(true);
    try {
      const res = await api.put("/organization/reporting-manager", {
        employee_id: reassignTargetNode.employee_id,
        new_reporting_manager_id: selectedNewManagerId || null
      });

      if (res.data.success) {
        toast.success(res.data.message || "Reporting manager updated successfully!");
        setShowReassignModal(false);
        // Refresh tree and analytics
        fetchAllData();
      } else {
        toast.error(res.data.error || "Failed to reassign reporting manager.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error updating reporting manager.");
    } finally {
      setReassigning(false);
    }
  };

  // Build Manager Breadcrumbs Chain for Selected Employee
  const getManagerChain = (empId) => {
    const chain = [];
    const nodeLookup = {};
    treeData.all_nodes.forEach((n) => {
      nodeLookup[n.employee_id] = n;
    });

    let curr = nodeLookup[empId];
    const visited = new Set();
    while (curr && curr.reporting_manager_id && !visited.has(curr.reporting_manager_id)) {
      visited.add(curr.reporting_manager_id);
      const mgr = nodeLookup[curr.reporting_manager_id];
      if (mgr) {
        chain.unshift(mgr);
        curr = mgr;
      } else {
        break;
      }
    }
    return chain;
  };

  // Filter root nodes based on department filter
  const displayedRoots =
    filterDept === "All"
      ? treeData.roots
      : treeData.roots.filter((r) => {
        // If root or any descendant belongs to filterDept
        const hasDept = (n) =>
          n.department_name === filterDept || n.children?.some(hasDept);
        return hasDept(r);
      });

  return (
    <div className="org-chart-page min-h-screen bg-slate-50/50 pb-5">
      {/* Top Header & View Selector */}
      <div className="bg-white border-bottom border-slate-200 py-3 px-4 sticky-top shadow-3xs" style={{ zIndex: 2 }}>
        <Container fluid className="px-lg-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Title & Metadata */}
            <div className="d-flex align-items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3 shadow-xs">
                <LuNetwork size={22} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h4 className="fw-bold text-slate-900 mb-0" style={{ fontSize: "19px" }}>
                    Interactive Org Chart Engine
                  </h4>
                  <Badge bg="primary" className="bg-blue-50 text-white-700 border border-blue-200 text-3xs font-medium">
                    {treeData.total_nodes} Members
                  </Badge>
                </div>
                <span className="text-slate-500 text-xs">
                  Visual company reporting tree, departmental structure & Chart.js analytics
                </span>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="d-flex align-items-center bg-slate-100 p-1 rounded-3 border border-slate-200">
              <button
                type="button"
                className={`btn btn-sm py-1.5 px-3 rounded-2 fw-semibold text-xs d-flex align-items-center gap-1.5 transition-all ${activeView === "tree"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
                onClick={() => setActiveView("tree")}
              >
                <LuFolderTree size={14} />
                <span>Reporting Tree</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm py-1.5 px-3 rounded-2 fw-semibold text-xs d-flex align-items-center gap-1.5 transition-all ${activeView === "departments"
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
                onClick={() => setActiveView("departments")}
              >
                <LuBuilding2 size={14} />
                <span>Department Hierarchy</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm py-1.5 px-3 rounded-2 fw-semibold text-xs d-flex align-items-center gap-1.5 transition-all ${activeView === "analytics"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
                onClick={() => setActiveView("analytics")}
              >
                <LuTrendingUp size={14} />
                <span>Visual Analytics (Chart.js)</span>
              </button>
            </div>

            {/* Controls: Search, Filter, Refresh */}
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="light"
                size="sm"
                className="border text-slate-700 d-inline-flex align-items-center gap-1.5 text-xs shadow-3xs"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh hierarchy data"
              >
                <LuRefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </Container>
      </div>

      <Container fluid className="px-lg-4 mt-3">
        {/* Loading Indicator */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="text-slate-500 text-xs mt-2">Constructing organization tree & analytics...</div>
          </div>
        ) : (
          <>
            {/* VIEW 1: INTERACTIVE REPORTING TREE */}
            {activeView === "tree" && (
              <div className="org-tree-container">
                {/* Tree Toolbar Controls */}
                <div className="bg-white p-2.5 rounded-3 border border-slate-200 mb-3 shadow-2xs d-flex flex-wrap align-items-center justify-content-between gap-2.5">
                  <div className="d-flex align-items-center gap-2.5 flex-wrap">
                    {/* Live Search */}
                    <div className="position-relative" style={{ width: "260px" }}>
                      <LuSearch className="position-absolute top-50 start-0 translate-middle-y ms-2.5 text-slate-400" size={14} />
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="Search employee, ID, title..."
                        className="ps-4 text-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-1 p-0 text-slate-400 hover:text-slate-600"
                          onClick={() => setSearchTerm("")}
                        >
                          <LuX size={13} />
                        </button>
                      )}
                    </div>

                    {/* Department Filter */}
                    <Form.Select
                      size="sm"
                      className="text-xs"
                      style={{ width: "200px" }}
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                    >
                      <option value="All">All Departments</option>
                      {treeData.departments_summary.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name} ({d.count})
                        </option>
                      ))}
                    </Form.Select>

                    {/* Expand / Collapse All */}
                    <div className="btn-group btn-group-sm">
                      <Button
                        variant="light"
                        className="border text-xs d-inline-flex align-items-center gap-1"
                        onClick={handleExpandAll}
                        title="Expand all branches"
                      >
                        <LuChevronsDown size={13} /> Expand All
                      </Button>
                      <Button
                        variant="light"
                        className="border text-xs d-inline-flex align-items-center gap-1"
                        onClick={handleCollapseAll}
                        title="Collapse all branches"
                      >
                        <LuChevronsUp size={13} /> Collapse All
                      </Button>
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="d-flex align-items-center gap-1.5">
                    <span className="text-3xs text-slate-400 font-mono me-1">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="light"
                      size="sm"
                      className="border p-1 text-slate-600"
                      onClick={handleZoomIn}
                      title="Zoom In"
                    >
                      <LuZoomIn size={14} />
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      className="border p-1 text-slate-600"
                      onClick={handleZoomOut}
                      title="Zoom Out"
                    >
                      <LuZoomOut size={14} />
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      className="border p-1 text-slate-600"
                      onClick={handleResetZoom}
                      title="Reset Zoom (100%)"
                    >
                      <LuRotateCcw size={14} />
                    </Button>
                  </div>
                </div>

                {/* Viewport for zoomable & pannable tree */}
                <div
                  ref={treeViewportRef}
                  className="org-tree-viewport bg-white rounded-3 border border-slate-200 p-4 shadow-sm overflow-auto"
                  style={{
                    minHeight: "680px",
                    backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                >
                  <div
                    className="org-tree-content d-flex justify-content-center"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top center",
                      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      minWidth: "max-content",
                      padding: "20px",
                    }}
                  >
                    {displayedRoots.length > 0 ? (
                      <div className="d-flex gap-5 flex-row justify-content-center">
                        {displayedRoots.map((root) => (
                          <OrgNode
                            key={root.employee_id}
                            node={root}
                            searchTerm={searchTerm}
                            filterDept={filterDept}
                            onSelectNode={handleSelectNode}
                            onReassignManager={handleOpenReassignModal}
                            canManage={canManageHierarchy}
                            depth={1}
                            collapsedMap={collapsedMap}
                            onToggleCollapse={handleToggleCollapse}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5 text-slate-400">
                        No employees found matching the current filters.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: DEPARTMENT HIERARCHY */}
            {activeView === "departments" && (
              <DepartmentHierarchyView
                departments={deptHierarchy}
                onSelectEmployee={handleSelectNode}
              />
            )}

            {/* VIEW 3: VISUAL ANALYTICS (CHART.JS) */}
            {activeView === "analytics" && (
              <VisualAnalyticsDashboard analyticsData={analyticsData} />
            )}
          </>
        )}
      </Container>

      {/* MODAL 1: EMPLOYEE DETAIL DRAWER */}
      <Offcanvas
        show={showDrawer}
        onHide={() => setShowDrawer(false)}
        placement="end"
        style={{ width: "420px" }}
      >
        <Offcanvas.Header closeButton className="border-bottom bg-slate-50 py-3">
          <Offcanvas.Title className="fs-6 fw-bold text-slate-900 d-flex align-items-center gap-2">
            <LuUsers className="text-blue-600" /> Employee Profile
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-4">
          {selectedNode && (
            <div>
              {/* Profile Card Header */}
              <div className="text-center pb-3 border-bottom border-slate-200">
                {selectedNode.avatar ? (
                  <img
                    src={selectedNode.avatar}
                    alt={selectedNode.name}
                    className="rounded-circle border mb-2 shadow-xs"
                    style={{ width: "72px", height: "72px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-xs mx-auto mb-2"
                    style={{
                      width: "72px",
                      height: "72px",
                      fontSize: "24px",
                      background: selectedNode.rank_level >= 11 ? "#b45309" : "#2563eb",
                    }}
                  >
                    {selectedNode.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h5 className="fw-bold text-slate-900 mb-0.5">{selectedNode.name}</h5>
                <div className="text-xs text-slate-500 font-mono mb-2">{selectedNode.employee_id}</div>
                <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                  <Badge bg="light" text="dark" className="border text-3xs font-semibold">
                    {selectedNode.grade_code} ({selectedNode.grade_name})
                  </Badge>
                  <Badge bg="primary" className="bg-blue-50 text-white-700 border border-blue-200 text-3xs">
                    {selectedNode.department_name}
                  </Badge>
                  {selectedNode.is_hod && (
                    <Badge bg="purple" className="bg-purple-100 text-purple-800 border border-purple-200 text-3xs">
                      Dept Head
                    </Badge>
                  )}
                </div>
              </div>

              {/* Employment Attributes */}
              <div className="py-3 border-bottom border-slate-200">
                <span className="text-3xs fw-bold text-slate-400 uppercase tracking-wider d-block mb-2">
                  Role Details
                </span>
                <div className="d-flex flex-column gap-2 text-xs">
                  <div className="d-flex justify-content-between">
                    <span className="text-slate-500">Designation:</span>
                    <strong className="text-slate-900">{selectedNode.designation}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-slate-500">Employment Type:</span>
                    <span className="text-slate-800">{selectedNode.employment_type}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-slate-500">Work Location:</span>
                    <span className="text-slate-800">{selectedNode.work_location}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-slate-500">Department Head / HOD:</span>
                    <span className="text-slate-800 fw-medium">
                      {selectedNode.hod_name && selectedNode.hod_name !== "N/A"
                        ? `${selectedNode.hod_name}${selectedNode.hod_id ? ` (${selectedNode.hod_id})` : ""}`
                        : (selectedNode.hod_id ? `HOD ID: ${selectedNode.hod_id}` : "—")}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-800 font-mono text-3xs">{selectedNode.email}</span>
                  </div>
                </div>
              </div>

              {/* Management Breadcrumbs Chain */}
              <div className="py-3 border-bottom border-slate-200">
                <span className="text-3xs fw-bold text-slate-400 uppercase tracking-wider d-block mb-2">
                  Managerial Reporting Chain
                </span>
                {getManagerChain(selectedNode.employee_id).length > 0 ? (
                  <div className="d-flex flex-column gap-1.5">
                    {getManagerChain(selectedNode.employee_id).map((mgr, idx) => (
                      <div
                        key={mgr.employee_id}
                        className="p-2 rounded-2 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between text-xs"
                      >
                        <div>
                          <div className="fw-semibold text-slate-900">{mgr.name}</div>
                          <span className="text-3xs text-slate-500">{mgr.designation}</span>
                        </div>
                        <Badge bg="light" text="dark" className="border text-3xs font-mono">
                          {mgr.grade_code}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs fst-italic">
                    Top Executive (No higher reporting manager)
                  </div>
                )}
              </div>

              {/* Direct Subordinates List */}
              <div className="pt-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-3xs fw-bold text-slate-400 uppercase tracking-wider">
                    Direct Subordinates ({selectedNode.direct_reports_count})
                  </span>
                  <span className="text-3xs text-slate-400">Total: {selectedNode.total_reports_count}</span>
                </div>

                {selectedNode.children && selectedNode.children.length > 0 ? (
                  <div className="d-flex flex-column gap-1.5" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {selectedNode.children.map((child) => (
                      <div
                        key={child.employee_id}
                        className="p-2 rounded-2 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between text-xs cursor-pointer hover:bg-blue-50"
                        onClick={() => setSelectedNode(child)}
                      >
                        <div>
                          <div className="fw-semibold text-slate-900">{child.name}</div>
                          <span className="text-3xs text-slate-500">{child.designation}</span>
                        </div>
                        <Badge bg="light" text="dark" className="border text-3xs font-mono">
                          {child.grade_code}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs fst-italic">No direct subordinates</div>
                )}
              </div>

              {/* Admin Action: Reassign Manager */}
              {canManageHierarchy && (
                <div className="mt-4 pt-3 border-top border-slate-200 text-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="w-100 text-xs fw-bold d-inline-flex align-items-center justify-content-center gap-1.5"
                    onClick={() => {
                      setShowDrawer(false);
                      handleOpenReassignModal(selectedNode);
                    }}
                  >
                    <LuUserCheck size={14} /> Reassign Reporting Manager
                  </Button>
                </div>
              )}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* MODAL 2: REASSIGN REPORTING MANAGER */}
      <Modal show={showReassignModal} onHide={() => setShowReassignModal(false)} centered>
        <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
          <Modal.Title className="fs-6 fw-bold text-slate-900 d-flex align-items-center gap-2">
            <LuUserCheck className="text-blue-600" /> Reassign Reporting Manager
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3.5">
          {reassignTargetNode && (
            <div>
              <Alert variant="info" className="py-2 px-3 text-xs mb-3">
                Select a supervisor for <strong>{reassignTargetNode.name}</strong> ({reassignTargetNode.employee_id}).
                The engine automatically prevents circular reporting loops.
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label className="text-xs fw-semibold text-slate-700">
                  Target Employee
                </Form.Label>
                <Form.Control
                  type="text"
                  size="sm"
                  className="text-xs bg-slate-100"
                  value={`${reassignTargetNode.name} (${reassignTargetNode.designation})`}
                  disabled
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="text-xs fw-semibold text-slate-700">
                  New Reporting Manager
                </Form.Label>
                <Form.Select
                  size="sm"
                  className="text-xs"
                  value={selectedNewManagerId}
                  onChange={(e) => setSelectedNewManagerId(e.target.value)}
                >
                  <option value="">None (Top-Level Primary Root / CEO)</option>
                  {treeData.all_nodes
                    .filter((n) => n.employee_id !== reassignTargetNode.employee_id)
                    .map((m) => (
                      <option key={m.employee_id} value={m.employee_id}>
                        {m.name} — {m.designation} ({m.grade_code}, {m.department_name})
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-slate-50 border-top border-slate-200 py-2">
          <Button
            variant="secondary"
            size="sm"
            className="text-xs"
            onClick={() => setShowReassignModal(false)}
            disabled={reassigning}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="text-xs fw-bold"
            onClick={handleSaveReassignment}
            disabled={reassigning}
          >
            {reassigning ? <Spinner animation="border" size="sm" /> : "Save Reporting Manager"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrgChart;

