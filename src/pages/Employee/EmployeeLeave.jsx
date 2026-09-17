import React, { useState, useEffect } from "react";
import {
  Table, Button, Container, Spinner, Badge,
  Card, OverlayTrigger, Tooltip, Modal, Form
} from "react-bootstrap";
import toast from "react-hot-toast";

const API = "http://localhost:5003/api";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
};

const EmployeeLeavePortal = () => {
  const [showModal, setShowModal]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [newLeave, setNewLeave]           = useState({
    employeeName: "", leaveType: "CL", fromDate: "", toDate: "", reason: ""
  });

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/leaves`);
      const data = await res.json();
      setLeaveRequests(data);
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (from, to) => {
    if (!from || !to) return 0;
    const diff = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleApply = async (e) => {
    e.preventDefault();
    const totalDays = calculateDays(newLeave.fromDate, newLeave.toDate);
    if (totalDays <= 0) { toast.error("To Date must be after From Date!"); return; }

    try {
      const res = await fetch(`${API}/apply-leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: newLeave.employeeName,
          leaveType:    newLeave.leaveType,
          fromDate:     newLeave.fromDate,
          toDate:       newLeave.toDate,
          totalDays,
          reason:       newLeave.reason,
        }),
      });
      const msg = await res.text();
      toast.success(msg || "Leave application submitted successfully!");
      setNewLeave({ employeeName: "", leaveType: "CL", fromDate: "", toDate: "", reason: "" });
      setShowModal(false);
      fetchLeaves();
    } catch (err) {
      console.error("Failed to apply leave:", err);
      toast.error("Something went wrong. Please try again!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave application?")) return;
    try {
      const res  = await fetch(`${API}/leave-delete/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Leave application deleted successfully!");
        fetchLeaves();
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  return (
    <Container className="py-4 px-2 px-md-4">

      <Card className="shadow-sm border-0 rounded-4 overflow-hidden">

        {/* Header */}
        <Card.Header className="bg-white py-3 border-0">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <div>
              <h4 className="mb-0 fw-bold text-dark">Leave Applications</h4>
              <p className="text-muted small mb-0">
                Track your leave status and submit new requests
              </p>
            </div>

          <Button
  variant="primary"
  className="rounded-pill px-4 fw-bold w-80 w-md-auto"
  style={{ marginTop: "3px" }}
  onClick={() => setShowModal(true)}
>
              + Apply New Leave
            </Button>
          </div>
        </Card.Header>

        {/* Loader */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted small">Loading leave applications...</p>
          </div>
        ) : (
          <div className="table-responsive">

            <Table hover className="align-middle mb-0 small">

              <thead className="bg-light">
                <tr className="text-secondary small text-uppercase">
                  <th className="ps-4 border-0">Employee</th>
                  <th className="border-0">Type</th>
                  <th className="border-0">From</th>
                  <th className="border-0">To</th>
                  <th className="border-0">Days</th>
                  <th className="border-0 d-none d-md-table-cell">Reason</th>
                  <th className="border-0 text-center">Status</th>
                  <th className="border-0 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      No leave applications found.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((req) => (
                    <tr key={req.id}>

                      <td className="ps-4 py-3">
                        <div className="fw-bold text-dark small">
                          {req.employee_name || "N/A"}
                        </div>
                      </td>

                      <td>
                        <Badge bg="info" className="text-white">
                          {req.leave_type}
                        </Badge>
                      </td>

                      <td className="small">{formatDate(req.from_date)}</td>
                      <td className="small">{formatDate(req.to_date)}</td>

                      <td className="small text-muted">
                        {req.total_days} Days
                      </td>

                      {/* Hide in mobile */}
                      <td className="d-none d-md-table-cell">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{req.reason}</Tooltip>}
                        >
                          <div
                            className="text-truncate text-muted small"
                            style={{ maxWidth: "150px" }}
                          >
                            {req.reason}
                          </div>
                        </OverlayTrigger>
                      </td>

                      <td className="text-center">
                        <Badge bg={
                          req.status === "Approved" ? "success" :
                          req.status === "Rejected" ? "danger" : "warning"
                        }>
                          {req.status}
                        </Badge>
                      </td>

                      <td className="text-center">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          className="w-100"
                          onClick={() => handleDelete(req.id)}
                        >
                          🗑 Delete
                        </Button>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>

            </Table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Apply for Leave</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleApply}>

            <Form.Group className="mb-3">
              <Form.Label>Employee Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your full name"
                required
                value={newLeave.employeeName}
                onChange={(e) => setNewLeave({ ...newLeave, employeeName: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Leave Type</Form.Label>
              <Form.Select
                value={newLeave.leaveType}
                onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
              >
                <option value="CL">Casual Leave (CL)</option>
                <option value="SL">Sick Leave (SL)</option>
                <option value="EL">Earned Leave (EL)</option>
                <option value="HL">Public Holiday (HL)</option>
                <option value="LOP">Loss of Pay (LOP)</option>
                <option value="ML">Maternity Leave (ML)</option>
                <option value="PL">Paternity Leave (PL)</option>
                <option value="CO">Comp Off (CO)</option>
                <option value="BL">Bereavement Leave (BL)</option>
              </Form.Select>
            </Form.Group>

            {/* Responsive date */}
            <div className="d-flex flex-column flex-md-row gap-2">
              <Form.Group className="mb-3 flex-fill">
                <Form.Label>From Date</Form.Label>
                <Form.Control
                  type="date"
                  required
                  value={newLeave.fromDate}
                  onChange={(e) => setNewLeave({ ...newLeave, fromDate: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3 flex-fill">
                <Form.Label>To Date</Form.Label>
                <Form.Control
                  type="date"
                  required
                  value={newLeave.toDate}
                  onChange={(e) => setNewLeave({ ...newLeave, toDate: e.target.value })}
                />
              </Form.Group>
            </div>

            {newLeave.fromDate && newLeave.toDate && (
              <div className="alert alert-info py-2 small mb-3">
                Total Leave Days:
                <strong> {calculateDays(newLeave.fromDate, newLeave.toDate)} Day(s)</strong>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Reason for Leave</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Please provide a reason for your leave request..."
                required
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
              />
            </Form.Group>

            {/* Responsive buttons */}
            <div className="d-flex flex-column flex-md-row gap-2">
              <Button
                variant="secondary"
                className="w-100"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>

              <Button type="submit" variant="primary" className="w-100">
                Submit Application
              </Button>
            </div>

          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default EmployeeLeavePortal;