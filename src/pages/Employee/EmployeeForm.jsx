import React, { useState } from "react";
import { Form, Button, Card, Container, Row, Col } from "react-bootstrap";

/**
 * @param {Function} onSubmitData - ফরম সাবমিট করলে এই ফাংশনটি কল হবে এবং পুরো FormData অবজেক্টটি পাঠাবে।
 */
const EmployeeForm = ({ onSubmitData }) => {
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    email: "",
    phone: "",
    dob: "",
    address: "",
    department: "",
    designation: "",
    joinDate: "",
    emergencyContact: "",
    bloodGroup: "",
    religion: "",
    maritalStatus: "",
    languageKnown: [],
  });

  const [educationList, setEducationList] = useState([
    { degree: "", college: "", university: "", percentage: "", marksheet: null },
  ]);

  const [experienceList, setExperienceList] = useState([
    {
      companyName: "",
      companyAddress: "",
      designation: "",
      startDate: "",
      endDate: "",
      jobRole: "",
      reportingManager: "",
      contactNumber: "",
      reasonForLeaving: "",
      employeeId: "",
      expCertificate: null,
    },
  ]);

  const [photoFile, setPhotoFile] = useState(null);
  const [govIdFile, setGovIdFile] = useState(null);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e, type, index = null) => {
    const file = e.target.files[0];
    if (type === "photo") setPhotoFile(file);
    if (type === "govId") setGovIdFile(file);

    if (type === "marksheet") {
      const list = [...educationList];
      list[index].marksheet = file;
      setEducationList(list);
    }

    if (type === "expCertificate") {
      const list = [...experienceList];
      list[index].expCertificate = file;
      setExperienceList(list);
    }
  };

  const handleEducationChange = (index, field, value) => {
    const list = [...educationList];
    list[index][field] = value;
    setEducationList(list);
  };

  const addEducation = () => {
    if (educationList.length < 4) {
      setEducationList([...educationList, { degree: "", college: "", university: "", percentage: "", marksheet: null }]);
    }
  };

  const removeEducation = (index) => {
    const list = [...educationList];
    list.splice(index, 1);
    setEducationList(list);
  };

  const handleExperienceChange = (index, field, value) => {
    const list = [...experienceList];
    list[index][field] = value;
    setExperienceList(list);
  };

  const addExperience = () => {
    setExperienceList([...experienceList, { companyName: "", companyAddress: "", designation: "", startDate: "", endDate: "", jobRole: "", reportingManager: "", contactNumber: "", reasonForLeaving: "", employeeId: "", expCertificate: null }]);
  };

  const removeExperience = (index) => {
    const list = [...experienceList];
    list.splice(index, 1);
    setExperienceList(list);
  };

  // সাবমিট লজিক এখন শুধুমাত্র ডেটা প্রিপেয়ার করে প্যারেন্টকে দেবে
  const internalHandleSubmit = (e) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      photo: photoFile,
      govId: govIdFile,
      education: educationList,
      experience: experienceList,
    };
    
    // প্যারেন্ট কম্পোনেন্ট থেকে আসা ফাংশন কল করা হচ্ছে
    if (onSubmitData) {
      onSubmitData(finalData);
    }
  };

  return (
    <Container className="py-4">
      <Card className="p-4 shadow border-0">
        <h3 className="text-center mb-4 fw-bold text-primary">Employee Registration</h3>

        <Form onSubmit={internalHandleSubmit}>
          {/* PERSONAL DETAILS */}
          <Card className="p-4 mb-4 border-0 bg-light">
            <h5 className="mb-3 fw-bold">Personal Details</h5>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control name="name" value={formData.name} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control name="email" type="email" value={formData.email} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control name="phone" value={formData.phone} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control type="date" name="dob" value={formData.dob} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Blood Group</Form.Label>
                  <Form.Select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}>
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => <option key={bg}>{bg}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Religion</Form.Label>
                  <Form.Control name="religion" value={formData.religion} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
          </Card>

          {/* EDUCATION SECTION */}
          <Card className="p-4 mb-4 border-0 bg-light">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Education Details</h5>
              {educationList.length < 4 && (
                <Button variant="outline-primary" size="sm" onClick={addEducation}>+ Add</Button>
              )}
            </div>
            {educationList.map((edu, index) => (
              <div key={index} className="p-3 mb-3 bg-white rounded shadow-sm">
                <Row className="g-3">
                  <Col md={4}><Form.Control placeholder="Degree" value={edu.degree} onChange={(e) => handleEducationChange(index, "degree", e.target.value)} /></Col>
                  <Col md={4}><Form.Control placeholder="College" value={edu.college} onChange={(e) => handleEducationChange(index, "college", e.target.value)} /></Col>
                  <Col md={4}><Form.Control placeholder="University" value={edu.university} onChange={(e) => handleEducationChange(index, "university", e.target.value)} /></Col>
                  <Col md={6}><Form.Control placeholder="Percentage" value={edu.percentage} onChange={(e) => handleEducationChange(index, "percentage", e.target.value)} /></Col>
                  <Col md={6}>
                    <Form.Control type="file" onChange={(e) => handleFileChange(e, "marksheet", index)} />
                  </Col>
                </Row>
                {index > 0 && <Button variant="link" className="text-danger p-0 mt-2" onClick={() => removeEducation(index)}>Remove Education</Button>}
              </div>
            ))}
          </Card>

          {/* EXPERIENCE SECTION */}
          <Card className="p-4 mb-4 border-0 bg-light">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Work Experience</h5>
              <Button variant="outline-success" size="sm" onClick={addExperience}>+ Add</Button>
            </div>
            {experienceList.map((exp, index) => (
              <div key={index} className="p-3 mb-3 bg-white rounded shadow-sm">
                <Row className="g-3">
                  <Col md={6}><Form.Control placeholder="Company Name" value={exp.companyName} onChange={(e) => handleExperienceChange(index, "companyName", e.target.value)} /></Col>
                  <Col md={6}><Form.Control placeholder="Designation" value={exp.designation} onChange={(e) => handleExperienceChange(index, "designation", e.target.value)} /></Col>
                  <Col md={6}><Form.Label className="small mb-0">Start Date</Form.Label><Form.Control type="date" value={exp.startDate} onChange={(e) => handleExperienceChange(index, "startDate", e.target.value)} /></Col>
                  <Col md={6}><Form.Label className="small mb-0">End Date</Form.Label><Form.Control type="date" value={exp.endDate} onChange={(e) => handleExperienceChange(index, "endDate", e.target.value)} /></Col>
                  <Col md={12}>
                    <Form.Label className="small mb-0">Certificate</Form.Label>
                    <Form.Control type="file" onChange={(e) => handleFileChange(e, "expCertificate", index)} />
                  </Col>
                </Row>
                {index > 0 && <Button variant="link" className="text-danger p-0 mt-2" onClick={() => removeExperience(index)}>Remove Experience</Button>}
              </div>
            ))}
          </Card>

          {/* DOCUMENT UPLOADS */}
          <Card className="p-4 mb-4 border-0 bg-light text-center">
            <h5 className="fw-bold mb-3">Upload Documents</h5>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Employee Photo</Form.Label>
                <Form.Control type="file" accept="image/*" onChange={(e) => handleFileChange(e, "photo")} />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Government ID (PDF/JPG)</Form.Label>
                <Form.Control type="file" onChange={(e) => handleFileChange(e, "govId")} />
              </Col>
            </Row>
          </Card>

          <Button type="submit" variant="primary" className="w-100 py-3 fw-bold shadow-sm">
            SUBMIT ALL DETAILS
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default EmployeeForm;