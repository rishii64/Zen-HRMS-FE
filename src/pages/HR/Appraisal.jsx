import React, { useState, useEffect } from 'react';
import {
  Container, Card, Row, Col, ProgressBar, Table, Badge,
  Dropdown, Button, Modal, Form, Alert
} from 'react-bootstrap';

const API = 'http://localhost:5020/api/appraisals';
const CURRENT_USER = { name: 'HR Admin', role: 'HR' };

const performanceColors = {
  Excellent: 'success',
  Good:      'primary',
  Average:   'warning',
  Poor:      'danger',
};

const statusColors = {
  Pending:   { bg: 'warning', text: 'dark' },
  Confirmed: { bg: 'success', text: undefined },
  Rejected:  { bg: 'danger',  text: undefined },
};

const emptyForm = {
  employee_name: '',
  department: '',
  appraisal_date: '',
  performance: 'Good',
  remarks: '',
};

const AppraisalHR = () => {
  const [viewType, setViewType] = useState('Appraisal');
  const [appraisals, setAppraisals] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [formModal, setFormModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isHR = CURRENT_USER.role === 'HR';

  const showAlert = (variant, msg) => {
    setAlert({ variant, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const fetchData = async () => {
    setFetching(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setAppraisals(Array.isArray(data) ? data : []);
    } catch {
      showAlert('danger', '❌ Could not connect to the server.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAppraisals(prev => [json, ...prev]);
      setForm(emptyForm);
      setFormModal(false);
      showAlert('success', '✅ Appraisal added successfully!');
    } catch (err) {
      showAlert('danger', '❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!confirmModal) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${confirmModal.appraisal.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: confirmModal.action }),
      });
      if (!res.ok) throw new Error('Update failed');
      
      setAppraisals(prev =>
        prev.map(a => a.id === confirmModal.appraisal.id ? { ...a, status: confirmModal.action } : a)
      );
      showAlert('success', `✅ Status updated to ${confirmModal.action}.`);
    } catch (err) {
      showAlert('danger', '❌ ' + err.message);
    } finally {
      setSaving(false);
      setConfirmModal(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setAppraisals(prev => prev.filter(a => a.id !== id));
      showAlert('success', '🗑️ Record removed.');
    } catch (err) {
      showAlert('danger', '❌ ' + err.message);
    }
  };

  const pendingCount = appraisals.filter(a => a.status === 'Pending').length;
  const confirmedCount = appraisals.filter(a => a.status === 'Confirmed').length;
  const rejectedCount = appraisals.filter(a => a.status === 'Rejected').length;
  const avgScore = appraisals.length
    ? (appraisals.filter(a => a.performance === 'Excellent').length / appraisals.length * 5).toFixed(1)
    : '0.0';

  if (!isHR) {
    return (
      <Container className="py-5 text-center">
        <h4 className="text-danger">Access Denied</h4>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold m-0 text-primary">HR Appraisal Panel</h4>
          <p className="text-muted small mb-0">Management & Verification Portal</p>
        </div>

        <div className="d-flex gap-2">
          <Dropdown onSelect={(e) => setViewType(e)}>
            <Dropdown.Toggle variant="outline-primary" className="rounded-pill px-4">
              {viewType === 'Appraisal' ? 'Appraisal List' : 'Confirmations'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item eventKey="Appraisal">Performance List</Dropdown.Item>
              <Dropdown.Item eventKey="Confirmation">Pending & History</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          {viewType === 'Appraisal' && (
            <Button variant="primary" className="rounded-pill px-4" onClick={() => setFormModal(true)}>
              + New Appraisal
            </Button>
          )}
        </div>
      </div>

      {alert && <Alert variant={alert.variant}>{alert.msg}</Alert>}

      {viewType === 'Appraisal' ? (
        <Row className="g-4">
          <Col lg={3}>
            <Card className="border-0 shadow-sm rounded-4 p-4 text-center">
              <h6 className="text-muted fw-bold mb-3">Overall Excellence</h6>
              <div className="display-4 fw-bold text-primary mb-1">{avgScore}</div>
              <ProgressBar variant="primary" now={(avgScore / 5) * 100} className="mb-3" style={{ height: 10 }} />
              <div className="d-flex justify-content-around text-center small">
                <div className="text-warning"><b>{pendingCount}</b><br/>Pending</div>
                <div className="text-success"><b>{confirmedCount}</b><br/>Confirmed</div>
                <div className="text-danger"><b>{rejectedCount}</b><br/>Rejected</div>
              </div>
            </Card>
          </Col>
          <Col lg={9}>
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="bg-light small text-uppercase">
                  <tr>
                    <th>Employee</th><th>Dept</th><th>Rating</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {appraisals.map(a => (
                    <tr key={a.id}>
                      <td><b>{a.employee_name}</b></td>
                      <td>{a.department}</td>
                      <td><Badge bg={performanceColors[a.performance]}>{a.performance}</Badge></td>
                      <td><Badge bg={statusColors[a.status]?.bg} text={statusColors[a.status]?.text}>{a.status}</Badge></td>
                      <td>
                        <Button variant="link" className="text-danger p-0 text-decoration-none" onClick={() => handleDelete(a.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>
      ) : (
        /* Confirmation & History View */
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="bg-dark text-white small">
              <tr>
                <th className="py-3 ps-4">Employee</th>
                <th>Rating</th>
                <th>Current Status</th>
                <th className="text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.map(a => (
                <tr key={a.id}>
                  <td className="ps-4">
                    <div className="fw-bold">{a.employee_name}</div>
                    <div className="text-muted small">{a.department}</div>
                  </td>
                  <td><Badge bg={performanceColors[a.performance]}>{a.performance}</Badge></td>
                  <td>
                    <Badge bg={statusColors[a.status]?.bg} text={statusColors[a.status]?.text}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className = "text-center">
                    {a.status === 'Pending' ? (
                      <div className="d-flex gap-2 justify-content-center">
                        <Button size="sm" variant="success" onClick={() => setConfirmModal({ appraisal: a, action: 'Confirmed' })}>Approve</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setConfirmModal({ appraisal: a, action: 'Rejected' })}>Reject</Button>
                      </div>
                    ) : (
                      <span className="text-muted small">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Form Modal */}
      <Modal show={formModal} onHide={() => setFormModal(false)} centered>
        <Modal.Header closeButton className="border-0"><b>New Appraisal Record</b></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAdd}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Employee Name</Form.Label>
              <Form.Control type="text" required value={form.employee_name} onChange={e => setForm({...form, employee_name: e.target.value})} />
            </Form.Group>
            <Row>
                <Col><Form.Group className="mb-3"><Form.Label className="small fw-bold">Department</Form.Label><Form.Control type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></Form.Group></Col>
                <Col><Form.Group className="mb-3"><Form.Label className="small fw-bold">Date</Form.Label><Form.Control type="date" required value={form.appraisal_date} onChange={e => setForm({...form, appraisal_date: e.target.value})} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Performance Rating</Form.Label>
              <Form.Select value={form.performance} onChange={e => setForm({...form, performance: e.target.value})}>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Remarks</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100 rounded-pill py-2" disabled={saving}>
              {saving ? 'Saving...' : 'Submit Appraisal'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Decision Modal */}
      <Modal show={!!confirmModal} onHide={() => setConfirmModal(null)} centered size="sm">
        <Modal.Body className="text-center p-4">
          <p className="mb-4">Change status to <b>{confirmModal?.action}</b> for {confirmModal?.appraisal?.employee_name}?</p>
          <div className="d-flex gap-2">
            <Button variant="light" className="w-100" onClick={() => setConfirmModal(null)}>Cancel</Button>
            <Button variant={confirmModal?.action === 'Confirmed' ? 'success' : 'danger'} className="w-100" onClick={handleStatusUpdate}>Confirm</Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AppraisalHR;