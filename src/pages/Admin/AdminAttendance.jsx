import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Table,
  Container,
  Spinner,
  Badge,
  Row,
  Col,
  Card,
} from "react-bootstrap";

const AdminAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5007/api/attendance",
        );
        setAttendanceData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const totalEmployees = attendanceData.length;
  const presentCount = attendanceData.filter(
    (item) => item.status === "Present" || item.status === "Late Present",
  ).length;
  const lateCount = attendanceData.filter(
    (item) => item.status === "Late Present",
  ).length;
  const absentCount = attendanceData.filter(
    (item) => item.status === "Absent",
  ).length;

  return (
    <Container className="mt-3 mt-md-4 px-2 px-md-3">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-2 text-center text-md-start">
        <h2
          className="mb-0 text-primary fw-bold"
          style={{ fontSize: "calc(1.3rem + 0.6vw)" }}
        >
          Attendance Records
        </h2>
        {!loading && (
          <Badge bg="dark" className="p-2 px-3 rounded-pill shadow-sm">
            Total: {totalEmployees}
          </Badge>
        )}
      </div>

      {!loading && attendanceData.length > 0 && (
        <Row className="mb-4 g-2 g-md-3">
          {/* Summary Cards - Mobile-e 2ti kore thakbe */}
          <Col xs={6} md={3}>
            <SummaryCard title="Present" count={presentCount} color="success" />
          </Col>
          <Col xs={6} md={3}>
            <SummaryCard title="Late" count={lateCount} color="warning" />
          </Col>
          <Col xs={6} md={3}>
            <SummaryCard title="Absent" count={absentCount} color="danger" />
          </Col>
          <Col xs={6} md={3}>
            <Card className="text-center shadow-sm border-0 rounded-4 p-2 p-md-3 bg-primary text-white h-100 justify-content-center">
              <div
                className="small mb-1 fw-bold text-uppercase opacity-75"
                style={{ fontSize: "10px" }}
              >
                Rate
              </div>
              <h4 className="fw-bold m-0">
                {totalEmployees > 0
                  ? ((presentCount / totalEmployees) * 100).toFixed(0)
                  : 0}
                %
              </h4>
            </Card>
          </Col>
        </Row>
      )}

      {loading ? (
        <div className="d-flex justify-content-center mt-5 py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <div className="shadow-sm rounded-4 border bg-white overflow-hidden">
          {/* Table wrapper for horizontal scroll on small screens */}
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-dark">
                <tr>
                  <th className="py-3 ps-3 text-nowrap">Employee</th>
                  <th className="text-nowrap">Date</th>
                  <th className="text-nowrap">In/Out</th>
                  <th className="text-center text-nowrap">Late</th>
                  <th className="text-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  attendanceData.map((item, index) => (
                    <tr key={item._id || index}>
                      <td className="ps-3">
                        <div className="fw-bold text-dark text-nowrap">
                          {item.userId?.name || "N/A"}
                        </div>
                        <small className="text-muted d-md-none">
                          #{index + 1}
                        </small>
                      </td>
                      <td className="text-nowrap small">{item.date}</td>
                      <td>
                        <div className="text-success small fw-bold">
                          {item.checkIn || "--"}
                        </div>
                        <div className="text-danger small fw-bold">
                          {item.checkOut || "--"}
                        </div>
                      </td>
                      <td className="text-center">
                        <Badge
                          bg={item.lateCount > 0 ? "danger" : "secondary"}
                          className="rounded-pill"
                          style={{ fontSize: "10px" }}
                        >
                          {item.lateCount}
                        </Badge>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Custom CSS for Mobile optimization */}
      <style>{`
        @media (max-width: 576px) {
          .table td, .table th {
            padding: 10px 8px !important;
            font-size: 13px;
          }
          .badge {
            font-size: 11px;
            padding: 5px 8px !important;
          }
        }
      `}</style>
    </Container>
  );
};

const SummaryCard = ({ title, count, color }) => (
  <Card className="text-center shadow-sm border-0 rounded-4 p-2 p-md-3 bg-white h-100 justify-content-center">
    <div
      className={`text-muted small mb-1 fw-bold text-uppercase`}
      style={{ fontSize: "10px" }}
    >
      {title}
    </div>
    <h4 className={`text-${color} fw-bold m-0`}>{count}</h4>
  </Card>
);

const StatusBadge = ({ status }) => {
  let config = { bg: "secondary-subtle", text: "secondary", label: status };
  if (status === "Present")
    config = { bg: "success-subtle", text: "success", label: "P" }; // Mobile-e space bachatay short form use kora hoyeche (Optional)
  if (status === "Late Present")
    config = { bg: "warning-subtle", text: "dark", label: "Late" };
  if (status === "Absent")
    config = { bg: "danger-subtle", text: "danger", label: "A" };

  return (
    <Badge
      bg={config.bg}
      text={config.text}
      className={`px-2 py-1 border border-${config.text} text-uppercase`}
      style={{ fontSize: "10px" }}
    >
      {config.label === "P"
        ? "Present"
        : config.label === "A"
          ? "Absent"
          : config.label}
    </Badge>
  );
};

export default AdminAttendance;
