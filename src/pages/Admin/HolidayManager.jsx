import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge } from 'react-bootstrap';
import { getApiBaseUrl } from '../../api/axios';
import { LuCalendarCheck, LuBriefcase, LuTrash2, LuCalendar, LuSparkles } from 'react-icons/lu';
import toast from 'react-hot-toast';

const HolidayManager = () => {
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    type: 'Public',
    dept: 'All',
    is_working_day: false
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

  // Function to add / assign a holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();

    if (!newHoliday.name?.trim() || !newHoliday.date) {
      toast.error("Please provide both holiday name and date.");
      return;
    }

    const isWorkingDay = Boolean(newHoliday.is_working_day || newHoliday.type === 'Working Day');
    const holidayName = newHoliday.name.trim();
    const loadingToast = toast.loading(isWorkingDay ? `Assigning "${holidayName}" as working day...` : `Publishing "${holidayName}"...`);

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
            ? `Assigned "${holidayName}" as an active working day!`
            : `Holiday "${holidayName}" published successfully!`
        );
        setNewHoliday({ name: '', date: '', type: 'Public', dept: 'All', is_working_day: false });
        fetchHolidays(); // Refresh table after saving
        // Broadcast live update event
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
            ? `Reassigned "${h.name}" as Assigned Working Day (Company Open)!`
            : `Reassigned "${h.name}" as Holiday Off-Day (Company Closed)!`
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

  // Function to prompt delete via interactive Toast (replaces native alert/confirm dialog)
  const handleDeleteClick = (h) => {
    toast(
      (t) => (
        <div className="d-flex flex-column gap-2 text-xs py-1" style={{ minWidth: "220px" }}>
          <div className="fw-bold text-slate-800">
            Delete {h.name || "this holiday"}?
          </div>
          {/* <div className="text-[11px] text-slate-500">
            {h.dateStr ? new Date(`${h.dateStr}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : h.date}
          </div> */}
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

  // Function to execute deletion
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
        // Broadcast live update event
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
    <Container className="py-3 px-4 max-w-7xl" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Row className="g-4">
        {/* Left Side: Form */}
        <Col lg={3}>
          <Card className="shadow-sm p-4 border-0 rounded-4 bg-white">
            <h5 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2">
              <LuCalendar className="text-primary" /> Add / Assign Holiday
            </h5>
            <p className="text-muted text-xs mb-4">
              Prelist company holidays or assign working days. Changes instantly sync to Holiday Calendar and Attendance.
            </p>
            <Form onSubmit={handleAddHoliday}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Holiday / Event Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Gandhi Jayanti or Special Working Day"
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
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Applicable Department</Form.Label>
                <Form.Select
                  value={newHoliday.dept} className='text-xs'
                  onChange={(e) => setNewHoliday({ ...newHoliday, dept: e.target.value })}
                >
                  <option value="All">All Departments (Company-wide)</option>
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
                  value={newHoliday.type} className='text-xs'
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
                  <option value="Gazetted">Gazetted</option>
                  <option value="Optional">Optional</option>
                  <option value="Working Day">Assigned Working Day (Office Open)</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Check
                  type="switch" className='text-[11px]'
                  id="custom-switch-working-day"
                  label="Assign as Working Day (Company Open)"
                  checked={Boolean(newHoliday.is_working_day || newHoliday.type === "Working Day")}
                  onChange={(e) => setNewHoliday({
                    ...newHoliday,
                    is_working_day: e.target.checked,
                    type: e.target.checked ? "Working Day" : (newHoliday.type === "Working Day" ? "Company" : newHoliday.type)
                  })}
                />
                <Form.Text className="text-muted text-[10px]">
                  When enabled, this day is counted as a working day and employees receive presence credit.
                </Form.Text>
              </Form.Group>
              <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold text-sm shadow-sm py-2">
                Publish Holiday
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right Side: Table */}
        <Col lg={9}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden bg-white">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold m-0 text-dark">Holidays & Assigned Working Days</h5>
                <small className="text-muted text-xs">Manage office off-days and working days</small>
              </div>
              <Badge bg="primary" className="rounded-pill px-3 py-2">{holidays.length} Records</Badge>
            </Card.Header>
            <Table responsive hover className="mb-0">
              <thead className="table-light text-uppercase text-[11px] font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Holiday / Day</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Dept</th>
                  <th className="py-3">Status / Type</th>
                  <th className="text-center py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length > 0 ? holidays.map((h) => {
                  const isWorkingDay = Boolean(h.is_working_day || h.type === 'Working Day');
                  return (
                    <tr key={h.id} className="align-middle">
                      <td className="px-4">
                        <div className="fw-bold text-dark text-sm">{h.name}</div>
                        {h.notes && <div className="text-[11px] text-muted">{h.notes}</div>}
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
                            <LuBriefcase size={11} /> Assigned Working Day
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
                            {isWorkingDay ? "Revert to Holiday" : "Assign Working Day"}
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
                    <td colSpan="5" className="text-center py-5 text-muted fst-italic">
                      No holidays found in the list.
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
