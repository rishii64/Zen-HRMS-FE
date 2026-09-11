import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Card } from "react-bootstrap";

const EMPTY_FORM = {
  designation: "",
  jobRole: "",
  department: "",
  employmentType: "Full-time",
  dateOfHiring: "",
  status: "Open",
  experience: "",
  minQualification: "",
  preferredQualification: "",
  additionalSkills: "",
  basicSalary: "",
  hra: "",
  medical: "",
  transport: "",
  bonus: "",
};

const Recruitment = () => {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateGrossSalary = () => {
    const basic = parseFloat(formData.basicSalary) || 0;
    const hra = parseFloat(formData.hra) || 0;
    const med = parseFloat(formData.medical) || 0;
    const trans = parseFloat(formData.transport) || 0;
    const bonus = parseFloat(formData.bonus) || 0;

    return (basic + hra + med + trans + bonus).toLocaleString("en-IN");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Recruitment Data:", formData);
    alert("Recruitment record saved successfully!");
  };

  const handleReset = () => {
    setFormData(EMPTY_FORM);
  };

  const steps = [
    "Job details",
    "Qualification",
    "Salary structure",
    "Review & submit",
  ];

  return (
    <div className="bg-light min-vh-100 py-4">
      <Container>
        {/* Header */}
        <div className="mb-4">
          <h3 className="fw-bold">Recruitment Service</h3>
          <p className="text-muted mb-3">
            New hiring process — fill in all required details
          </p>

          {/* Steps */}
          <div className="d-flex flex-wrap gap-2">
            {steps.map((step, i) => (
              <span
                key={i}
                className={`badge rounded-pill px-3 py-2 fs-6 ${
                  i === 0
                    ? "bg-primary text-white"
                    : "bg-white text-muted border"
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {/* Section 1 */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "15px" }}>
            <Card.Body className="p-4">
              <h6 className="text-uppercase text-muted fw-bold mb-3">
                Job Information
              </h6>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Employee Designation</Form.Label>
                    <Form.Select
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select designation</option>
                      <option>Software Engineer</option>
                      <option>HR Manager</option>
                      <option>Sales Executive</option>
                      <option>Accountant</option>
                      <option>Team Lead</option>
                      <option>Project Manager</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Job Role / Title</Form.Label>
                    <Form.Control
                      type="text"
                      name="jobRole"
                      placeholder="e.g. Backend Developer"
                      value={formData.jobRole}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Department</Form.Label>
                    <Form.Select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select department</option>
                      <option>Engineering</option>
                      <option>Human Resources</option>
                      <option>Finance</option>
                      <option>Sales</option>
                      <option>Operations</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Employment Type</Form.Label>
                    <Form.Select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleChange}
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Date of Hiring</Form.Label>
                    <Form.Control
                      type="date"
                      name="dateOfHiring"
                      value={formData.dateOfHiring}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Job Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option>Open</option>
                      <option>On hold</option>
                      <option>Closed</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Section 2 */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "15px" }}>
            <Card.Body className="p-4">
              <h6 className="text-uppercase text-muted fw-bold mb-3">
                Experience & Qualification
              </h6>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Required Experience</Form.Label>
                    <Form.Select
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select</option>
                      <option>Fresher (0 yr)</option>
                      <option>1–2 years</option>
                      <option>3–5 years</option>
                      <option>5–8 years</option>
                      <option>8+ years</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Minimum Qualification</Form.Label>
                    <Form.Select
                      name="minQualification"
                      value={formData.minQualification}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select</option>
                      <option>SSC / Equivalent</option>
                      <option>HSC / Equivalent</option>
                      <option>Diploma</option>
                      <option>Bachelor's degree</option>
                      <option>Master's degree</option>
                      <option>PhD</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Preferred Qualification</Form.Label>
                    <Form.Select
                      name="preferredQualification"
                      value={formData.preferredQualification}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      <option>B.Sc in CS / IT</option>
                      <option>BBA / MBA</option>
                      <option>B.Com / M.Com</option>
                      <option>B.Eng / M.Eng</option>
                      <option>Any discipline</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Additional Skills / Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="additionalSkills"
                      value={formData.additionalSkills}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Section 3 */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "15px" }}>
            <Card.Body className="p-4">
              <h6 className="text-uppercase text-muted fw-bold mb-3">
                Salary Structure
              </h6>

              <Row className="g-3">
                {[
                  { label: "Basic Salary", name: "basicSalary" },
                  { label: "HRA", name: "hra" },
                  { label: "Medical", name: "medical" },
                  { label: "Transport", name: "transport" },
                  { label: "Bonus", name: "bonus" },
                ].map((item) => (
                  <Col md={6} key={item.name}>
                    <Form.Control
                      type="number"
                      name={item.name}
                      placeholder="0"
                      value={formData[item.name]}
                      onChange={handleChange}
                    />
                  </Col>
                ))}
              </Row>

              <div className="mt-4 p-3 bg-primary bg-opacity-10 rounded-3 d-flex justify-content-between">
                <span className="fw-bold text-primary">Gross Salary</span>
                <span className="fw-bold text-primary">
                  ₹ {calculateGrossSalary()}
                </span>
              </div>
            </Card.Body>
          </Card>

          {/* Buttons */}
          <div className="d-flex gap-3">
            <Button type="submit" variant="primary">
              Save & Submit
            </Button>

            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </Form>
      </Container>
    </div>
  );
};

export default Recruitment;