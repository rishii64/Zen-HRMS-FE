import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge } from 'react-bootstrap';
import { getApiBaseUrl } from '../../api/axios';
import {
  LuCalendarCheck,
  LuBriefcase,
  LuTrash2,
  LuCalendar,
  LuMapPin,
  LuSearch,
  LuLayers,
  LuSparkles
} from 'react-icons/lu';
import toast from 'react-hot-toast';

const BRANCH_OPTIONS = [
  { value: "All", label: "All Branches (Company-wide Universal)" },
  { value: "Kolkata", label: "Kolkata (HQ / Salt Lake)" },
  { value: "Mumbai", label: "Mumbai (Maharashtra Branch)" },
  { value: "Bengaluru", label: "Bengaluru (Karnataka Branch)" },
  { value: "Delhi NCR", label: "Delhi NCR Branch" },
  { value: "Odisha", label: "Odisha (Bhubaneswar Branch)" },
  { value: "International - Dubai", label: "International - Dubai (UAE)" },
  { value: "International - London", label: "International - London (UK)" }
];

const getBranchBadge = (loc) => {
  const b = (loc || "All").toLowerCase();
  if (b === "all" || b === "all branches") {
    return <span className="badge rounded-pill bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-semibold">🏢 Universal</span>;
  }
  if (b.includes("mumbai")) {
    return <span className="badge rounded-pill bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-semibold">📍 Mumbai</span>;
  }
  if (b.includes("bengaluru") || b.includes("bangalore")) {
    return <span className="badge rounded-pill bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-semibold">📍 Bengaluru</span>;
  }
  if (b.includes("kolkata")) {
    return <span className="badge rounded-pill bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-semibold">📍 Kolkata</span>;
  }
  if (b.includes("odisha")) {
    return <span className="badge rounded-pill bg-cyan-50 text-cyan-800 border border-cyan-300 text-[10px] font-semibold">📍 Odisha</span>;
  }
  if (b.includes("delhi")) {
    return <span className="badge rounded-pill bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-semibold">📍 Delhi NCR</span>;
  }
  if (b.includes("dubai")) {
    return <span className="badge rounded-pill bg-purple-50 text-purple-800 border border-purple-300 text-[10px] font-semibold">🌐 Dubai (UAE)</span>;
  }
  if (b.includes("london")) {
    return <span className="badge rounded-pill bg-indigo-50 text-indigo-800 border border-indigo-300 text-[10px] font-semibold">🌐 London (UK)</span>;
  }
  return <span className="badge rounded-pill bg-secondary-subtle text-secondary border text-[10px]">📍 {loc}</span>;
};

