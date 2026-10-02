import React, { useState } from "react";
import { Modal, Row, Col, Badge, Button } from "react-bootstrap";
import {
  LuCake,
  LuSparkles,
  LuMegaphone,
  LuTrophy,
  LuCalendar,
  LuSearch,
  LuX,
  LuPartyPopper,
  LuAward,
  LuGift
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../../api/axios";

export default function BirthdayCelebrationModal({
  show,
  onHide,
  celebrationsData = {},
  onBroadcastSuccess = () => {},
  onTriggerPopup = () => {}
}) {
  const [activeTab, setActiveTab] = useState("birthdays");
  const [searchTerm, setSearchTerm] = useState("");
  const [broadcastingId, setBroadcastingId] = useState(null);

  const birthdays = celebrationsData?.birthdays || [];
  const todaysBirthdays = celebrationsData?.todaysBirthdays || [];
  const todaysAnniversaries = celebrationsData?.todaysAnniversaries || [];
  const oneYearCompleted = celebrationsData?.oneYearCompletedMembers || [];

  // Filter birthdays by search query
  const filteredBirthdays = birthdays.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.department && item.department.toLowerCase().includes(q)) ||
      (item.designation && item.designation.toLowerCase().includes(q)) ||
      item.dateStr.includes(q) ||
      item.formattedDate.toLowerCase().includes(q)
    );
  });

  // Filter 1-year anniversaries by search query
  const filteredAnniversaries = oneYearCompleted.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.department && item.department.toLowerCase().includes(q)) ||
      (item.designation && item.designation.toLowerCase().includes(q))
    );
  });

  // Handle broadcasting a birthday or milestone event to notify everyone
  const handleBroadcastEvent = async (employee, type = "birthday") => {
    setBroadcastingId(`${type}-${employee.id}`);
    try {
      const isAnniv = type === "anniversary";
      const payload = {
        type,
        employeeName: employee.name,
        eventDate: isAnniv ? employee.joiningDate : employee.dateStr,
        title: isAnniv
          ? `🎉 1-Year Work Anniversary Celebration: ${employee.name}!`
          : `🎂 Birthday Celebration: Happy Birthday, ${employee.name}!`,
        message: isAnniv
          ? `Congratulations to ${employee.name} on completing 1 year of dedication and excellence at Zentelex IT Solutions! Let's celebrate this proud milestone together!`
          : `Today we celebrate ${employee.name}'s Birthday! 🎂 Let's wish them a wonderful day filled with joy, happiness, and continued success!`,
        createdBy: localStorage.getItem("userName") || "HR Team"
      };

      const res = await api.post("/celebrations/broadcast", payload);

      if (res.data?.success) {
        toast.success(
          `🎉 Event broadcasted! Everyone has been notified of ${employee.name}'s ${
            isAnniv ? "1-Year Anniversary" : "Birthday"
          }!`,
          { duration: 4000 }
        );

        onBroadcastSuccess(res.data.broadcast);

        // Also trigger the celebratory popup immediately
        onTriggerPopup({
          type,
          name: employee.name,
          department: employee.department,
          designation: employee.designation,
          dateStr: isAnniv ? employee.joiningDate : employee.dateStr,
          tenureYears: employee.tenureYears || 1,
          message: payload.message
        });
      }
    } catch (err) {
      console.error("Broadcast failed:", err);
      toast.error("Failed to broadcast celebration. Please try again.");
    } finally {
      setBroadcastingId(null);
    }
  };

  return (
    <>
      {/* Material 3 (Material Design) UI Styling with Full Mobile Responsiveness */}
      <style>{`
        /* M3 Dialog Container */
        .m3-modal-dialog {
          max-width: 760px;
          margin: 1.5rem auto;
        }
        @media (max-width: 768px) {
          .m3-modal-dialog {
            margin: 0.5rem auto;
            max-width: calc(100vw - 16px);
            width: calc(100vw - 16px);
          }
        }
        .m3-modal-dialog .modal-content {
          max-height: 88vh;
          height: 85vh;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          border: 1px solid #e0e2ec;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          background: #fdfcff;
          font-family: 'Roboto', 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        /* Material Custom Scrollbar */
        .m3-scrollable {
          scrollbar-width: thin;
          scrollbar-color: #c4c7c5 transparent;
        }
        .m3-scrollable::-webkit-scrollbar {
          width: 5px;
        }
        .m3-scrollable::-webkit-scrollbar-thumb {
          background-color: #c4c7c5;
          border-radius: 10px;
        }

        /* Header Bar */
        .m3-modal-header {
          flex-shrink: 0;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #ffffff;
        }

        /* Modal Body */
        .m3-modal-body {
          flex: 1 1 auto;
          overflow-y: auto;
          min-height: 0;
          background-color: #f8fafc;
        }

        /* Modal Footer */
        .m3-modal-footer {
          flex-shrink: 0;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 10px 16px;
        }

        /* M3 Segmented Tabs - Responsive Single-Line */
        .m3-segmented-tabs-wrapper {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .m3-segmented-tabs {
          display: inline-flex;
          background: #f0f4f9;
          border: 1px solid #d2d8e0;
          border-radius: 9999px;
          padding: 3px;
          gap: 2px;
          width: 100%;
        }
        @media (min-width: 640px) {
          .m3-segmented-tabs {
            width: auto;
          }
        }
        .m3-segmented-tab {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 500;
          color: #444746;
          white-space: nowrap !important;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
          cursor: pointer;
        }
        @media (max-width: 480px) {
          .m3-segmented-tab {
            padding: 6px 10px;
            font-size: 11.5px;
            gap: 4px;
          }
        }
        .m3-segmented-tab:hover:not(.active) {
          background: rgba(11, 87, 208, 0.06);
          color: #1f1f1f;
        }
        .m3-segmented-tab.active {
          background: #0b57d0;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(11, 87, 208, 0.3);
        }
        .m3-tab-badge {
          font-size: 10.5px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
          line-height: 1.4;
        }
        .m3-segmented-tab.active .m3-tab-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
        .m3-segmented-tab:not(.active) .m3-tab-badge {
          background: #e1e3e1;
          color: #444746;
        }

        /* M3 Search Bar */
        .m3-search-bar {
          display: flex;
          align-items: center;
          background: #f0f4f9;
          border: 1px solid #d2d8e0;
          border-radius: 9999px;
          padding: 4px 14px;
          height: 38px;
          width: 100%;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        }
        @media (min-width: 640px) {
          .m3-search-bar {
            width: 240px;
          }
        }
        .m3-search-bar:focus-within {
          background: #ffffff;
          border-color: #0b57d0;
          box-shadow: 0 1px 4px rgba(11, 87, 208, 0.2);
        }
        .m3-search-input {
          border: none;
          background: transparent;
          font-size: 12.5px;
          color: #1f1f1f;
          width: 100%;
          outline: none;
        }
        .m3-search-input::placeholder {
          color: #74777f;
        }

        /* M3 Outlined & Elevated Cards */
        .m3-card {
          background: #ffffff;
          border: 1px solid #e0e2ec;
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          box-shadow: 0 1px 2px rgba(60, 64, 67, 0.08), 0 1px 3px 1px rgba(60, 64, 67, 0.04);
          transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
          position: relative;
        }
        .m3-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(60, 64, 67, 0.12), 0 1px 4px rgba(60, 64, 67, 0.06);
          border-color: #c4c7c5;
        }
        .m3-card.m3-today-card {
          background: #fffbf0;
          border: 1.5px solid #f9ab00;
          box-shadow: 0 4px 16px rgba(249, 171, 0, 0.2);
        }

        /* M3 Avatar */
        .m3-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13.5px;
          font-weight: 600;
          color: #ffffff;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }

        /* M3 Date Chip */
        .m3-date-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #e8f0fe;
          color: #0b57d0;
          border: 1px solid #d2e3fc;
          border-radius: 10px;
          padding: 3px 9px;
          font-size: 11.5px;
          font-weight: 600;
          white-space: nowrap !important;
          letter-spacing: 0.2px;
        }
        .m3-today-card .m3-date-chip {
          background: #feedc8;
          color: #744b00;
          border-color: #fed699;
        }

        /* M3 Single-Line Buttons (Guaranteed Never to Wrap) */
        .m3-btn-filled,
        .m3-btn-tonal,
        .m3-btn-amber-filled,
        .m3-btn-amber-tonal {
          white-space: nowrap !important;
          flex-shrink: 0;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
          text-decoration: none;
        }
        @media (max-width: 480px) {
          .m3-btn-filled,
          .m3-btn-tonal,
          .m3-btn-amber-filled,
          .m3-btn-amber-tonal {
            font-size: 11px;
            padding: 5px 11px;
            gap: 4px;
          }
        }

        .m3-btn-filled {
          background: #0b57d0;
          color: #ffffff;
          border: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
        }
        .m3-btn-filled:hover:not(:disabled) {
          background: #0842a0;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          color: #ffffff;
        }
        .m3-btn-filled:disabled {
          background: #e0e2ec;
          color: #8e918f;
          cursor: not-allowed;
          box-shadow: none;
        }

        .m3-btn-tonal {
          background: #f0f4f9;
          color: #0b57d0;
          border: 1px solid #d2d8e0;
        }
        .m3-btn-tonal:hover {
          background: #e8f0fe;
          border-color: #0b57d0;
          color: #0842a0;
        }

        .m3-btn-amber-filled {
          background: #b45309;
          color: #ffffff;
          border: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        .m3-btn-amber-filled:hover {
          background: #92400e;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
          color: #ffffff;
        }

        .m3-btn-amber-tonal {
          background: #fff8e1;
          color: #744b00;
          border: 1px solid #fed699;
        }
        .m3-btn-amber-tonal:hover {
          background: #feedc8;
          border-color: #f9ab00;
          color: #573b00;
        }

        /* Material Header Banner */
        .m3-anniversary-banner {
          background: #fef7ee;
          border: 1px solid #fed699;
          border-radius: 16px;
          padding: 12px 14px;
          margin-bottom: 16px;
        }
      `}</style>

      <Modal
        show={show}
        onHide={onHide}
        size="lg"
        centered
        dialogClassName="m3-modal-dialog"
      >
        {/* Header Bar */}
        <div className="m3-modal-header p-3 p-md-4 d-flex align-items-center justify-content-between position-relative">
          <div className="d-flex align-items-center gap-2.5 gap-md-3">
            <div
              className="p-2 p-md-2.5 rounded-2xl d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
                width: "42px",
                height: "42px"
              }}
            >
              <LuCake size={22} className="text-white" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h4 className="fw-bold mb-0 text-white" style={{ fontSize: "17px", letterSpacing: "-0.3px" }}>
                  Company Birthdays & Work Milestones
                </h4>
                <Badge
                  bg="danger"
                  className="rounded-pill px-2 py-0.5 text-[10.5px] fw-bold"
                  style={{ background: "#f43f5e" }}
                >
                  12 Members
                </Badge>
              </div>
              <p className="text-slate-400 text-xs mb-0 mt-0.5 d-none d-sm-block">
                Celebrate birthdays and 1-year work anniversaries across Team Zentelex
              </p>
            </div>
          </div>

          <button
            onClick={onHide}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: "32px",
              height: "32px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}
          >
            <LuX size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <Modal.Body className="m3-modal-body p-3 p-md-4 m3-scrollable">
          {/* Today Celebration Banner (if any birthday today) */}
          {todaysBirthdays.length > 0 && (
            <div
              className="mb-3 p-3 rounded-2xl shadow-xs d-flex flex-wrap align-items-center justify-content-between gap-2.5 text-white"
              style={{
                background: "linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)",
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              <div className="d-flex align-items-center gap-2.5">
                <span style={{ fontSize: "26px" }}>🎉</span>
                <div>
                  <div className="fw-bold text-uppercase tracking-wider" style={{ fontSize: "10px", opacity: 0.9 }}>
                    Today's Celebration!
                  </div>
                  <div className="fw-bold text-sm">
                    Happy Birthday, {todaysBirthdays.map((b) => b.name).join(", ")}! 🎂
                  </div>
                </div>
              </div>
              <Button
                variant="light"
                size="sm"
                className="rounded-pill fw-bold text-xs px-3 py-1 shadow-xs text-rose-600 d-flex align-items-center gap-1.5 flex-nowrap text-nowrap"
                onClick={() =>
                  onTriggerPopup({
                    type: "birthday",
                    name: todaysBirthdays[0]?.name,
                    department: todaysBirthdays[0]?.department,
                    designation: todaysBirthdays[0]?.designation,
                    dateStr: todaysBirthdays[0]?.dateStr
                  })
                }
              >
                <LuPartyPopper size={13} /> Open Card
              </Button>
            </div>
          )}

          {/* Material 3 Segmented Tabs & Search Bar - Fully Responsive */}
          <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2.5 mb-3.5">
            {/* Segmented Button Group */}
            <div className="m3-segmented-tabs-wrapper">
              <div className="m3-segmented-tabs">
                <button
                  type="button"
                  className={`m3-segmented-tab ${activeTab === "birthdays" ? "active" : ""}`}
                  onClick={() => setActiveTab("birthdays")}
                >
                  <LuCake size={15} />
                  <span>All Birthdays</span>
                  <span className="m3-tab-badge">{birthdays.length}</span>
                </button>

                <button
                  type="button"
                  className={`m3-segmented-tab ${activeTab === "anniversaries" ? "active" : ""}`}
                  onClick={() => setActiveTab("anniversaries")}
                >
                  <LuTrophy size={15} />
                  <span>Milestones</span>
                  <span className="m3-tab-badge">{oneYearCompleted.length}</span>
                </button>
              </div>
            </div>

            {/* M3 Search Bar */}
            <div className="m3-search-bar">
              <LuSearch size={15} className="text-slate-400 me-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search name, role, dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="m3-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="btn btn-sm p-0 text-slate-400 hover:text-slate-700 border-0 bg-transparent flex-shrink-0"
                >
                  <LuX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* TAB 1: ALL BIRTHDAYS (MATERIAL 3 CARDS)                       */}
          {/* ============================================================ */}
          {activeTab === "birthdays" && (
            <div>
              {filteredBirthdays.length === 0 ? (
                <div className="text-center py-5 text-slate-400">
                  <LuCake size={36} className="mb-2 opacity-40 text-slate-500" />
                  <p className="mb-0 text-sm font-medium">No birthdays match your search</p>
                </div>
              ) : (
                <Row className="g-2.5 g-md-3">
                  {filteredBirthdays.map((emp) => {
                    const isToday = emp.isToday;
                    const isBroadcasting = broadcastingId === `birthday-${emp.id}`;

                    return (
                      <Col xs={12} md={6} key={emp.id}>
                        <div className={`m3-card ${isToday ? "m3-today-card" : ""}`}>
                          {/* Card Top: Leading Avatar, Info, Trailing Date Chip */}
                          <div className="d-flex align-items-start justify-content-between gap-2 mb-2.5">
                            <div className="d-flex align-items-center gap-2.5 min-w-0">
                              {/* Material Avatar */}
                              <div className={`m3-avatar bg-gradient-to-tr ${emp.avatarBg}`}>
                                {emp.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </div>

                              <div className="min-w-0">
                                <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                  <span
                                    className="fw-semibold text-slate-900 text-truncate"
                                    style={{ fontSize: "14px", letterSpacing: "-0.2px" }}
                                  >
                                    {emp.name}
                                  </span>
                                  {isToday && (
                                    <span
                                      className="badge rounded-pill px-1.5 py-0.5 text-[9px] fw-bold text-dark animate-pulse flex-shrink-0"
                                      style={{ background: "#feedc8", border: "1px solid #fed699" }}
                                    >
                                      Today! 🎂
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="text-slate-500 font-normal text-truncate"
                                  style={{ fontSize: "11.5px", lineHeight: "1.3" }}
                                >
                                  {emp.designation} &bull; <span className="text-slate-600">{emp.department}</span>
                                </div>
                              </div>
                            </div>

                            {/* Trailing M3 Date Chip */}
                            <div className="text-end flex-shrink-0">
                              <div className="m3-date-chip">
                                <LuCalendar size={12} />
                                <span>{emp.formattedDate}</span>
                              </div>
                              <div
                                className="mt-0.5 font-semibold text-nowrap"
                                style={{
                                  fontSize: "10.5px",
                                  color: isToday ? "#b45309" : "#64748b"
                                }}
                              >
                                {isToday
                                  ? "Today! 🎉"
                                  : emp.daysLeft === 1
                                  ? "Tomorrow!"
                                  : `In ${emp.daysLeft} days`}
                              </div>
                            </div>
                          </div>

                          {/* Card Actions Bar: Single-Line Buttons */}
                          <div className="pt-2 border-top border-slate-100 d-flex align-items-center justify-content-between gap-2 mt-auto flex-nowrap">
                            <span className="text-slate-400 font-medium text-nowrap d-none d-sm-inline" style={{ fontSize: "11px" }}>
                              🎂 {emp.dateStr}
                            </span>

                            {/* Action Buttons in Single Line */}
                            <div className="d-flex align-items-center gap-2 flex-nowrap ms-auto">
                              {/* Preview Wish Button (M3 Tonal) */}
                              <button
                                type="button"
                                className="m3-btn-tonal text-nowrap"
                                onClick={() =>
                                  onTriggerPopup({
                                    type: "birthday",
                                    name: emp.name,
                                    department: emp.department,
                                    designation: emp.designation,
                                    dateStr: emp.dateStr
                                  })
                                }
                              >
                                View Wish
                              </button>

                              {/* Notify Everyone Button (M3 Filled) */}
                              <button
                                type="button"
                                disabled={isBroadcasting}
                                className={`${isToday ? "m3-btn-amber-filled" : "m3-btn-filled"} text-nowrap`}
                                onClick={() => handleBroadcastEvent(emp, "birthday")}
                              >
                                <LuMegaphone size={12} />
                                <span>{isBroadcasting ? "Notifying..." : "Notify Everyone"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: 1-YEAR WORK MILESTONES (MATERIAL 3 CARDS)              */}
          {/* ============================================================ */}
          {activeTab === "anniversaries" && (
            <div>
              {/* Material Overview Banner */}
              <div className="m3-anniversary-banner d-flex align-items-center gap-2.5">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-amber-800 flex-shrink-0"
                  style={{ width: "38px", height: "38px", background: "#ffeed0" }}
                >
                  <LuTrophy size={18} />
                </div>
                <div>
                  <div className="fw-bold text-amber-950" style={{ fontSize: "12.5px" }}>
                    1-Year Work Anniversary Milestones
                  </div>
                  <div className="text-amber-900 text-xs mt-0.5 font-normal leading-relaxed">
                    Celebrating team members who have completed 1 year of dedication at Zentelex IT Solutions Pvt. Ltd.!
                  </div>
                </div>
              </div>

              {filteredAnniversaries.length === 0 ? (
                <div className="text-center py-5 text-slate-400">
                  <LuTrophy size={36} className="mb-2 opacity-40 text-amber-500" />
                  <p className="mb-0 text-sm font-medium">No anniversaries match your search</p>
                </div>
              ) : (
                <Row className="g-2.5 g-md-3">
                  {filteredAnniversaries.map((emp) => {
                    const isOneYear = emp.tenureYears === 1;
                    const isBroadcasting = broadcastingId === `anniversary-${emp.id}`;

                    return (
                      <Col xs={12} md={6} key={emp.id}>
                        <div
                          className="m3-card"
                          style={{
                            background: isOneYear ? "#fffefc" : "#ffffff",
                            borderColor: isOneYear ? "#fed699" : "#e0e2ec"
                          }}
                        >
                          <div>
                            {/* Card Top: Avatar, Name, Milestone Badge */}
                            <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                              <div className="d-flex align-items-center gap-2.5 min-w-0">
                                {/* Material Gold Avatar */}
                                <div
                                  className="m3-avatar flex-shrink-0"
                                  style={{
                                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                                  }}
                                >
                                  <LuAward size={18} />
                                </div>

                                <div className="min-w-0">
                                  <div
                                    className="fw-semibold text-slate-900 text-truncate"
                                    style={{ fontSize: "14px", letterSpacing: "-0.2px" }}
                                  >
                                    {emp.name}
                                  </div>
                                  <div
                                    className="text-slate-500 font-normal text-truncate"
                                    style={{ fontSize: "11.5px", lineHeight: "1.3" }}
                                  >
                                    {emp.designation} &bull; <span className="text-slate-600">{emp.department}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Milestone Badge */}
                              <div
                                className="px-2 py-0.5 rounded-pill fw-bold text-xs flex-shrink-0 text-nowrap"
                                style={{
                                  background: "#ffeed0",
                                  border: "1px solid #fed699",
                                  color: "#744b00",
                                  fontSize: "10.5px"
                                }}
                              >
                                {isOneYear ? "🏅 1-Yr Completed" : `🏅 ${emp.tenureYears} Yrs Completed`}
                              </div>
                            </div>

                            {/* Material Inset Details Container */}
                            <div
                              className="rounded-xl p-2 mb-2"
                              style={{
                                background: "#f8f9fa",
                                border: "1px solid #e0e2ec",
                                fontSize: "11.5px"
                              }}
                            >
                              <div className="d-flex justify-content-between align-items-center mb-0.5">
                                <span className="text-slate-500 font-medium">Joining Date</span>
                                <span className="text-slate-900 font-semibold">{emp.joiningDate || "N/A"}</span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-slate-500 font-medium">Completed Tenure</span>
                                <span className="text-amber-800 font-bold">
                                  {emp.tenureYears} Year{emp.tenureYears > 1 ? "s" : ""}{" "}
                                  {emp.tenureMonths > 0 ? `${emp.tenureMonths} Mos` : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Actions Bar: Single-Line Buttons */}
                          <div className="pt-2 border-top border-slate-100 d-flex align-items-center justify-content-between gap-2 mt-auto flex-nowrap">
                            {/* <span className="text-slate-400 font-medium text-nowrap d-none d-sm-inline" style={{ fontSize: "11px" }}>
                              Milestone Honor
                            </span> */}

                            {/* Action Buttons in Single Line */}
                            <div className="d-flex align-items-center gap-2 flex-nowrap mx-auto">
                              {/* Celebrate 1-Yr Button (M3 Amber Tonal) */}
                              <button
                                type="button"
                                className="m3-btn-amber-tonal text-nowrap"
                                onClick={() =>
                                  onTriggerPopup({
                                    type: "anniversary",
                                    name: emp.name,
                                    department: emp.department,
                                    designation: emp.designation,
                                    dateStr: emp.joiningDate,
                                    tenureYears: emp.tenureYears || 1
                                  })
                                }
                              >
                                Celebrate 1-Yr 🏆
                              </button>

                              {/* Notify Everyone Button (M3 Filled) */}
                              <button
                                type="button"
                                disabled={isBroadcasting}
                                className="m3-btn-filled text-nowrap"
                                onClick={() => handleBroadcastEvent(emp, "anniversary")}
                              >
                                <LuMegaphone size={12} />
                                <span>{isBroadcasting ? "Notifying..." : "Notify Everyone"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </div>
          )}
        </Modal.Body>

        {/* Modal Footer */}
        <div className="m3-modal-footer d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
          <div className="text-slate-500 text-xs font-medium d-flex align-items-center gap-1.5 text-center text-sm-start">
            <LuSparkles size={14} className="text-amber-500 flex-shrink-0" />
            <span style={{ fontSize: "11px" }}>
              Clicking <strong>"Notify Everyone"</strong> broadcasts celebration to all active dashboard sessions.
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="rounded-pill px-4 py-1.5 fw-semibold text-xs border-0 flex-shrink-0"
            style={{ background: "#475569" }}
            onClick={onHide}
          >
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
}
