import React from 'react';

const EmployeeDetails = () => {
  const employeeData = {
    departmentHead: "Tonuja Dey Sarkar",
    designation: "Senior Software Architect",
    experience: "5+ Years",
    jobRole: "Full-Stack Development & Team Leadership",
    minQualification: "B.Tech in Computer Science",
    dateOfHiring: "12th March 2022",
    salaryStructure: {
      basic: "₹50,000",
      hra: "₹20,000",
      allowance: "₹10,000",
      total: "₹80,000"
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.header}>Employee Professional Overview</h2>
        <div style={styles.grid}>
          
          <div style={styles.infoBox}>
            <span style={styles.label}>Department Head</span>
            <p style={styles.value}>{employeeData.departmentHead}</p>
          </div>

          <div style={styles.infoBox}>
            <span style={styles.label}>Designation</span>
            <p style={styles.value}>{employeeData.designation}</p>
          </div>

          <div style={styles.infoBox}>
            <span style={styles.label}>Experience</span>
            <p style={styles.value}>{employeeData.experience}</p>
          </div>

          <div style={styles.infoBox}>
            <span style={styles.label}>Job Role</span>
            <p style={styles.value}>{employeeData.jobRole}</p>
          </div>

          <div style={styles.infoBox}>
            <span style={styles.label}>Min. Qualification</span>
            <p style={styles.value}>{employeeData.minQualification}</p>
          </div>

          <div style={styles.infoBox}>
            <span style={styles.label}>Date of Hiring</span>
            <p style={styles.value}>{employeeData.dateOfHiring}</p>
          </div>

        </div>

        <div style={styles.salarySection}>
          <h3 style={styles.subHeader}>Salary Structure</h3>
          <div style={styles.salaryGrid}>
            <div style={styles.salaryItem}>Basic: {employeeData.salaryStructure.basic}</div>
            <div style={styles.salaryItem}>HRA: {employeeData.salaryStructure.hra}</div>
            <div style={styles.salaryItem}>Allowance: {employeeData.salaryStructure.allowance}</div>
            <div style={styles.totalSalary}>Gross Total: {employeeData.salaryStructure.total}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    background: '#f0f2f5',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center'
  },
  card: {
    background: '#ffffff',
    borderRadius: '15px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    width: '100%',
    border: '1px solid #e0e0e0'
  },
  header: {
    color: '#1a73e8',
    marginBottom: '25px',
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: '600'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  infoBox: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '10px',
    borderLeft: '4px solid #1a73e8'
  },
  label: {
    fontSize: '12px',
    color: '#70757a',
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  value: {
    fontSize: '16px',
    color: '#202124',
    margin: '5px 0 0 0',
    fontWeight: '500'
  },
  salarySection: {
    marginTop: '20px',
    padding: '20px',
    background: '#e8f0fe',
    borderRadius: '12px'
  },
  subHeader: {
    fontSize: '18px',
    marginBottom: '15px',
    color: '#1967d2'
  },
  salaryGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px'
  },
  salaryItem: {
    fontSize: '14px',
    color: '#3c4043'
  },
  totalSalary: {
    width: '100%',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #aecbfa',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#174ea6',
    textAlign: 'right'
  }
};

export default EmployeeDetails;