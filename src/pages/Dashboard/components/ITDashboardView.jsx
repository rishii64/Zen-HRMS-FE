import React, { useState } from "react";
import { Row, Col, Table, Badge, Button, ProgressBar } from "react-bootstrap";
import {
  LuServer,
  LuLaptop,
  LuShieldCheck,
  LuCpu,
  LuClock,
  LuWifi,
  LuKeyRound,
  LuHeadphones,
  LuRefreshCw
} from "react-icons/lu";

export default function ITDashboardView() {
  const [tickets, setTickets] = useState([
    { id: "IT-201", user: "Amit Sharma", dept: "Marketing", type: "Laptop Hardware", issue: "Flickering secondary external display", priority: "Medium", status: "In Progress" },
    { id: "IT-202", user: "Rohan Verma", dept: "IT", type: "VPN & Network", issue: "AWS Production Bastion host access key provisioning", priority: "High", status: "Pending" },
    { id: "IT-203", user: "Sneha Roy", dept: "HR", type: "Software License", issue: "Figma Enterprise Seat renewal & SSO activation", priority: "Low", status: "Resolved" },
    { id: "IT-204", user: "Pooja Das", dept: "Accounts", type: "Security Credentials", issue: "Tally Prime ERP multi-user portal password reset", priority: "High", status: "In Progress" },
  ]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-wider uppercase mb-2">
              <LuServer className="w-3.5 h-3.5" />
              IT Infrastructure & Systems Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Technical Operations & Asset Desk
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl mt-1">
              Monitoring system servers, provisioned laptops & hardware assets, user access credentials, and technical service requests across HRMS.
            </p>
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">System Uptime</div>
            <div className="text-2xl font-black text-white mt-1">99.98%</div>
            <div className="text-xs text-slate-400 mt-1">Cloud services healthy</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Active IT Tickets</div>
            <div className="text-2xl font-black text-amber-300 mt-1">3</div>
            <div className="text-xs text-amber-200/70 mt-1">Open support requests</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Assigned Laptops</div>
            <div className="text-2xl font-black text-blue-300 mt-1">142</div>
            <div className="text-xs text-blue-200/70 mt-1">Hardware tracked</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Security Audits</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">100%</div>
            <div className="text-xs text-emerald-200/70 mt-1">SSL & SSO Compliant</div>
          </div>
        </div>
      </div>

      {/* IT Support Tickets Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-slate-800 text-lg d-flex align-items-center gap-2">
            <LuHeadphones className="text-cyan-600" />
            Recent IT Service Tickets
          </div>
          <Badge bg="info" className="text-dark fw-semibold px-2.5 py-1.5">
            Realtime Technical Queue
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table hover responsive className="align-middle mb-0 text-sm">
            <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Employee & Dept</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-700">{t.id}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{t.user}</div>
                    <div className="text-xs text-slate-500">{t.dept}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{t.type}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">{t.issue}</td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge bg={t.priority === "High" ? "danger" : t.priority === "Medium" ? "warning" : "secondary"} className={t.priority === "Medium" ? "text-dark" : ""}>
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${t.status === "Resolved" ? "bg-emerald-100 text-emerald-800" : t.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
