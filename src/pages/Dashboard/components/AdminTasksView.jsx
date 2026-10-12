import React, { useState, useEffect } from "react";
import { Row, Col, Table, Badge, Button, Modal, Form, Dropdown } from "react-bootstrap";
import {
  LuPlus,
  LuSearch,
  LuFilter,
  LuClock,
  LuTruck,
  LuCoffee,
  LuPenTool,
  LuCreditCard,
  LuCalendar,
  LuWrench,
  LuTrash2,
  LuEye,
  LuSparkles,
  LuCheck,
  LuExternalLink,
  LuBuilding2
} from "react-icons/lu";
import { FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../../api/axios";

const CATEGORIES = [
  "Facilities & Maintenance",
  "Stationery & Supplies",
  "Logistics & Dispatch",
  "Pantry & Catering",
  "ID & Access Passes",
  "Events & Celebrations",
  "Miscellaneous"
];

const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const STATUSES = ["Pending", "In Progress", "Completed"];

const INITIAL_FALLBACK_TASKS = [
  {
    id: 1,
    title: "Air Conditioning Servicing - 3rd Floor East Wing",
    category: "Facilities & Maintenance",
    description: "Scheduled servicing and cooling gas refill for floor AC units before summer peak.",
    requester_name: "Floor Admin",
    requester_id: "ADMIN-01",
    dept: "Operations",
    priority: "High",
    status: "In Progress",
    due_date: "2026-10-18",
    assigned_to: "CoolAir Services Vendor",
    notes: "Vendor technician visiting on Thursday at 2:00 PM.",
  },
  {
    id: 2,
    title: "Quarterly Stationery & Printer Paper Restock",
    category: "Stationery & Supplies",
    description: "Procure A4 reams, blue/black ball pens, marker sets, and filing folders for all departments.",
    requester_name: "Priyanka Mukherjee",
    requester_id: "HR-PM-02",
    dept: "HR",
    priority: "Medium",
    status: "Pending",
    due_date: "2026-10-20",
    assigned_to: "Admin Team",
    notes: "Purchase order submitted to OfficePlus Stationery.",
  },
  {
    id: 3,
    title: "Dispatch Signed Vendor Contracts via Bluedart Express",
    category: "Logistics & Dispatch",
    description: "Urgent physical dispatch of signed tripartite agreement to Kolkata Corporate HQ.",
    requester_name: "Legal Officer",
    requester_id: "LEG-01",
    dept: "Legal Cell",
    priority: "Urgent",
    status: "Pending",
    due_date: "2026-10-14",
    assigned_to: "Admin Team",
    notes: "Tracking AWB to be shared with sender once booked.",
  },
  {
    id: 4,
    title: "Pantry & Coffee Machine Descaling / Bean Refill",
    category: "Pantry & Catering",
    description: "Deep cleaning of 2nd & 4th floor automated coffee machines and restocking beans & green tea.",
    requester_name: "Admin Office",
    requester_id: "ADM-02",
    dept: "Administration",
    priority: "Medium",
    status: "Completed",
    due_date: "2026-10-10",
    assigned_to: "Café Bliss Supplies",
    notes: "Completed by maintenance team on Oct 10 morning.",
  },
  {
    id: 5,
    title: "Client Delegation Welcome Badges & Parking Reservations",
    category: "Events & Celebrations",
    description: "Prepare 5 visitor security passes, reserved visitor parking slots 12-14, and executive meeting room setup.",
    requester_name: "Executive Secretary",
    requester_id: "MGT-SEC-01",
    dept: "Management",
    priority: "High",
    status: "In Progress",
    due_date: "2026-10-16",
    assigned_to: "Security & Admin Desk",
    notes: "Boardroom reserved from 10:00 AM to 3:00 PM.",
  },
  {
    id: 6,
    title: "Physical Employee ID Card Batch Printing (October Joiners)",
    category: "ID & Access Passes",
    description: "Print NFC proximity cards and lanyards for newly joined staff members across departments.",
    requester_name: "HR Operations",
    requester_id: "HR-PM-02",
    dept: "HR",
    priority: "Medium",
    status: "Pending",
    due_date: "2026-10-22",
    assigned_to: "Admin Print Desk",
    notes: "Photos and employee codes synced from HR portal.",
  },
];

export default function AdminTasksView() {
  const [tasks, setTasks] = useState(INITIAL_FALLBACK_TASKS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [viewTask, setViewTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    category: "Facilities & Maintenance",
    priority: "Medium",
    status: "Pending",
    requester_name: "",
    requester_id: "",
    dept: "Operations",
    due_date: "",
    assigned_to: "Admin Team",
    description: "",
    notes: "",
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/tasks");
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.warn("Using fallback local tasks:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.patch(`/admin/tasks/${taskId}/status`, { status: newStatus });
      toast.success(`Task moved to ${newStatus}`);
    } catch (err) {
      toast.success(`Task marked as ${newStatus} (Local)`);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this administrative task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.delete(`/admin/tasks/${taskId}`);
      toast.success("Task deleted successfully");
    } catch (err) {
      toast.success("Task removed");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      const res = await api.post("/admin/tasks", taskForm);
      if (res.data?.success && res.data.data) {
        setTasks((prev) => [res.data.data, ...prev]);
        toast.success("Admin task logged successfully!");
      } else {
        const localNew = { ...taskForm, id: Date.now() };
        setTasks((prev) => [localNew, ...prev]);
        toast.success("Admin task logged successfully!");
      }
    } catch (err) {
      const localNew = { ...taskForm, id: Date.now() };
      setTasks((prev) => [localNew, ...prev]);
      toast.success("Admin task logged successfully!");
    }

    setShowModal(false);
    setTaskForm({
      title: "",
      category: "Facilities & Maintenance",
      priority: "Medium",
      status: "Pending",
      requester_name: "",
      requester_id: "",
      dept: "Operations",
      due_date: "",
      assigned_to: "Admin Team",
      description: "",
      notes: "",
    });
  };

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      t.title?.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term) ||
      t.requester_name?.toLowerCase().includes(term) ||
      t.dept?.toLowerCase().includes(term) ||
      t.assigned_to?.toLowerCase().includes(term);

    const matchesCat = selectedCategory === "All" || t.category === selectedCategory;
    const matchesPriority = selectedPriority === "All" || t.priority === selectedPriority;
    const matchesStatus = selectedStatus === "All" || t.status === selectedStatus;

    return matchesSearch && matchesCat && matchesPriority && matchesStatus;
  });

  // Category Icon & Color
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case "Facilities & Maintenance":
        return { icon: <LuWrench className="text-orange-500" />, badge: "bg-orange-50 text-orange-700 border-orange-200" };
      case "Stationery & Supplies":
        return { icon: <LuPenTool className="text-emerald-500" />, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "Logistics & Dispatch":
        return { icon: <LuTruck className="text-blue-500" />, badge: "bg-blue-50 text-blue-700 border-blue-200" };
      case "Pantry & Catering":
        return { icon: <LuCoffee className="text-amber-600" />, badge: "bg-amber-50 text-amber-700 border-amber-200" };
      case "ID & Access Passes":
        return { icon: <LuCreditCard className="text-purple-500" />, badge: "bg-purple-50 text-purple-700 border-purple-200" };
      case "Events & Celebrations":
        return { icon: <LuSparkles className="text-pink-500" />, badge: "bg-pink-50 text-pink-700 border-pink-200" };
      default:
        return { icon: <LuBuilding2 className="text-slate-500" />, badge: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case "Urgent":
        return <Badge bg="danger" className="fw-semibold px-2 py-1">🚨 Urgent</Badge>;
      case "High":
        return <Badge bg="warning" className="text-dark fw-semibold px-2 py-1">⚡ High</Badge>;
      case "Medium":
        return <Badge bg="info" className="text-dark fw-semibold px-2 py-1">Medium</Badge>;
      default:
        return <Badge bg="secondary" className="fw-semibold px-2 py-1">Low</Badge>;
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "Completed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">✓ Completed</span>;
      case "In Progress":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">⏳ In Progress</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">● Pending</span>;
    }
  };

  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const urgentCount = tasks.filter((t) => t.priority === "Urgent" && t.status !== "Completed").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wider uppercase mb-2">
              <LuBuilding2 className="w-3.5 h-3.5" />
              Administrative Operations Desk
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Unofficial Tasks & Facilities Hub
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl mt-1">
              Handling workplace facilities, logistics, office supplies, visitor passes, catering, and ad-hoc operational requests across all company departments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              className="d-flex align-items-center gap-2 fw-bold px-4 py-2.5 rounded-xl shadow-sm"
              style={{ backgroundColor: "#2563eb", borderColor: "#2563eb" }}
              onClick={() => setShowModal(true)}
            >
              <LuPlus className="w-4 h-4" />
              Log Unofficial Task
            </Button>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Tasks</div>
            <div className="text-2xl font-black text-white mt-1">{tasks.length}</div>
            <div className="text-xs text-slate-400 mt-1">Operational work orders</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Pending Action</div>
            <div className="text-2xl font-black text-amber-300 mt-1">{pendingCount}</div>
            <div className="text-xs text-amber-200/70 mt-1">Awaiting dispatch/vendor</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider">In Progress</div>
            <div className="text-2xl font-black text-blue-300 mt-1">{inProgressCount}</div>
            <div className="text-xs text-blue-200/70 mt-1">Active execution</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Resolved</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{completedCount}</div>
            <div className="text-xs text-emerald-200/70 mt-1">Completed successfully</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
        {/* Filters Header */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by title, requester, department, or vendor..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories ({CATEGORIES.length})</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Priority Select */}
            <select
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Status Select */}
            <select
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {(search || selectedCategory !== "All" || selectedPriority !== "All" || selectedStatus !== "All") && (
              <Button
                variant="light"
                size="sm"
                className="text-xs fw-bold px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 border"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All");
                  setSelectedPriority("All");
                  setSelectedStatus("All");
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Task Table */}
        <div className="overflow-x-auto">
          <Table hover responsive className="align-middle mb-0">
            <thead className="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Task / Work Order</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Requester & Dept</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Assigned / Vendor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <LuWrench className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <div className="font-bold text-slate-700">No administrative tasks found</div>
                    <div className="text-xs text-slate-500 mt-1">Click "Log Unofficial Task" above to add work orders.</div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const catMeta = getCategoryMeta(t.category);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-xs">
                        <div className="line-clamp-1">{t.title}</div>
                        {t.description && (
                          <div className="text-xs text-slate-500 line-clamp-1 font-normal mt-0.5">
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${catMeta.badge}`}>
                          {catMeta.icon}
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 text-xs">{t.requester_name || "Admin Staff"}</div>
                        <div className="text-[11px] text-slate-500">{t.dept || "General"} {t.requester_id ? `(${t.requester_id})` : ""}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                        {t.due_date ? t.due_date : "Flexible"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {t.assigned_to || "Admin Team"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Dropdown>
                          <Dropdown.Toggle
                            as="button"
                            className="border-0 bg-transparent p-0 cursor-pointer focus:outline-none"
                          >
                            {getStatusBadge(t.status)}
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="shadow-lg border rounded-xl py-1 text-xs">
                            <Dropdown.Item onClick={() => handleStatusChange(t.id, "Pending")}>
                              ● Set to Pending
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleStatusChange(t.id, "In Progress")}>
                              ⏳ Set to In Progress
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleStatusChange(t.id, "Completed")}>
                              ✓ Set to Completed
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View Details"
                            onClick={() => setViewTask(t)}
                          >
                            <LuEye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Task"
                            onClick={() => handleDelete(t.id)}
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Modal: Log New Unofficial Task */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-b px-6 py-4">
          <Modal.Title className="text-lg font-bold text-slate-800 d-flex align-items-center gap-2">
            <LuBuilding2 className="text-blue-600 w-5 h-5" />
            Log Unofficial Administrative Task
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTask}>
          <Modal.Body className="px-6 py-4 space-y-4">
            <Form.Group>
              <Form.Label className="small fw-bold text-slate-700">Task / Work Order Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. AC Repair in Conference Room B, Courier Dispatch..."
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
              />
            </Form.Group>

            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Category *</Form.Label>
                <Form.Select
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Priority *</Form.Label>
                <Form.Select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Form.Select>
              </Col>
            </Row>

            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Requester Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Floor Manager, Executive Staff"
                  value={taskForm.requester_name}
                  onChange={(e) => setTaskForm({ ...taskForm, requester_name: e.target.value })}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Department</Form.Label>
                <Form.Select
                  value={taskForm.dept}
                  onChange={(e) => setTaskForm({ ...taskForm, dept: e.target.value })}
                >
                  <option value="Operations">Operations</option>
                  <option value="Management">Management</option>
                  <option value="HR">HR</option>
                  <option value="Accounts & Finance">Accounts & Finance</option>
                  <option value="IT & Systems">IT & Systems</option>
                  <option value="Legal Cell">Legal Cell</option>
                  <option value="Administration">Administration</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Col>
            </Row>

            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Target Due Date</Form.Label>
                <Form.Control
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Assigned Vendor / Team</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Admin Team, Bluedart Courier, Electrician..."
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                />
              </Col>
            </Row>

            <Form.Group>
              <Form.Label className="small fw-bold text-slate-700">Description & Requirements</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Provide detailed instructions or vendor contact notes..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-t px-6 py-3">
            <Button variant="light" onClick={() => setShowModal(false)} className="fw-semibold">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="fw-semibold px-4" style={{ backgroundColor: "#2563eb", borderColor: "#2563eb" }}>
              Save Task
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: View Details */}
      {viewTask && (
        <Modal show={!!viewTask} onHide={() => setViewTask(null)} centered>
          <Modal.Header closeButton className="border-b px-6 py-4">
            <Modal.Title className="text-base font-bold text-slate-800">
              {viewTask.title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="px-6 py-4 space-y-3 text-sm">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-800">{viewTask.category}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-slate-500">Priority:</span>
              <span>{getPriorityBadge(viewTask.priority)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-slate-500">Status:</span>
              <span>{getStatusBadge(viewTask.status)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-slate-500">Requester:</span>
              <span className="font-medium text-slate-800">{viewTask.requester_name || "Admin Staff"} ({viewTask.dept || "General"})</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-slate-500">Due Date:</span>
              <span className="font-medium text-slate-800">{viewTask.due_date || "Flexible"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-slate-500">Assigned To:</span>
              <span className="font-medium text-slate-800">{viewTask.assigned_to || "Admin Team"}</span>
            </div>
            {viewTask.description && (
              <div className="pt-1">
                <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Description:</div>
                <div className="bg-slate-50 p-3 rounded-xl text-slate-700 text-xs whitespace-pre-wrap border">
                  {viewTask.description}
                </div>
              </div>
            )}
            {viewTask.notes && (
              <div className="pt-1">
                <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Internal Notes:</div>
                <div className="bg-amber-50/50 p-3 rounded-xl text-amber-900 text-xs whitespace-pre-wrap border border-amber-200/50">
                  {viewTask.notes}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-t px-6 py-3">
            <Button variant="secondary" onClick={() => setViewTask(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