const HolidayManager = () => {
  const [holidays, setHolidays] = useState([]);
  const [branchFilter, setBranchFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    type: 'Public',
    dept: 'All',
    branch_location: 'All',
    is_working_day: false,
    notes: ''
  });
  const [togglingId, setTogglingId] = useState(null);

  // Central backend API URL
  const API_URL = `${getApiBaseUrl()}/holidays`;

  // Function to load data from database
  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setHolidays(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // Filtered holidays by Branch & Search Query
  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      // Branch filter
      if (branchFilter !== 'All') {
        const hLoc = (h.branch_location || "All").toLowerCase();
        const target = branchFilter.toLowerCase();
        const matchesBranch = hLoc === target || hLoc.includes(target) || target.includes(hLoc);
        if (!matchesBranch) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (h.name || "").toLowerCase().includes(q);
        const notesMatch = (h.notes || "").toLowerCase().includes(q);
        const locMatch = (h.branch_location || "").toLowerCase().includes(q);
        if (!nameMatch && !notesMatch && !locMatch) return false;
      }
      return true;
    });
  }, [holidays, branchFilter, searchQuery]);

  // Function to add / assign a holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();

    if (!newHoliday.name?.trim() || !newHoliday.date) {
      toast.error("Please provide both holiday name and date.");
      return;
    }

    const isWorkingDay = Boolean(newHoliday.is_working_day || newHoliday.type === 'Working Day');
    const holidayName = newHoliday.name.trim();
    const branchLabel = newHoliday.branch_location === "All" ? "All Branches" : newHoliday.branch_location;
    const loadingToast = toast.loading(
      isWorkingDay
        ? `Assigning "${holidayName}" as working day for ${branchLabel}...`
        : `Publishing "${holidayName}" for ${branchLabel}...`
    );

    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...newHoliday,
        name: holidayName,
        is_working_day: isWorkingDay
      };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success(
          isWorkingDay
            ? `Assigned "${holidayName}" as an active working day for ${branchLabel}!`
            : `Holiday "${holidayName}" published for ${branchLabel}!`
        );
        setNewHoliday({
          name: '',
          date: '',
          type: 'Public',
          dept: 'All',
          branch_location: 'All',
          is_working_day: false,
          notes: ''
        });
        fetchHolidays();
        window.dispatchEvent(new Event("holiday-updated"));
        localStorage.setItem("holiday_last_updated", String(Date.now()));
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.error || "Failed to save holiday");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error saving data:", error);
      toast.error("Error connecting to server to save holiday.");
    }
  };

  // Function to reassign / toggle working day status
  const toggleWorkingDay = async (h) => {
    const isCurrentlyWorkingDay = Boolean(h.is_working_day || h.type === 'Working Day');
    const willBeWorkingDay = !isCurrentlyWorkingDay;

    const loadingToast = toast.loading(
      willBeWorkingDay
        ? `Reassigning "${h.name}" as Working Day...`
        : `Reverting "${h.name}" to Holiday Off-Day...`
    );

    try {
      setTogglingId(h.id);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/${h.id}/toggle-working-day`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success(
          willBeWorkingDay
            ? `Reassigned "${h.name}" as Assigned Working Day!`
            : `Reassigned "${h.name}" as Holiday Off-Day!`
        );
        await fetchHolidays();
        window.dispatchEvent(new Event("holiday-updated"));
        localStorage.setItem("holiday_last_updated", String(Date.now()));
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.error || "Failed to update holiday status");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error toggling working day:", error);
      toast.error("Error updating holiday status.");
    } finally {
      setTogglingId(null);
    }
  };

  // Prompt delete via interactive Toast
  const handleDeleteClick = (h) => {
    toast(
      (t) => (
        <div className="d-flex flex-column gap-2 text-xs py-1" style={{ minWidth: "220px" }}>
          <div className="fw-bold text-slate-800">
            Delete {h.name || "this holiday"}?
          </div>
          <div className="text-[11px] text-slate-500">
            Branch: {h.branch_location || "All Branches"}
          </div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeDeleteHoliday(h.id, h.name);
              }}
              className="btn btn-danger btn-sm rounded-pill px-3 py-0.5 text-[11px] fw-bold shadow-xs"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="btn btn-light btn-sm rounded-pill px-3 py-0.5 text-[11px] fw-semibold text-slate-600 border"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 6000 }
    );
  };

  // Execute deletion
  const executeDeleteHoliday = async (id, holidayName) => {
    const loadingToast = toast.loading(`Deleting "${holidayName || 'holiday'}"...`);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success(`"${holidayName || 'Holiday'}" deleted successfully!`);
        fetchHolidays();
        window.dispatchEvent(new Event("holiday-updated"));
        localStorage.setItem("holiday_last_updated", String(Date.now()));
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.error || "Failed to delete holiday");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error deleting holiday:", error);
      toast.error("Error deleting holiday. Please try again.");
    }
  };

  return (
    <Container className="py-4 px-3 px-md-4 max-w-7xl" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Row className="g-4">
        {/* Left Side: Form */}
        <Col lg={4}>
          <Card className="shadow-sm p-4 border-0 rounded-4 bg-white">
            <h5 className="fw-bold mb-2 text-dark d-flex align-items-center gap-2">
              <LuCalendar className="text-primary" /> Add / Assign Holiday
            </h5>
            <p className="text-muted text-xs mb-4">
              Publish branch-specific holidays or company-wide observances. Changes automatically synchronize to attendance and schedules.
            </p>
            <Form onSubmit={handleAddHoliday}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Holiday / Event Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Ganesh Chaturthi, Gudi Padwa, Durga Puja"
                  value={newHoliday.name}
                  className='text-xs'
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Date</Form.Label>
                <Form.Control
                  type="date"
                  value={newHoliday.date}
                  className='text-xs'
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  required
                />
              </Form.Group>

              {/* Branch / Location Picker */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                  <LuMapPin className="text-primary" size={13} /> Branch / Location Schedule
                </Form.Label>
                <Form.Select
                  value={newHoliday.branch_location}
                  className='text-xs'
                  onChange={(e) => setNewHoliday({ ...newHoliday, branch_location: e.target.value })}
                >
                  {BRANCH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted text-[10px]">
                  Select "All Branches" for national/universal holidays, or pin to a specific regional office.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Applicable Department</Form.Label>
                <Form.Select
                  value={newHoliday.dept}
                  className='text-xs'
                  onChange={(e) => setNewHoliday({ ...newHoliday, dept: e.target.value })}
                >
                  <option value="All">All Departments (Branch-wide)</option>
                  <option value="Human Resources (HR)">Human Resources (HR)</option>
                  <option value="Engineering / Tech">Engineering / Tech</option>
                  <option value="Accounts & Finance">Accounts & Finance</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Administration & Facilities">Administration & Facilities</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Category / Type</Form.Label>
                <Form.Select
                  value={newHoliday.type}
                  className='text-xs'
                  onChange={(e) => {
                    const isW = e.target.value === "Working Day";
                    setNewHoliday({
                      ...newHoliday,
                      type: e.target.value,
                      is_working_day: isW ? true : newHoliday.is_working_day
                    });
                  }}
                >
                  <option value="Public">Public Holiday</option>
                  <option value="National">National Holiday</option>
                  <option value="Festival">Festival Holiday</option>
                  <option value="Company">Company Holiday</option>
                  <option value="Gazetted">Gazetted Holiday</option>
                  <option value="Optional">Optional / Restricted</option>
                  <option value="Working Day">Assigned Working Day (Office Open)</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Notes / Description (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="e.g. State-level holiday, regional festivity observance"
                  value={newHoliday.notes}
                  className="text-xs"
                  onChange={(e) => setNewHoliday({ ...newHoliday, notes: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Check
                  type="switch"
                  className='text-[11px]'
                  id="custom-switch-working-day"
                  label="Assign as Working Day (Office Open)"
                  checked={Boolean(newHoliday.is_working_day || newHoliday.type === "Working Day")}
                  onChange={(e) => setNewHoliday({
                    ...newHoliday,
                    is_working_day: e.target.checked,
                    type: e.target.checked ? "Working Day" : (newHoliday.type === "Working Day" ? "Company" : newHoliday.type)
                  })}
                />
                <Form.Text className="text-muted text-[10px]">
                  When active, staff report for shift duty and punch-ins receive standard presence credit.
                </Form.Text>
              </Form.Group>

              <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold text-sm shadow-sm py-2">
                Publish Branch Holiday
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right Side: Table & Branch Filters */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden bg-white">
            <Card.Header className="bg-white py-3 border-bottom">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <h5 className="fw-bold m-0 text-dark">Branch Holiday Schedules</h5>
                  <small className="text-muted text-xs">Manage location-specific and universal holiday rosters</small>
                </div>
                <div className="d-flex items-center gap-2">
                  <Badge bg="primary" className="rounded-pill px-3 py-2 text-xs">
                    {filteredHolidays.length} of {holidays.length} Holidays
                  </Badge>
                </div>
              </div>

              {/* Branch Filter Tabs & Search Bar */}
              <div className="mt-3 pt-3 border-top d-flex flex-column flex-md-row gap-2.5 align-items-md-center justify-content-between">
                {/* Branch Select */}
                <div className="d-flex items-center gap-2 flex-grow-1 max-w-sm">
                  <LuMapPin className="text-muted flex-shrink-0" size={14} />
                  <Form.Select
                    size="sm"
                    className="text-xs rounded-pill"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                  >
                    <option value="All">All Locations (Universal + Regional)</option>
                    <option value="Kolkata">Kolkata (HQ)</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Odisha">Odisha</option>
                    <option value="International - Dubai">International - Dubai (UAE)</option>
                    <option value="International - London">International - London (UK)</option>
                  </Form.Select>
                </div>

                {/* Search */}
                <div className="relative" style={{ minWidth: "220px" }}>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Search holiday name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs rounded-pill ps-4"
                  />
                  <LuSearch size={12} className="text-muted position-absolute" style={{ left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                </div>
              </div>
            </Card.Header>

            <Table responsive hover className="mb-0">
              <thead className="table-light text-uppercase text-[11px] font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Holiday / Description</th>
                  <th className="py-3">Branch Location</th>
                  <th className="py-3">Date & Day</th>
                  <th className="py-3">Dept</th>
                  <th className="py-3">Status / Type</th>
                  <th className="text-center py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.length > 0 ? filteredHolidays.map((h) => {
                  const isWorkingDay = Boolean(h.is_working_day || h.type === 'Working Day');
                  return (
                    <tr key={h.id} className="align-middle">
                      <td className="px-4">
                        <div className="fw-bold text-dark text-sm">{h.name}</div>
                        {h.notes && <div className="text-[11px] text-muted line-clamp-1">{h.notes}</div>}
                      </td>
                      <td>
                        {getBranchBadge(h.branch_location)}
                      </td>
                      <td className="text-slate-600 text-xs font-medium">
                        {h.dateStr ? new Date(`${h.dateStr}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : h.date}
                        <div className="text-[11px] text-muted">{h.day}</div>
                      </td>
                      <td>
                        <span className={`badge rounded-pill text-[11px] ${h.dept && h.dept !== 'All' ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-secondary-subtle text-secondary'}`}>
                          {h.dept || 'All'}
                        </span>
                      </td>
                      <td>
                        {isWorkingDay ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill text-[11px] font-bold d-inline-flex align-items-center gap-1">
                            <LuBriefcase size={11} /> Working Day
                          </span>
                        ) : (
                          <Badge bg={h.type === 'Public' ? 'success' : h.type === 'National' ? 'primary' : h.type === 'Festival' ? 'warning' : 'info'} className="text-[11px]">
                            {h.type || 'Holiday'}
                          </Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="d-flex items-center justify-content-center gap-1.5">
                          <Button
                            variant={isWorkingDay ? "outline-warning" : "outline-success"}
                            size="sm"
                            className="rounded-pill px-2.5 py-1 text-[10px] font-semibold"
                            disabled={togglingId === h.id}
                            onClick={() => toggleWorkingDay(h)}
                            title={isWorkingDay ? "Revert to Holiday (Off-day)" : "Assign as Working Day"}
                          >
                            {isWorkingDay ? "Revert" : "Assign Working"}
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill px-2 py-1 text-xs"
                            onClick={() => handleDeleteClick(h)}
                            title="Delete holiday"
                          >
                            <LuTrash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted fst-italic">
                      No holidays match the selected location or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HolidayManager;
