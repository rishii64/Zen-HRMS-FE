import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "react-bootstrap";
import {
  LuCalendar,
  LuClock,
  LuMapPin,
  LuUsers,
  LuPlus,
  LuSearch,
  LuSend,
  LuCheck,
  LuEye,
  LuTrash2,
  LuPencil,
  LuBuilding2,
  LuBuilding,
  LuAlignLeft,
  LuSparkles,
  LuPartyPopper,
  LuX,
  LuTicket,
  LuGlobe,
  LuShieldCheck,
  LuPalette,
  LuLayoutGrid,
  LuList,
  LuCopy,
  LuMail,
  LuRefreshCw,
  LuChevronRight,
  LuCircleCheck,
  LuCircleAlert,
  LuFlame,
  LuPresentation,
  LuGraduationCap,
  LuBriefcase,
  LuShare2,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { getAuthRole, getAuthUser } from "../../utils/auth";

const THEME_CONFIGS = {
  purple: {
    id: "purple",
    name: "Cyber Violet",
    tagline: "Amethyst / Dream Neon",
    cardAccent: "from-purple-500 via-fuchsia-500 to-indigo-600",
    bgGradient: "from-slate-950 via-purple-950/90 to-slate-950",
    orb1: "bg-purple-600/35",
    orb2: "bg-fuchsia-600/25",
    accentText: "text-purple-400",
    accentBorder: "border-purple-500/40",
    badge: "bg-purple-500/20 text-purple-300 border-purple-400/40",
    ticketHolo: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 50%, #fde047 100%)",
    ticketText: "#3b0764",
    ticketSub: "#581c87",
    ticketBadge: "bg-purple-900/80 text-white",
    swatch: "from-purple-600 via-fuchsia-500 to-indigo-700",
    btnGradient: "from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500",
    glowRing: "ring-purple-500",
    lightChip: "bg-purple-50 text-purple-700 border-purple-200",
  },
  emerald: {
    id: "emerald",
    name: "Neon Emerald",
    tagline: "Electric Forest / Cyber",
    cardAccent: "from-emerald-500 via-teal-500 to-cyan-600",
    bgGradient: "from-slate-950 via-emerald-950/90 to-slate-950",
    orb1: "bg-emerald-600/35",
    orb2: "bg-teal-600/25",
    accentText: "text-emerald-400",
    accentBorder: "border-emerald-500/40",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    ticketHolo: "linear-gradient(135deg, #6ee7b7 0%, #38bdf8 50%, #fef08a 100%)",
    ticketText: "#064e3b",
    ticketSub: "#065f46",
    ticketBadge: "bg-emerald-900/80 text-white",
    swatch: "from-emerald-600 via-teal-500 to-cyan-700",
    btnGradient: "from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500",
    glowRing: "ring-emerald-500",
    lightChip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  blue: {
    id: "blue",
    name: "Sapphire Wave",
    tagline: "Royal Blue / Electric",
    cardAccent: "from-blue-500 via-indigo-500 to-cyan-600",
    bgGradient: "from-slate-950 via-blue-950/90 to-slate-950",
    orb1: "bg-blue-600/35",
    orb2: "bg-cyan-600/25",
    accentText: "text-blue-400",
    accentBorder: "border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-300 border-blue-400/40",
    ticketHolo: "linear-gradient(135deg, #93c5fd 0%, #c4b5fd 50%, #67e8f9 100%)",
    ticketText: "#1e3a8a",
    ticketSub: "#1e40af",
    ticketBadge: "bg-blue-900/80 text-white",
    swatch: "from-blue-600 via-indigo-500 to-cyan-700",
    btnGradient: "from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500",
    glowRing: "ring-blue-500",
    lightChip: "bg-blue-50 text-blue-700 border-blue-200",
  },
  sunset: {
    id: "sunset",
    name: "Sunset Magma",
    tagline: "Fire Energy / Golden",
    cardAccent: "from-amber-500 via-orange-500 to-rose-600",
    bgGradient: "from-slate-950 via-amber-950/90 to-slate-950",
    orb1: "bg-amber-600/35",
    orb2: "bg-rose-600/25",
    accentText: "text-amber-400",
    accentBorder: "border-amber-500/40",
    badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    ticketHolo: "linear-gradient(135deg, #fde047 0%, #fb7185 50%, #fdba74 100%)",
    ticketText: "#7c2d12",
    ticketSub: "#9a3412",
    ticketBadge: "bg-amber-900/80 text-white",
    swatch: "from-amber-500 via-orange-500 to-rose-700",
    btnGradient: "from-amber-600 via-orange-600 to-rose-700 hover:from-amber-500 hover:to-rose-500",
    glowRing: "ring-amber-500",
    lightChip: "bg-amber-50 text-amber-800 border-amber-200",
  },
};

const CATEGORY_LIST = [
  { name: "Townhall", icon: LuBuilding2, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { name: "Celebration", icon: LuPartyPopper, bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  { name: "Workshop", icon: LuGraduationCap, bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { name: "Presentation", icon: LuPresentation, bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  { name: "Meeting", icon: LuBriefcase, bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  { name: "Event", icon: LuTicket, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
];

const PRESET_TEMPLATES = [
  {
    label: "Annual Townhall",
    category: "Townhall",
    theme: "purple",
    title: "Annual Corporate Townhall & Tech Showcase 2026",
    content: "We cordially invite all company employees to the Annual Corporate Townhall 2026!\n\nAgenda includes executive keynote by the leadership team, quarterly business performance review, employee milestone recognitions, and a sneak peek into upcoming enterprise initiatives followed by high tea & networking.",
    startTime: "10:30 AM",
    endTime: "01:30 PM",
  },
  {
    label: "Festive Celebration",
    category: "Celebration",
    theme: "sunset",
    title: "Diwali & Cultural Festivities Evening",
    content: "Celebrate the season of joy together with the entire Zentelex family! Join us for a delightful evening filled with cultural performances, fun team trivia, prize distributions, and a gourmet dinner spread.",
    startTime: "04:30 PM",
    endTime: "08:00 PM",
  },
  {
    label: "Tech Workshop",
    category: "Workshop",
    theme: "emerald",
    title: "AI & Modern Engineering Excellence Hands-on Workshop",
    content: "An intensive interactive knowledge-sharing workshop on adopting generative AI in our engineering and product workflows. Bring your laptops for live coding and architecture demos.",
    startTime: "02:00 PM",
    endTime: "05:00 PM",
  },
  {
    label: "Quarterly Review",
    category: "Presentation",
    theme: "blue",
    title: "Q3 Business Performance & Strategy Alignment Meet",
    content: "Departmental heads and leadership team will present Q3 achievements, customer satisfaction scores, and roadmap priorities for the upcoming quarters.",
    startTime: "11:00 AM",
    endTime: "01:00 PM",
  },
];

export default function HREvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "timeline"

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTab, setPreviewTab] = useState("ticket"); // "ticket" | "email"
  const [editingEventId, setEditingEventId] = useState(null);
  const [previewEvent, setPreviewEvent] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("purple");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    event_name: "",
    event_category: "Townhall",
    company_name: "Zentelex",
    branch_location: "Kolkata HQ (Main Campus)",
    address: "Auditorium Hall 1, 5th Floor, Tower B, Salt Lake Sector V, Kolkata 700091",
    event_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    start_time: "10:30 AM",
    end_time: "01:30 PM",
    content: "",
    sign_off: "HR Team",
    target_audience: "All Employees",
    status: "Draft",
    theme: "purple",
  });

  const currentUser = getAuthUser() || {};
  const userRole = (getAuthRole() || localStorage.getItem("role") || "").toLowerCase().trim();
  const canManageEvents = [
    "hr",
    "admin",
    "management",
    "hrmanager",
    "ceo",
    "coo",
    "cto",
    "cfo",
    "vp",
    "secretary",
  ].includes(userRole);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hr-events");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setEvents(res.data.data);
      }
    } catch (err) {
      console.error("Error loading HR Events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const resetForm = () => {
    setFormData({
      event_name: "",
      event_category: "Townhall",
      company_name: currentUser.company_name || "Zentelex",
      branch_location: currentUser.work_location || "Kolkata HQ (Main Campus)",
      address: "Auditorium Hall 1, 5th Floor, Tower B, Salt Lake Sector V, Kolkata 700091",
      event_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      start_time: "10:30 AM",
      end_time: "01:30 PM",
      content:
        "Join us for our upcoming company-wide corporate gathering! We will be discussing quarterly milestones, employee recognitions, and major updates from leadership followed by high tea & networking.",
      sign_off: "HR Team",
      target_audience: "All Employees",
      status: "Draft",
      theme: "purple",
    });
    setSelectedTheme("purple");
    setEditingEventId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (evt) => {
    setFormData({
      event_name: evt.event_name,
      event_category: evt.event_category || "Event",
      company_name: evt.company_name || "Zentelex",
      branch_location: evt.branch_location || "Kolkata HQ (Main Campus)",
      address: evt.address || "",
      event_date: evt.event_date,
      start_time: evt.start_time || "10:00 AM",
      end_time: evt.end_time || "01:00 PM",
      content: evt.content || "",
      sign_off: evt.sign_off || "HR Team",
      target_audience: evt.target_audience || "All Employees",
      status: evt.status || "Draft",
      theme: evt.theme || "purple",
    });
    setSelectedTheme(evt.theme || "purple");
    setEditingEventId(evt.id);
    setShowCreateModal(true);
  };

  const applyPresetTemplate = (preset) => {
    setFormData((prev) => ({
      ...prev,
      event_name: preset.title,
      event_category: preset.category,
      content: preset.content,
      theme: preset.theme,
      start_time: preset.startTime,
      end_time: preset.endTime,
    }));
    setSelectedTheme(preset.theme);
    toast.success(`Loaded "${preset.label}" template`);
  };

  const handleSaveAndPreview = async (e) => {
    if (e) e.preventDefault();

    if (!formData.event_name.trim()) {
      toast.error("Please enter an event title");
      return;
    }
    if (!formData.event_date) {
      toast.error("Please select an event date");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Please enter event agenda or description");
      return;
    }

    try {
      setIsSubmitting(true);
      let savedEvent = null;

      if (editingEventId) {
        const res = await api.put(`/hr-events/${editingEventId}`, formData);
        savedEvent = res.data.data;
        toast.success("Event updated successfully!");
      } else {
        const res = await api.post("/hr-events", formData);
        savedEvent = res.data.data;
        toast.success("Event saved successfully!");
      }

      await loadEvents();
      setPreviewEvent(savedEvent || { ...formData, theme: selectedTheme });
      setSelectedTheme((savedEvent && savedEvent.theme) || formData.theme || selectedTheme);
      setShowCreateModal(false);
      setShowPreviewModal(true);
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.event_name.trim()) {
      toast.error("Please enter an event title");
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingEventId) {
        await api.put(`/hr-events/${editingEventId}`, { ...formData, status: "Draft" });
        toast.success("Draft updated successfully");
      } else {
        await api.post("/hr-events", { ...formData, status: "Draft" });
        toast.success("Saved as draft successfully");
      }
      await loadEvents();
      setShowCreateModal(false);
    } catch (err) {
      console.error("Save draft error:", err);
      toast.error("Failed to save draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBroadcast = async (eventId) => {
    const targetId = eventId || previewEvent?.id || editingEventId;
    if (!targetId) {
      toast.error("Event ID not found");
      return;
    }

    try {
      setIsBroadcasting(true);
      const res = await api.post(`/hr-events/${targetId}/broadcast`);
      if (res.data?.success) {
        toast.success(
          res.data.message ||
          "Event announcement sent to all employee work emails successfully!"
        );
        setShowPreviewModal(false);
        await loadEvents();
      } else {
        toast.error(res.data?.message || "Failed to broadcast announcement");
      }
    } catch (err) {
      console.error("Broadcast error:", err);
      toast.error(
        err.response?.data?.message ||
        "Failed to send email to employees. Check mail server settings."
      );
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event announcement?")) return;
    try {
      await api.delete(`/hr-events/${id}`);
      toast.success("Event deleted successfully");
      loadEvents();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete event");
    }
  };

  const openPreview = (evt) => {
    setPreviewEvent(evt);
    setSelectedTheme(evt.theme || "purple");
    setPreviewTab("ticket");
    setShowPreviewModal(true);
  };

  const handleCopySummary = (evt) => {
    const summary = `🎟️ ${evt.event_name}
📅 Date: ${evt.event_date}
⏰ Time: ${formatTimeRangeDisplay(evt.start_time, evt.end_time)}
📍 Location: ${evt.branch_location || "HQ"} ${evt.address ? `(${evt.address})` : ""}

${evt.content}

Statutory Sign-off: ${evt.sign_off || "HR Team"}, ${evt.company_name || "Zentelex"}`;

    navigator.clipboard.writeText(summary);
    toast.success("Event summary copied to clipboard!");
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        evt.event_name?.toLowerCase().includes(q) ||
        evt.company_name?.toLowerCase().includes(q) ||
        evt.branch_location?.toLowerCase().includes(q) ||
        evt.content?.toLowerCase().includes(q);

      const matchesCat =
        selectedCategory === "All" || evt.event_category === selectedCategory;

      const matchesStatus =
        selectedStatus === "All" || evt.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [events, search, selectedCategory, selectedStatus]);

  // Key KPI stats
  const totalEventsCount = events.length;
  const sentEventsCount = events.filter((e) => e.status === "Sent").length;
  const draftEventsCount = events.filter((e) => e.status === "Draft").length;
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((e) => e.event_date && new Date(e.event_date) >= today)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  }, [events]);

  const upcomingCount = upcomingEvents.length;
  const nextEvent = upcomingEvents[0];

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return { shortMonth: "TBD", dayNum: "--", full: "To be scheduled", relative: "" };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return { shortMonth: "EVT", dayNum: "26", full: dateStr, relative: "" };
      }
      const shortMonth = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      const dayNum = String(d.getDate()).padStart(2, "0");
      const full = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Relative badge calculation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(d);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

      let relative = "";
      if (diffDays === 0) relative = "Today";
      else if (diffDays === 1) relative = "Tomorrow";
      else if (diffDays > 1 && diffDays <= 7) relative = `In ${diffDays} days`;
      else if (diffDays > 7) relative = `In ${Math.ceil(diffDays / 7)}w`;
      else relative = "Past";

      return { shortMonth, dayNum, full, relative };
    } catch (_) {
      return { shortMonth: "EVT", dayNum: "26", full: dateStr, relative: "" };
    }
  };

  const formatTimeToIST = (timeStr) => {
    if (!timeStr) return "";
    const trimmed = String(timeStr).trim();
    if (!trimmed) return "";
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const ampm = ampmMatch[3].toUpperCase();
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${strHours}:${minutes} ${ampm}`;
    }
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      let hours = parseInt(match24[1], 10);
      const minutes = match24[2];
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${strHours}:${minutes} ${ampm}`;
    }
    return trimmed;
  };

  const formatTimeRangeDisplay = (start, end) => {
    const s = formatTimeToIST(start);
    const e = formatTimeToIST(end);
    if (s && e) return `${s} – ${e} (IST)`;
    if (s) return `${s} (IST)`;
    if (e) return `${e} (IST)`;
    return "As scheduled";
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ============================================================ */}
        {/* TOP HERO BANNER & KPI METRICS (Modern Glassmorphic Light)    */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-sm p-6 md:p-8">
          {/* Subtle Ambient Gradient Blobs */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-blue-500/10 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Top Row: Title, Live Sync Status & Action Buttons */}
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-2xs">
                  <LuPartyPopper className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
                  Corporate Event Desk
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Employee Broadcast Sync
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                HR Events & Townhall Hub
              </h1>
              <p className="text-slate-600 text-sm max-w-2xl mt-1 leading-relaxed">
                Design engaging holographic event passes, preview high-converting email invitations, and broadcast company gatherings directly to all employee inboxes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={loadEvents}
                title="Refresh Events"
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-semibold shadow-2xs transition-all active:scale-95"
              >
                <LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>

              {canManageEvents && (
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <LuPlus className="w-4 h-4" />
                  <span>Create New Event</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Interactive KPI Metric Cards */}
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            {/* Total Events */}
            <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Events</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuCalendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{totalEventsCount}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Recorded in database</div>
            </div>

            {/* Upcoming */}
            <div className="bg-indigo-50/40 hover:bg-white rounded-2xl p-4 border border-indigo-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-indigo-900 text-xs font-bold uppercase tracking-wider">Upcoming</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuClock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 tracking-tight">{upcomingCount}</div>
              <div className="text-xs text-indigo-700 font-medium truncate mt-0.5">
                {nextEvent ? `Next: ${nextEvent.event_name}` : "None scheduled"}
              </div>
            </div>

            {/* Broadcasted / Sent */}
            <div className="bg-emerald-50/40 hover:bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-900 text-xs font-bold uppercase tracking-wider">Broadcasted</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuSend className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 tracking-tight">{sentEventsCount}</div>
              <div className="text-xs text-emerald-700 font-medium mt-0.5">Delivered to work inboxes</div>
            </div>

            {/* Drafts */}
            <div className="bg-amber-50/40 hover:bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-900 text-xs font-bold uppercase tracking-wider">Drafts</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuPencil className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 tracking-tight">{draftEventsCount}</div>
              <div className="text-xs text-amber-700 font-medium mt-0.5">Pending preview & send</div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* INTERACTIVE CONTROLS: CATEGORY TABS, SEARCH & VIEW SWITCHER   */}
        {/* ============================================================ */}
        <div className="space-y-3">
          {/* Category Quick Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${selectedCategory === "All"
                  ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
            >
              <span>All Categories</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedCategory === "All" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                {events.length}
              </span>
            </button>

            {CATEGORY_LIST.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              const count = events.filter((e) => e.event_category === cat.name).length;
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${isSelected
                      ? `${cat.bg} ${cat.text} border-2 ${cat.border} ring-2 ring-indigo-500/20 shadow-2xs`
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 font-extrabold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Bar + Status Filter + View Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by event title, location, or agenda content..."
                className="w-full pl-10 pr-9 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <LuX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Segmented Buttons & View Switcher */}
            <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
              {/* Status Segment */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
                {["All", "Sent", "Draft"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${selectedStatus === st
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {st === "All" ? "All Status" : st === "Sent" ? "Broadcasted" : "Drafts"}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid Posters View"
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  <LuLayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  title="Agenda Timeline View"
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "timeline"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  <LuList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* EVENTS LIST: GRID VIEW & TIMELINE VIEW                       */}
        {/* ============================================================ */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs">
            <div className="inline-block animate-spin w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
            <p className="text-sm font-bold text-slate-700">Loading Corporate Events...</p>
            <p className="text-xs text-slate-400 mt-1">Connecting to HR event scheduling desk</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-14 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 flex items-center justify-center mx-auto mb-3.5 border border-indigo-100 shadow-inner">
              <LuCalendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">No events found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {search || selectedCategory !== "All" || selectedStatus !== "All"
                ? "No corporate events match your selected filters. Try resetting search or category parameters."
                : "No company-wide gatherings or townhalls have been scheduled yet. Create an invitation to get started!"}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {(search || selectedCategory !== "All" || selectedStatus !== "All") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("All");
                    setSelectedStatus("All");
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  Clear Filters
                </button>
              )}
              {canManageEvents && (
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  <LuPlus className="w-4 h-4" />
                  <span>Create First Event</span>
                </button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* ---------------- GRID POSTERS VIEW ---------------- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const isSent = evt.status === "Sent";
              const theme = THEME_CONFIGS[evt.theme] || THEME_CONFIGS.purple;
              const dateMeta = formatDateDisplay(evt.event_date);
              const catObj = CATEGORY_LIST.find((c) => c.name === evt.event_category) || CATEGORY_LIST[0];
              const CatIcon = catObj.icon;

              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
                >
                  {/* Card Top Vibrant Color Bar matching theme */}
                  <div className={`h-2.5 w-full bg-gradient-to-r ${theme.cardAccent}`} />

                  {/* Card Content Area */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${catObj.bg} ${catObj.text} ${catObj.border}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{evt.event_category || "Event"}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {dateMeta.relative && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dateMeta.relative === "Today"
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : dateMeta.relative === "Tomorrow"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                              {dateMeta.relative}
                            </span>
                          )}

                          {isSent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <LuCircleCheck className="w-3 h-3 text-emerald-600" />
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Draft
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ticket Stub Date + Event Title Header */}
                      <div className="flex items-start gap-3.5 mb-3">
                        {/* Calendar Ticket Date Stub */}
                        <div className="flex-shrink-0 w-13 rounded-2xl bg-slate-900 text-white p-2 text-center shadow-inner border border-slate-800">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {dateMeta.shortMonth}
                          </span>
                          <span className="block text-xl font-black tracking-tight leading-none text-white my-0.5">
                            {dateMeta.dayNum}
                          </span>
                          <span className="block text-[8px] font-bold text-slate-400">
                            2026
                          </span>
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                            {evt.event_name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                            <LuClock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span>{formatTimeRangeDisplay(evt.start_time, evt.end_time)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Location & Venue details */}
                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/80 rounded-2xl p-3 border border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                          <LuMapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          <span className="font-bold text-slate-800 truncate">
                            {evt.branch_location || "Company Campus"}
                          </span>
                        </div>
                        {evt.address && (
                          <div className="text-[11px] text-slate-500 truncate pl-5">
                            {evt.address}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span className="truncate">{evt.company_name || "Zentelex"}</span>
                          <span className="font-bold text-slate-700">{evt.sign_off || "HR Team"}</span>
                        </div>
                      </div>

                      {/* Content Agenda Preview */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {evt.content}
                      </p>
                    </div>

                    {/* Miniature Theme Swatch Tag */}
                    <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: theme.ticketHolo }} />
                        <span className="text-[11px] font-semibold text-slate-500">{theme.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">VIP Holographic Pass</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-3.5 pb-3.5 pt-2 bg-slate-200 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openPreview(evt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-400 text-slate-700 hover:text-blue-600 text-xs font-bold shadow-2xs hover:shadow transition-all"
                    >
                      <LuEye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Preview Pass</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopySummary(evt)}
                        title="Copy Summary"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-all"
                      >
                        <LuCopy className="w-3.5 h-3.5" />
                      </button>

                      {canManageEvents && !isSent && (
                        <button
                          onClick={() => handleBroadcast(evt.id)}
                          disabled={isBroadcasting}
                          title="Broadcast email to all employees"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95"
                        >
                          <LuSend className="w-3 h-3" />
                          <span>Send</span>
                        </button>
                      )}

                      {canManageEvents && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(evt)}
                            title="Edit Event"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-white transition-all"
                          >
                            <LuPencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(evt.id)}
                            title="Delete Event"
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white transition-all"
                          >
                            <LuTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ---------------- TIMELINE / AGENDA LIST VIEW ---------------- */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Chronological Event Schedule</span>
              <span>Showing {filteredEvents.length} Gatherings</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => {
                const isSent = evt.status === "Sent";
                const dateMeta = formatDateDisplay(evt.event_date);
                const theme = THEME_CONFIGS[evt.theme] || THEME_CONFIGS.purple;

                return (
                  <div
                    key={evt.id}
                    className="p-4 md:p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* Left: Date & Time Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 rounded-2xl bg-slate-900 text-white p-2 text-center flex-shrink-0 shadow-inner">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                          {dateMeta.shortMonth}
                        </span>
                        <span className="block text-xl font-black text-white">
                          {dateMeta.dayNum}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {evt.event_category || "Event"}
                          </span>
                          {isSent ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <LuCircleCheck className="w-3 h-3" /> Broadcasted
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Draft
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors">
                          {evt.event_name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <LuClock className="w-3.5 h-3.5 text-blue-600" />
                            {formatTimeRangeDisplay(evt.start_time, evt.end_time)}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <LuMapPin className="w-3.5 h-3.5 text-rose-500" />
                            {evt.branch_location}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => openPreview(evt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 text-xs font-bold shadow-2xs"
                      >
                        <LuEye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {canManageEvents && !isSent && (
                        <button
                          onClick={() => handleBroadcast(evt.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs"
                        >
                          <LuSend className="w-3 h-3" />
                          <span>Broadcast</span>
                        </button>
                      )}

                      {canManageEvents && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(evt)}
                            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white"
                          >
                            <LuPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(evt.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODAL 1: EVENT CREATION / EDITING STUDIO                     */}
        {/* (ENHANCED MATERIAL STUDIO WITH QUICK PRESETS & COLOR PICKS)  */}
        {/* ============================================================ */}
        <Modal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          centered
          size="lg"
          contentClassName="border-0 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-white p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            {/* Top Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <LuSparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-none">
                    {editingEventId ? "Edit Corporate Event" : "Create Corporate Event & Announcement"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure official details, venue, holographic pass, and statutory sign-off
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Presets Bar */}
            {!editingEventId && (
              <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <LuSparkles className="w-3.5 h-3.5 text-amber-500" />
                    Quick Autofill Presets:
                  </span>
                  <span className="text-[10px] text-slate-400">Click to load starter agenda</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_TEMPLATES.map((pst) => (
                    <button
                      key={pst.label}
                      type="button"
                      onClick={() => applyPresetTemplate(pst)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold shadow-2xs transition-all"
                    >
                      {pst.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Event Title Input */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Event Title / Headline *
              </label>
              <input
                type="text"
                placeholder="e.g. Annual Corporate Townhall & Tech Showcase 2026"
                className="w-full text-base md:text-lg font-bold text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                autoFocus
              />
            </div>

            {/* Category Pills */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Event Category
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORY_LIST.map((cat) => {
                  const isSelected = formData.event_category === cat.name;
                  const IconC = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, event_category: cat.name })}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSelected
                          ? `${cat.bg} ${cat.text} ring-2 ring-indigo-500/30 border ${cat.border} shadow-2xs`
                          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      <IconC className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                      {isSelected && <LuCheck className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Audience Row with Avatars */}
            <div className="flex items-center justify-between p-3 mb-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center gap-3">
                <LuUsers className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Target Recipient Audience</div>
                  <div className="text-[11px] text-slate-500">Official company-wide dispatch list</div>
                </div>
              </div>

              <select
                className="text-xs font-bold px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-indigo-900 focus:outline-none"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              >
                <option value="All Employees">All Active Employees</option>
                <option value="Headquarters Only">Headquarters Staff Only</option>
                <option value="Leadership Team">Leadership & Managers</option>
              </select>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Date Input */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <LuCalendar className="w-4 h-4 text-blue-600" />
                  <span>Event Date *</span>
                </label>
                <input
                  type="date"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>

              {/* Time Range */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <LuClock className="w-4 h-4 text-blue-600" />
                    <span>Time Window (IST)</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    placeholder="10:30 AM"
                    className="w-1/2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                  <span className="text-xs font-bold text-slate-400">–</span>
                  <input
                    type="time"
                    placeholder="01:30 PM"
                    className="w-1/2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Branch Location & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <LuMapPin className="w-4 h-4 text-rose-500" />
                  <span>Branch / Campus Location</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kolkata HQ (Main Campus)"
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={formData.branch_location}
                  onChange={(e) => setFormData({ ...formData, branch_location: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <LuBuilding className="w-4 h-4 text-slate-500" />
                  <span>Venue / Floor Address</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Auditorium Hall 1, 5th Floor, Tower B"
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            {/* Description / Agenda Textarea */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <LuAlignLeft className="w-4 h-4 text-blue-600" />
                <span>Event Overview & Agenda Content *</span>
              </label>
              <textarea
                rows={4}
                placeholder="Detail the agenda, schedule highlights, chief speakers, or high-tea details..."
                className="w-full text-xs md:text-sm text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all leading-relaxed"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            {/* Company Name & Statutory Sign-off */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Statutory Sign-off (Bottom Right)
                </label>
                <input
                  type="text"
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={formData.sign_off}
                  onChange={(e) => setFormData({ ...formData, sign_off: e.target.value })}
                  placeholder="HR Team"
                />
              </div>
            </div>

            {/* Theme & Holographic Pass Style Selector */}
            <div className="pt-4 border-t border-slate-100 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <LuPalette className="w-4 h-4 text-indigo-600" />
                  Choose Holographic VIP Pass Theme:
                </span>
                <span className="text-[11px] text-slate-400">Affects Pass and Email Header</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.values(THEME_CONFIGS).map((thm) => {
                  const isAct = (formData.theme || selectedTheme) === thm.id;
                  return (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, theme: thm.id });
                        setSelectedTheme(thm.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${isAct
                          ? `${thm.accentBorder} ring-2 ${thm.glowRing} bg-slate-900 text-white shadow-md scale-102`
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                      <div className={`w-full h-8 rounded-xl bg-gradient-to-r ${thm.swatch} mb-2 shadow-inner`} />
                      <div className="text-xs font-bold truncate">{thm.name}</div>
                      <div className="text-[10px] opacity-70 truncate">{thm.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="text-xs md:text-sm font-bold text-slate-600 hover:text-blue-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Save as draft
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs md:text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPreview}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-bold text-xs md:text-sm shadow-md transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <LuEye className="w-4 h-4" />
                      <span>Save & Preview Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* ============================================================ */}
        {/* MODAL 2: COLORFUL HIGH-CONVERTING TEMPLATE PREVIEW           */}
        {/* WITH HOLOGRAPHIC VIP PASS, EMAIL PREVIEW & BROADCAST ACTIONS */}
        {/* ============================================================ */}
        <Modal
          show={showPreviewModal}
          onHide={() => setShowPreviewModal(false)}
          centered
          size="xl"
          contentClassName="border-0 rounded-3xl shadow-2xl overflow-hidden bg-slate-950"
        >
          {(() => {
            const activeTheme = THEME_CONFIGS[selectedTheme] || THEME_CONFIGS.purple;
            const dateMeta = formatDateDisplay(previewEvent?.event_date);

            return (
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-5 md:p-8">
                {/* Ambient glowing neon orbs matching selected theme */}
                <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none ${activeTheme.orb1}`} />
                <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none ${activeTheme.orb2}`} />

                {/* Top Bar with View Mode Toggle */}
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                      <LuTicket className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Official Event Desk
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Corporate Event Invitation Preview</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${activeTheme.badge}`}>
                          {activeTheme.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle between Holographic Pass and Email Newsletter Preview */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-1 bg-white/10 rounded-xl border border-white/10 text-xs">
                      <button
                        onClick={() => setPreviewTab("ticket")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${previewTab === "ticket"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-300 hover:text-white"
                          }`}
                      >
                        <LuTicket className="w-3.5 h-3.5" />
                        <span>VIP Pass View</span>
                      </button>
                      <button
                        onClick={() => setPreviewTab("email")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${previewTab === "email"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-300 hover:text-white"
                          }`}
                      >
                        <LuMail className="w-3.5 h-3.5" />
                        <span>Email Inbox View</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/15 transition-all border border-white/10"
                    >
                      <LuX className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Main Modal Body */}
                {previewTab === "ticket" ? (
                  /* ================= TAB 1: VIP HOLOGRAPHIC PASS VIEW ================= */
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                    {/* LEFT COLUMN: EVENT DETAILS & SPECIFICATIONS (7 COLS) */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Creator row */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-300">
                        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
                          HR
                        </span>
                        <span>
                          Organized by <strong className="text-white">{previewEvent?.company_name || "Zentelex"}</strong> &bull; Human Resources
                        </span>
                      </div>

                      {/* Event Title */}
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border backdrop-blur-sm shadow-sm bg-white/10 border-white/20">
                          <LuPartyPopper className="w-3.5 h-3.5 text-pink-400" />
                          <span>{previewEvent?.event_category || "Company Event"}</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                          {previewEvent?.event_name || "Annual Corporate Townhall 2026"}
                        </h1>
                      </div>

                      {/* Date & Time Row */}
                      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                        <div className="bg-slate-900/90 border border-white/15 rounded-2xl p-3 text-center min-w-[70px] shadow-inner flex flex-col justify-center">
                          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            {dateMeta.shortMonth}
                          </span>
                          <span className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            {dateMeta.dayNum}
                          </span>
                        </div>

                        <div className="flex-1 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400 font-semibold w-12">Date:</span>
                            <span className="font-bold text-white">{dateMeta.full}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400 font-semibold w-12">Time:</span>
                            <span className={`font-mono font-bold ${activeTheme.accentText}`}>
                              {formatTimeRangeDisplay(previewEvent?.start_time, previewEvent?.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-white/10">
                            <LuGlobe className="w-3.5 h-3.5 text-blue-400" />
                            <span>GMT +05:30 Asia/Kolkata (Indian Standard Time)</span>
                          </div>
                        </div>
                      </div>

                      {/* Location Card */}
                      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                          <LuMapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white">
                            {previewEvent?.branch_location || "Kolkata HQ (Main Campus)"}
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                            {previewEvent?.address || "Auditorium Hall 1, 5th Floor, Tower B, Salt Lake Sector V, Kolkata 700091"}
                          </div>
                        </div>
                      </div>

                      {/* Agenda & Overview Block */}
                      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Event Overview & Agenda
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-md">
                            Official Broadcast
                          </span>
                        </div>
                        <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-black/20 p-3 rounded-xl border border-white/5">
                          {previewEvent?.content || "No agenda details provided."}
                        </div>
                      </div>

                      {/* STATUTORY SIGN-OFF ON BOTTOM RIGHT */}
                      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <LuShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>Statutory Verified Communication</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 italic mb-0.5">With warm regards,</p>
                          <p className="text-lg font-black text-white tracking-tight">
                            {previewEvent?.sign_off || "HR Team"}
                          </p>
                          <p className={`text-xs font-bold ${activeTheme.accentText}`}>
                            {previewEvent?.company_name || "Zentelex"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: HOLOGRAPHIC VIP PASS + THEME PICKER (5 COL) */}
                    <div className="lg:col-span-5 space-y-5">
                      {/* The Holographic VIP Ticket Pass */}
                      <div className="relative group">
                        <div
                          className="rounded-3xl p-6 text-slate-900 relative shadow-2xl transition-all duration-300 transform -rotate-1 hover:rotate-0 hover:scale-102 border-2 border-white/60 overflow-hidden"
                          style={{
                            background: activeTheme.ticketHolo,
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/15 pointer-events-none" />

                          {/* Cutout notch semicircles on left and right */}
                          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950 border-r-2 border-white/60 shadow-inner" />
                          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950 border-l-2 border-white/60 shadow-inner" />

                          {/* Top admission banner */}
                          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-3 opacity-80 border-b pb-2 border-black/15">
                            <span>✦ YOU ARE INVITED ✦</span>
                            <span>★ OFFICIAL ADMISSION ★</span>
                          </div>

                          {/* Main punchy ticket headline */}
                          <div className="my-2">
                            <h2
                              className="text-2xl font-black uppercase tracking-tight leading-snug"
                              style={{ color: activeTheme.ticketText }}
                            >
                              {previewEvent?.event_name || "Annual Corporate Townhall 2026"}
                            </h2>
                            <p
                              className="text-xs font-bold uppercase tracking-wider mt-1 opacity-80"
                              style={{ color: activeTheme.ticketSub }}
                            >
                              {previewEvent?.company_name || "Zentelex"} &bull; {previewEvent?.event_category || "Event"}
                            </p>
                          </div>

                          {/* Key badges inside the ticket */}
                          <div className="my-3 py-2 px-3 rounded-xl bg-black/10 border border-black/10 flex items-center justify-between text-xs font-bold">
                            <span>📅 {dateMeta.shortMonth} {dateMeta.dayNum}, 2026</span>
                            <span>⏰ {formatTimeToIST(previewEvent?.start_time) || "10:30 AM"}</span>
                          </div>

                          {/* Location note */}
                          <div className="text-[11px] font-semibold opacity-85 truncate mb-2">
                            📍 {previewEvent?.branch_location || "Kolkata HQ"}
                          </div>

                          {/* Ticket Bottom Bar: Barcode & Serial */}
                          <div className="pt-2 border-t border-black/15 flex items-center justify-between gap-2 mt-3">
                            <div className="font-mono text-xs font-black tracking-widest leading-none">
                              ||||||||||||||||||||||
                            </div>
                            <span className="text-[10px] font-mono font-bold tracking-wider opacity-80">
                              #HR-VIP-2026
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Theme Presets Switcher inside modal */}
                      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                            Theme Switcher
                          </span>
                          <span className="text-[11px] text-slate-400">Click to preview style</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {Object.values(THEME_CONFIGS).map((thm) => {
                            const isCur = selectedTheme === thm.id;
                            return (
                              <button
                                key={thm.id}
                                type="button"
                                onClick={() => setSelectedTheme(thm.id)}
                                className={`p-2.5 rounded-xl border text-left transition-all ${isCur
                                    ? `border-white ring-2 ${thm.glowRing} bg-white/15 scale-102 shadow-lg`
                                    : "border-white/10 bg-white/5 hover:bg-white/10 opacity-75 hover:opacity-100"
                                  }`}
                              >
                                <div className={`w-full h-7 rounded-lg bg-gradient-to-r ${thm.swatch} mb-1.5 flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}>
                                  {thm.name.split(" ")[0]}
                                </div>
                                <div className="text-[11px] font-bold text-white truncate">{thm.name}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= TAB 2: EMAIL NEWSLETTER INBOX VIEW ================= */
                  <div className="relative z-10 max-w-2xl mx-auto bg-slate-900 rounded-3xl p-4 md:p-6 border border-white/15 shadow-2xl">
                    <div className="bg-slate-950 p-3 rounded-2xl border border-white/10 mb-4 flex items-center justify-between text-xs text-slate-400">
                      <div>
                        <strong>From:</strong> {previewEvent?.company_name || "Zentelex"} HR Team &lt;hr@{previewEvent?.company_name?.toLowerCase() || "zentelex"}.com&gt;
                      </div>
                      <div className="text-emerald-400 font-bold">Email Preview</div>
                    </div>

                    {/* Email Container Simulation */}
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-lg">
                      {/* Email Header */}
                      <div
                        className="p-6 text-center text-white"
                        style={{ background: activeTheme.ticketHolo }}
                      >
                        <div className="inline-block px-3 py-1 rounded-full bg-black/20 text-[10px] font-extrabold uppercase tracking-widest text-white mb-2">
                          ★ {previewEvent?.event_category || "Company Event"} • OFFICIAL INVITATION ★
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 m-0 leading-tight">
                          {previewEvent?.company_name || "Zentelex"}
                        </h2>
                        <p className="text-xs font-semibold text-slate-800 m-0 mt-1 opacity-90">
                          Human Resources Operations • Corporate Event Desk
                        </p>
                      </div>

                      {/* Email Content Body */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-xl font-black text-slate-900 m-0">
                          {previewEvent?.event_name}
                        </h3>

                        {/* Details Table */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500">📅 Date:</span>
                            <span className="font-bold text-slate-900">{dateMeta.full}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500">⏰ Time:</span>
                            <span className="font-bold text-indigo-700">{formatTimeRangeDisplay(previewEvent?.start_time, previewEvent?.end_time)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500">📍 Location:</span>
                            <span className="font-bold text-slate-900">{previewEvent?.branch_location}</span>
                          </div>
                        </div>

                        {/* Overview */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Agenda & Overview
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line border-l-4 border-indigo-600">
                            {previewEvent?.content}
                          </div>
                        </div>

                        {/* Sign-off */}
                        <div className="pt-4 border-t border-slate-200 text-right text-xs">
                          <span className="text-slate-400 italic">With warm regards,</span>
                          <div className="text-base font-black text-slate-900 mt-0.5">
                            {previewEvent?.sign_off || "HR Team"}
                          </div>
                          <div className="text-xs font-bold text-indigo-600">
                            {previewEvent?.company_name || "Zentelex"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 mt-7 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPreviewModal(false);
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-sm transition-all"
                    >
                      &larr; Back to Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => previewEvent && handleCopySummary(previewEvent)}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-sm transition-all inline-flex items-center gap-1.5"
                    >
                      <LuCopy className="w-3.5 h-3.5" />
                      <span>Copy Summary</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(false)}
                      className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-all"
                    >
                      Close Preview
                    </button>

                    {canManageEvents && (
                      <button
                        type="button"
                        onClick={() => handleBroadcast(previewEvent?.id)}
                        disabled={isBroadcasting}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r ${activeTheme.btnGradient} text-white text-xs font-bold shadow-lg hover:shadow-xl transition-all w-full sm:w-auto active:scale-98`}
                      >
                        {isBroadcasting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Broadcasting to Employee Work Inboxes...</span>
                          </>
                        ) : (
                          <>
                            <LuSend className="w-4 h-4" />
                            <span>Send Announcement to All Employees</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })()}
        </Modal>

      </div>
    </div>
  );
}
