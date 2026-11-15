import React, { useState, useEffect, useMemo } from "react";
import {
  LuLink,
  LuCopy,
  LuExternalLink,
  LuClock,
  LuCircleCheck,
  LuCircleX,
  LuTriangleAlert,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuDownload,
  LuFileText,
  LuUserCheck,
  LuEye,
  LuTrash2,
  LuCheck,
  LuBuilding2,
  LuCalendar,
  LuSend,
  LuShieldCheck,
  LuFileSpreadsheet,
  LuCreditCard,
  LuBriefcase,
  LuGraduationCap,
} from "react-icons/lu";
import toast, { Toaster } from "react-hot-toast";
import api, { getUploadUrl } from "../../api/axios";

export default function PreJoiningManagement() {
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, submitted: 0, verified: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // New Link Form
  const [formData, setFormData] = useState({
    candidate_name: "",
    candidate_email: "",
    phone: "",
    designation: "",
    department: "Engineering/Tech",
    joining_date: "",
    work_location: "Kolkata HQ",
  });

  useEffect(() => {
    fetchLinks();
  }, [statusFilter]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/pre-joining", {
        params: { status: statusFilter, search },
      });
      if (res.data?.success) {
        setLinks(res.data.data || []);
        if (res.data.stats) setStats(res.data.stats);
      } else {
        toast.error(res.data?.error || "Failed to load pre-joining links");
      }
    } catch (err) {
      console.error("Fetch links error:", err);
      toast.error(err.response?.data?.error || "Failed to load pre-joining links");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLinks();
  };

  // Generate Link
  const handleGenerateLink = async (e) => {
    e.preventDefault();
    if (!formData.candidate_name.trim() || !formData.candidate_email.trim()) {
      toast.error("Candidate Name and Candidate Email are required.");
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post("/pre-joining/generate", formData);
      if (res.data?.success) {
        toast.success(res.data.message || "Pre-joining link generated with 7-day validity!");
        setShowGenerateModal(false);
        setFormData({
          candidate_name: "",
          candidate_email: "",
          phone: "",
          designation: "",
          department: "Engineering/Tech",
          joining_date: "",
          work_location: "Kolkata HQ",
        });
        fetchLinks();
      } else {
        toast.error(res.data?.error || "Failed to generate link");
      }
    } catch (err) {
      console.error("Generate error:", err);
      toast.error(err.response?.data?.error || "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate / Extend 7 Days
  const handleRegenerate = async (id, name) => {
    if (!window.confirm(`Extend 7-day validity and regenerate upload link for ${name}?`)) return;
    try {
      const res = await api.post(`/pre-joining/${id}/regenerate`);
      if (res.data?.success) {
        toast.success("Link renewed! Valid for another 7 days.");
        fetchLinks();
      } else {
        toast.error(res.data?.error || "Failed to renew link");
      }
    } catch (err) {
      console.error("Renew error:", err);
      toast.error(err.response?.data?.error || "Failed to renew link");
    }
  };

  // Verify / Reject Docs
  const handleUpdateStatus = async (status) => {
    if (!selectedRecord) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/pre-joining/${selectedRecord.id}/verify`, {
        status,
        remarks: reviewRemarks,
      });
      if (res.data?.success) {
        toast.success(`Documents marked as ${status}!`);
        setShowDocModal(false);
        fetchLinks();
      } else {
        toast.error(res.data?.error || "Action failed");
      }
    } catch (err) {
      console.error("Verify error:", err);
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Sync to Onboarding
  const handleSyncToOnboarding = async (id, name) => {
    if (!window.confirm(`Sync all uploaded documents and bank details for ${name} into their Onboarding & Employee profile?`)) return;
    try {
      const res = await api.post(`/pre-joining/${id}/sync`);
      if (res.data?.success) {
        toast.success(res.data.message || "Synced to Onboarding & Employee records!");
        fetchLinks();
      } else {
        toast.error(res.data?.error || "Sync failed");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error(err.response?.data?.error || "Failed to sync to onboarding");
    }
  };

  // Copy Link to Clipboard
  const copyLinkToClipboard = (token) => {
    const origin = window.location.origin;
    const fullUrl = `${origin}/pre-joining-portal/${token}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Secure Pre-Joining portal link copied to clipboard!");
  };

  // Delete Link
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the pre-joining link for ${name}?`)) return;
    try {
      const res = await api.delete(`/pre-joining/${id}`);
      if (res.data?.success) {
        toast.success("Pre-joining link deleted");
        fetchLinks();
      }
    } catch (err) {
      toast.error("Failed to delete link");
    }
  };

  // Format link status badge
  const renderStatusBadge = (r) => {
    if (r.isExpired && r.status === "PENDING_UPLOAD") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <LuClock size={12} /> Expired (7-Day Limit)
        </span>
      );
    }
    switch (r.status) {
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <LuFileText size={12} /> Submitted ({r.docsCount || 0} Docs)
          </span>
        );
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <LuCircleCheck size={12} /> Verified & Synced
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <LuCircleX size={12} /> Docs Rejected
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <LuRefreshCw size={12} className="animate-spin" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <LuClock size={12} /> Pending Upload ({r.daysLeft}d left)
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
              Candidate Self-Upload
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md">
              7-Day Expiration Engine
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Pre-Joining Document Retrieval Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue secure 7-day external links to newly hired candidates for uploading KYC, prior relieving letters, and banking details before Day 1.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLinks}
            className="p-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Refresh links"
          >
            <LuRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
          >
            <LuPlus size={16} />
            <span>Generate Pre-Joining Link</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Links Issued</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All pre-joining portals</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Upload</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{stats.pending}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Active candidates uploading</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Submitted for Review</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{stats.submitted}</div>
          <div className="text-[10px] text-blue-600 mt-0.5">Awaiting HR retrieval</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Verified & Synced</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats.verified}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Imported into profile</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Expired Links</div>
          <div className="text-2xl font-black text-rose-900 mt-1">{stats.expired}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">&gt; 7 days without upload</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search candidate name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {["ALL", "PENDING_UPLOAD", "SUBMITTED", "VERIFIED", "EXPIRED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Candidate Details</th>
                <th className="py-3 px-3">Role & Dept</th>
                <th className="py-3 px-3">Day-1 Date</th>
                <th className="py-3 px-3">7-Day Expiry Countdown</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading pre-joining records...
                  </td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <LuFileText className="mx-auto mb-2 text-slate-300" size={32} />
                    No pre-joining links found for the selected filter.
                  </td>
                </tr>
              ) : (
                links.map((r) => {
                  const portalUrl = `${window.location.origin}/pre-joining-portal/${r.token}`;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.candidate_name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{r.candidate_email}</span>
                          {r.phone && <span>• {r.phone}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{r.designation}</div>
                        <div className="text-[11px] text-slate-500">{r.department}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{r.joining_date || "—"}</div>
                        <div className="text-[10px] text-slate-400">{r.work_location}</div>
                      </td>
                      <td className="py-3 px-3">
                        {r.isExpired ? (
                          <div className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                            <LuTriangleAlert size={13} /> Expired on {new Date(r.expires_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-800 text-[11px]">
                              {r.daysLeft}d {r.hoursLeft % 24}h remaining
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Valid till {new Date(r.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">{renderStatusBadge(r)}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => copyLinkToClipboard(r.token)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="Copy External Upload Link"
                          >
                            <LuCopy size={14} />
                          </button>

                          {/* Open External Link in new tab */}
                          <a
                            href={portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="Preview Candidate Portal"
                          >
                            <LuExternalLink size={14} />
                          </a>

                          {/* View & Retrieve Documents Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(r);
                              setReviewRemarks(r.verification_remarks || "");
                              setShowDocModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                            title="Retrieve & Review Documents"
                          >
                            <LuEye size={13} />
                            <span>Docs ({r.docsCount || 0})</span>
                          </button>

                          {/* 1-Click Sync to Onboarding Button */}
                          {(r.status === "SUBMITTED" || r.status === "VERIFIED") && (
                            <button
                              type="button"
                              onClick={() => handleSyncToOnboarding(r.id, r.candidate_name)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                              title="Sync Docs to Onboarding Profile"
                            >
                              <LuUserCheck size={13} />
                              <span>Sync</span>
                            </button>
                          )}

                          {/* Regenerate / Extend 7 Days */}
                          <button
                            type="button"
                            onClick={() => handleRegenerate(r.id, r.candidate_name)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                            title="Regenerate / Extend 7 Days"
                          >
                            <LuClock size={14} />
                          </button>

                          {/* Delete Link */}
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id, r.candidate_name)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete link"
                          >
                            <LuTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Generate Pre-Joining Link */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <LuLink size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Generate Pre-Joining Candidate Link</h3>
                  <p className="text-[11px] text-slate-500">Link validity will be 7 days from generation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateLink} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Candidate Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.candidate_name}
                  onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Candidate Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={formData.candidate_email}
                    onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Offered Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering/Tech"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Day-1 Joining Date</label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Location</label>
                  <input
                    type="text"
                    value={formData.work_location}
                    onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>7-Day Security Policy:</strong> This candidate will have exactly 7 days from today to access the external portal and submit their documents. Once 7 days elapse, the link expires automatically.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Document Retrieval & Verification Desk */}
      {showDocModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  <LuFileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Document Retrieval: {selectedRecord.candidate_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedRecord.designation} • {selectedRecord.candidate_email} • Submitted:{" "}
                    {selectedRecord.submitted_at ? new Date(selectedRecord.submitted_at).toLocaleString() : "Not submitted yet"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
              {/* Top Banner Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[11px] text-slate-500">Current Status:</span>
                  <div className="mt-0.5">{renderStatusBadge(selectedRecord)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Digital E-Signature:</span>
                  <div className="font-bold text-slate-900">
                    {selectedRecord.digital_signature_name || "—"}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Submission IP:</span>
                  <div className="font-mono text-slate-700">{selectedRecord.submission_ip || "—"}</div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleSyncToOnboarding(selectedRecord.id, selectedRecord.candidate_name)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <LuUserCheck size={14} />
                    <span>Sync to Profile</span>
                  </button>
                </div>
              </div>

              {/* 1. KYC Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <LuShieldCheck className="text-blue-600" size={16} /> 1. KYC Documents (Government ID)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* PAN */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">PAN Card</span>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      {selectedRecord.kyc_documents?.pan_number || "—"}
                    </div>
                    {selectedRecord.kyc_documents?.pan_doc_url ? (
                      <a
                        href={getUploadUrl(selectedRecord.kyc_documents.pan_doc_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        <LuExternalLink size={12} /> View PAN File
                      </a>
                    ) : (
                      <div className="text-rose-500 text-[11px] mt-1 font-medium">No document uploaded</div>
                    )}
                  </div>

                  {/* Aadhaar */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Aadhaar Card</span>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      {selectedRecord.kyc_documents?.aadhaar_number || "—"}
                    </div>
                    {selectedRecord.kyc_documents?.aadhaar_doc_url ? (
                      <a
                        href={getUploadUrl(selectedRecord.kyc_documents.aadhaar_doc_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        <LuExternalLink size={12} /> View Aadhaar File
                      </a>
                    ) : (
                      <div className="text-rose-500 text-[11px] mt-1 font-medium">No document uploaded</div>
                    )}
                  </div>

                  {/* Photo */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                      {selectedRecord.kyc_documents?.photo_url ? (
                        <img
                          src={getUploadUrl(selectedRecord.kyc_documents.photo_url)}
                          alt="Candidate"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">Photo</div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Profile Photo</span>
                      {selectedRecord.kyc_documents?.photo_url ? (
                        <a
                          href={getUploadUrl(selectedRecord.kyc_documents.photo_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:text-blue-800 font-semibold mt-0.5"
                        >
                          View Full Photo
                        </a>
                      ) : (
                        <div className="text-slate-400 text-[11px]">Not uploaded</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Prior Employment & Relieving Letters */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <LuBriefcase className="text-blue-600" size={16} /> 2. Prior Employment & Relieving Certificates
                </h4>
                {selectedRecord.prior_employment?.is_fresher ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 font-semibold">
                    Candidate indicated they are a Fresher (No prior employment records required).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Previous Company</span>
                      <div className="font-bold text-slate-800">
                        {selectedRecord.prior_employment?.company_name || "—"}
                      </div>
                      <div className="text-slate-500">
                        Designation: {selectedRecord.prior_employment?.designation || "—"}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Uploaded Experience Files</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedRecord.prior_employment?.relieving_letter_url ? (
                          <a
                            href={getUploadUrl(selectedRecord.prior_employment.relieving_letter_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-semibold text-[11px] flex items-center gap-1"
                          >
                            <LuDownload size={12} /> Relieving Letter
                          </a>
                        ) : (
                          <span className="text-rose-500 text-[11px]">Relieving letter missing</span>
                        )}

                        {selectedRecord.prior_employment?.experience_cert_url && (
                          <a
                            href={getUploadUrl(selectedRecord.prior_employment.experience_cert_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded font-semibold text-[11px] flex items-center gap-1"
                          >
                            <LuDownload size={12} /> Experience Cert
                          </a>
                        )}
                      </div>

                      {/* Payslips */}
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                        {selectedRecord.prior_employment?.payslip_1_url && (
                          <a
                            href={getUploadUrl(selectedRecord.prior_employment.payslip_1_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-[11px]"
                          >
                            Payslip 1
                          </a>
                        )}
                        {selectedRecord.prior_employment?.payslip_2_url && (
                          <a
                            href={getUploadUrl(selectedRecord.prior_employment.payslip_2_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-[11px]"
                          >
                            Payslip 2
                          </a>
                        )}
                        {selectedRecord.prior_employment?.payslip_3_url && (
                          <a
                            href={getUploadUrl(selectedRecord.prior_employment.payslip_3_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-[11px]"
                          >
                            Payslip 3
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Bank Account Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <LuCreditCard className="text-blue-600" size={16} /> 3. Bank Account & Salary Credit Verification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Bank Name</span>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedRecord.bank_details?.bank_name || "—"}</div>
                    <div className="text-slate-500 mt-1">Holder: {selectedRecord.bank_details?.account_holder_name || "—"}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Account Number</span>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">{selectedRecord.bank_details?.account_number || "—"}</div>
                    <div className="text-slate-500 mt-1 font-mono">IFSC: {selectedRecord.bank_details?.ifsc_code || "—"}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Cancelled Cheque / Passbook</span>
                    {selectedRecord.bank_details?.cheque_doc_url ? (
                      <a
                        href={getUploadUrl(selectedRecord.bank_details.cheque_doc_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold block"
                      >
                        <LuExternalLink size={13} /> View Cheque Document
                      </a>
                    ) : (
                      <div className="text-rose-500 mt-1 font-semibold">Cheque copy missing</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Education & Personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Educational Degree</span>
                  <div className="font-bold text-slate-800">
                    {selectedRecord.educational_documents?.highest_qualification || "—"}
                  </div>
                  <div className="text-slate-500">
                    {selectedRecord.educational_documents?.degree_name} ({selectedRecord.educational_documents?.passing_year})
                  </div>
                  {selectedRecord.educational_documents?.marksheet_doc_url && (
                    <a
                      href={getUploadUrl(selectedRecord.educational_documents.marksheet_doc_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-semibold text-[11px] block mt-1"
                    >
                      View Degree Marksheet
                    </a>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Emergency Contact</span>
                  <div className="font-bold text-slate-800">
                    {selectedRecord.personal_details?.emergency_contact_name || "—"}
                  </div>
                  <div className="text-slate-500">
                    Phone: {selectedRecord.personal_details?.emergency_contact_phone || "—"} (
                    {selectedRecord.personal_details?.emergency_contact_relation || "Relation"})
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Blood Group: <strong>{selectedRecord.personal_details?.blood_group || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Remarks Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">HR Verification Remarks / Audit Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. All KYC documents verified against NSDL and Aadhaar portal. Cleared for Day 1 payroll setup."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("REJECTED")}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <LuCircleX size={15} />
                  <span>Reject Documents</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("VERIFIED")}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  <LuCircleCheck size={15} />
                  <span>Verify & Approve Docs</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
