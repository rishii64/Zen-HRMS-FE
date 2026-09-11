import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { LuSearch, LuShieldCheck, LuMail, LuPhone, LuBuilding, LuCircleCheck } from "react-icons/lu";
import { FaCheckCircle } from "react-icons/fa";

const Policies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("section-1");

  const sections = [
    {
      id: "section-1",
      num: "1",
      title: "Introduction & Purpose",
      subItems: [],
      content: (
        <>
          <p className="text-slate-600 leading-relaxed text-sm mb-4">
            Zentelex Pvt Ltd (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is dedicated to maintaining a safe, transparent, ethical, and highly productive work environment for all employees, contractors, and partners. This Comprehensive Company Policy document outlines our code of conduct, data privacy standards, asset usage, and workplace guidelines.
          </p>
          <p className="text-slate-600 leading-relaxed text-sm">
            By being an active employee or contractor at Zentelex Pvt Ltd, you agree to comply with the terms and practices detailed herein. We encourage all staff to review these policies regularly, as updates may occur to reflect legal compliance or operational changes.
          </p>
        </>
      )
    },
    {
      id: "section-2",
      num: "2",
      title: "Information We Collect & Privacy Standards",
      subItems: [
        { id: "section-2-1", subNum: "2.1", title: "Personal & Professional Data" },
        { id: "section-2-2", subNum: "2.2", title: "Non-Personal & Device Data" }
      ],
      content: (
        <>
          <p className="text-slate-600 leading-relaxed text-sm mb-4">
            We collect essential employee information required for administrative, payroll, tax compliance, and legal purposes. All sensitive personnel records are stored in encrypted databases with strict role-based access controls.
          </p>
          
          <div id="section-2-1" className="mt-6 mb-4">
            <h4 className="text-base font-bold text-slate-800 mb-2">2.1. Personal & Professional Data</h4>
            <p className="text-slate-600 leading-relaxed text-sm mb-3">
              During employment, Zentelex Pvt Ltd collects information such as your full name, official email, contact phone number, emergency contacts, tax identifier (PAN/SSN), passport/visa details, bank credentials for payroll, educational qualification, and performance reviews.
            </p>
          </div>

          <div id="section-2-2" className="mt-4">
            <h4 className="text-base font-bold text-slate-800 mb-2">2.2. Non-Personal & Workplace System Data</h4>
            <p className="text-slate-600 leading-relaxed text-sm">
              When utilizing company-provided hardware, VPNs, or network infrastructure, system logs, IP addresses, attendance clock-ins, and software activity logs are automatically recorded to ensure cybersecurity, prevent data leakage, and maintain IT integrity.
            </p>
          </div>
        </>
      )
    },
    {
      id: "section-3",
      num: "3",
      title: "Workplace Conduct & Anti-Harassment",
      subItems: [],
      content: (
        <>
          <p className="text-slate-600 leading-relaxed text-sm mb-4">
            Zentelex Pvt Ltd enforces a strict zero-tolerance policy against any form of discrimination, harassment, bullying, or intimidation based on race, gender, religion, age, disability, or national origin.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <FaCheckCircle className="text-emerald-500 h-4 w-4" /> Mutual Respect & Professionalism at all times
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <FaCheckCircle className="text-emerald-500 h-4 w-4" /> Confidential internal dispute resolution mechanism
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <FaCheckCircle className="text-emerald-500 h-4 w-4" /> Protection against retaliation for whistleblowers
            </div>
          </div>
        </>
      )
    },
    {
      id: "section-4",
      num: "4",
      title: "Data Protection & Intellectual Property",
      subItems: [],
      content: (
        <>
          <p className="text-slate-600 leading-relaxed text-sm mb-4">
            All proprietary software code, business designs, client datasets, trade secrets, and documents created during your employment at Zentelex Pvt Ltd remain the exclusive intellectual property of the company.
          </p>
          <p className="text-slate-600 leading-relaxed text-sm">
            Employees must not disclose or transfer confidential company data to third parties without prior written consent from executive management.
          </p>
        </>
      )
    },
    {
      id: "section-5",
      num: "5",
      title: "Leave, Attendance & Working Hours Policy",
      subItems: [],
      content: (
        <>
          <p className="text-slate-600 leading-relaxed text-sm mb-3">
            Standard business operating hours are from 10:00 AM to 07:00 PM IST (Monday through Friday). Attendance check-ins must be submitted daily using the HRMS portal.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
            <li>Casual Leave (CL) & Sick Leave (SL) requests require minimum 24-hour notice except in medical emergencies.</li>
            <li>Unannounced absences exceeding 3 consecutive business days may trigger disciplinary review.</li>
          </ul>
        </>
      )
    },
    {
      id: "section-6",
      num: "6",
      title: "Contact & Policy Support",
      subItems: [],
      content: (
        <>
          <p className="text-slate-600 leading-relaxed text-sm mb-4">
            If you have any questions, clarifications, or concerns regarding company policies or data privacy, please contact the HR & Legal team:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-700">
              <LuBuilding className="text-blue-600 h-4 w-4" /> <span className="font-bold">Zentelex Pvt Ltd Head Office</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-700">
              <LuMail className="text-blue-600 h-4 w-4" /> <span className="font-semibold">hr@zentelex.com</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-700">
              <LuPhone className="text-blue-600 h-4 w-4" /> <span className="font-semibold">+91 (033) 4058-9900</span>
            </div>
          </div>
        </>
      )
    }
  ];

  const filteredSections = sections.filter(
    (sec) =>
      sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.num.includes(searchTerm)
  );

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="py-10 px-4 md:px-8">
      {/* Custom Styles */}
      <style>{`
        .search-btn {
          background-color: #ef4444;
          color: #ffffff;
          border-radius: 12px;
          padding: 8px 20px;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s ease;
        }
        .search-btn:hover {
          background-color: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
        .photo-card {
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s ease;
        }
        .photo-card:hover {
          transform: translateY(-4px);
        }
        .toc-item {
          font-size: 13px;
          color: #64748b;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .toc-item:hover {
          color: #0f172a;
        }
        .toc-item.active {
          font-weight: 700;
          color: #0f172a;
        }
      `}</style>

      <Container className="max-w-6xl mx-auto">
        {/* TOP HERO SECTION MATCHING REFERENCE IMAGE */}
        <Row className="g-6 items-center mb-16">
          {/* Left Side: Title, Date, Search input */}
          <Col xs={12} lg={6}>
            <div className="pr-0 lg:pr-8">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
                Company Policies
              </h1>
              <p className="text-xs text-slate-400 font-medium mb-8">
                Latest update: 24 June 2024 • Zentelex Pvt Ltd
              </p>

              {/* Search Bar */}
              <div className="flex items-center gap-3 max-w-md">
                <div className="relative flex-1">
                  <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search any topic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                  />
                </div>
                <button className="search-btn">Search</button>
              </div>
            </div>
          </Col>

          {/* Right Side: Photo Collage Grid matching reference image layout */}
          <Col xs={12} lg={6}>
            <div className="grid grid-cols-12 gap-3">
              {/* Photo 1: Large Center Top */}
              <div className="col-span-7 photo-card h-48 md:h-56">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=700&auto=format&fit=crop"
                  alt="Workplace Team"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Photo 2: Right Top */}
              <div className="col-span-5 photo-card h-28 md:h-32">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop"
                  alt="Corporate Discussion"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Photo 3: Bottom Left Small */}
              <div className="col-span-5 photo-card h-28 md:h-32 -mt-16 md:-mt-20">
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&auto=format&fit=crop"
                  alt="Team Collaboration"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Photo 4: Right Bottom Large */}
              <div className="col-span-7 photo-card h-44 md:h-52 -mt-4">
                <img
                  src="https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?w=700&auto=format&fit=crop"
                  alt="Office Meeting"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </Col>
        </Row>

        {/* MAIN CONTENT ROW (75% Text Content + 25% Sticky Table of Contents) */}
        <Row className="g-8 items-start">
          {/* Left Column: Detailed Policy Sections */}
          <Col xs={12} lg={8} className="space-y-12">
            <p className="text-slate-600 leading-relaxed text-sm">
              At Zentelex Pvt Ltd (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;), we value employee privacy, professional integrity, and data security. This Policy Manual details our operational practices regarding data governance, office conduct, confidentiality, and employee rights. Please read carefully to understand workplace standards.
            </p>

            {filteredSections.map((sec) => (
              <div
                key={sec.id}
                id={sec.id}
                className="scroll-mt-24 pb-8 border-b border-slate-100 last:border-0"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  {sec.num}. {sec.title}
                </h3>
                {sec.content}
              </div>
            ))}
          </Col>

          {/* Right Column: Sticky Table of Contents Sidebar matching reference image */}
          <Col xs={12} lg={4} className="sticky top-24">
            <div className="bg-slate-50/70 border border-slate-100 rounded-3xl p-6 shadow-xs">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <LuShieldCheck className="text-red-500 h-4 w-4" /> Policy Topics
              </h4>

              <div className="space-y-3">
                {sections.map((sec) => (
                  <div key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      onClick={() => setActiveSection(sec.id)}
                      className={`toc-item block ${activeSection === sec.id ? "active" : ""}`}
                    >
                      {sec.num}. {sec.title}
                    </a>

                    {/* Sub items */}
                    {sec.subItems.length > 0 && (
                      <div className="pl-4 mt-1.5 space-y-1.5">
                        {sec.subItems.map((sub) => (
                          <a
                            key={sub.id}
                            href={`#${sub.id}`}
                            className="text-[12px] text-slate-500 hover:text-slate-900 block"
                          >
                            {sub.subNum}. {sub.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Policies;
