import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge } from 'react-bootstrap';
import { getApiBaseUrl } from '../../api/axios';

const HolidayManager = () => {
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public' });

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

  // Function to add a new holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newHoliday),
      });

      if (response.ok) {
        setNewHoliday({ name: '', date: '', type: 'Public' });
        fetchHolidays(); // Refresh table after saving
        // Broadcast live update event
        window.dispatchEvent(new Event("holiday-updated"));
        localStorage.setItem("holiday_last_updated", String(Date.now()));
      } else {
        console.error("Server returned an error");
      }
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  // Function to delete a holiday
  const deleteHoliday = async (id) => {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (response.ok) {
          fetchHolidays();
          // Broadcast live update event
          window.dispatchEvent(new Event("holiday-updated"));
          localStorage.setItem("holiday_last_updated", String(Date.now()));
        }
      } catch (error) {
        console.error("Error deleting holiday:", error);
      }
    }
  };

  return (
    <Container className="py-5">
      <Row className="g-4">
        {/* Left Side: Form */}
        <Col lg={4}>
          <Card className="shadow-lg p-4 border-0 rounded-4">
            <h5 className="fw-bold mb-4 text-primary">
               <i className="bi bi-calendar-plus me-2"></i>Add Holiday
            </h5>
            <Form onSubmit={handleAddHoliday}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Holiday Name</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="e.g. Christmas Day"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                  required 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Date</Form.Label>
                <Form.Control 
                  type="date" 
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
                  required 
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold">Type</Form.Label>
                <Form.Select 
                  value={newHoliday.type}
                  onChange={(e) => setNewHoliday({...newHoliday, type: e.target.value})}
                >
                  <option value="Public">Public Holiday</option>
                  <option value="Gazetted">Gazetted</option>
                  <option value="Optional">Optional</option>
                </Form.Select>
              </Form.Group>
              <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold shadow-sm">
                Publish Holiday
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right Side: Table */}
        <Col lg={8}>
          <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
            <Card.Header className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">Upcoming Holidays List</h5>
              <Badge bg="primary" className="rounded-pill px-3 py-2">{holidays.length} Records</Badge>
            </Card.Header>
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Holiday</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Type</th>
                  <th className="text-center py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length > 0 ? holidays.map((h) => (
                  <tr key={h.id} className="align-middle">
                    <td className="px-4 fw-bold text-secondary">{h.name}</td>
                    <td>{h.dateStr ? new Date(`${h.dateStr}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : h.date}</td>
                    <td>
                      <Badge bg={h.type === 'Public' ? 'success' : h.type === 'Gazetted' ? 'warning' : 'info'}>
                        {h.type}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        className="rounded-pill px-3"
                        onClick={() => deleteHoliday(h.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted italic">
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