import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Spinner,
  Badge,
  Table,
  Modal,
} from "react-bootstrap";
import toast from "react-hot-toast";
import {
  LuBriefcase,
  LuCalendar,
  LuDownload,
  LuCircleCheck,
  LuCircleX,
  LuBuilding2,
  LuClock,
  LuShieldCheck,
  LuFileText,
  LuArrowRight,
  LuMapPin,
  LuUsers,
} from "react-icons/lu";
import { getApiBaseUrl } from "../../api/axios";
import {
  formatINR,
  formatPDFAmount,
  amountInWords,
  formatDateStr,
  generateOfferLetterPDF,
} from "../../utils/exitLetterGenerators";

const API = getApiBaseUrl();

export default function CandidateOfferAcceptance() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [signatureName, setSignatureName] = useState("");
  const [confirmedJoiningDate, setConfirmedJoiningDate] = useState("");
  const [comments, setComments] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Decline Modal
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Fetch Offer by Public Token
  useEffect(() => {
    const fetchOffer = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/offers/candidate-view/${token}`);
        const data = await res.json();
        if (data.success && data.data) {
          setOffer(data.data);
          setIsExpired(!!data.isExpired);
          setSignatureName(data.data.candidate_name || "");
          setConfirmedJoiningDate(data.data.joining_date || "");
        } else {
          setErrorMsg(data.error || "Invalid or expired offer link.");
        }
      } catch (err) {
        console.error("Fetch offer error:", err);
        setErrorMsg("Failed to connect to the offer server. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchOffer();
  }, [token]);

  // Submit Acceptance
  const handleAccept = async (e) => {
    e.preventDefault();
    if (!signatureName.trim()) {
      toast.error("Please enter your full legal name as your digital signature");
      return;
    }
    if (!acknowledged) {
      toast.error("Please acknowledge the terms of the offer");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/offers/candidate-respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "ACCEPTED",
          signature_name: signatureName.trim(),
          confirmed_joining_date: confirmedJoiningDate || offer.joining_date,
          comments: comments.trim() || "Offer accepted digitally by candidate.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Congratulations! Offer accepted successfully!");
        setOffer(data.data);
      } else {
        toast.error(data.error || "Failed to submit acceptance");
      }
    } catch (err) {
      console.error("Acceptance error:", err);
      toast.error("Error submitting response");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Decline
  const handleDecline = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/offers/candidate-respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "DECLINED",
          comments: declineReason.trim() || "Candidate declined offer.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Offer response recorded.");
        setShowDeclineModal(false);
        setOffer(data.data);
      } else {
        toast.error(data.error || "Submission failed");
      }
    } catch (err) {
      console.error("Decline error:", err);
      toast.error("Error submitting response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <div className="text-sm font-bold text-slate-700">Loading your employment offer...</div>
          <div className="text-xs text-slate-400 mt-1">Connecting to Zentelex HRMS Secure Candidate Portal</div>
        </div>
      </div>
    );
  }

  if (errorMsg || !offer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <LuCircleX className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Offer Not Available</h2>
          <p className="text-xs text-slate-500 mt-2">{errorMsg || "The offer link may have expired or is invalid."}</p>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
            Please reach out to the Zentelex HR Talent Acquisition team at <span className="font-semibold text-slate-600">hr@zentelex.com</span> for assistance.
          </div>
        </div>
      </div>
    );
  }

  const isAccepted = offer.offer_status === "ACCEPTED" || offer.candidate_decision === "ACCEPTED";
  const isDeclined = offer.offer_status === "DECLINED" || offer.candidate_decision === "DECLINED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-indigo-50/30 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30 mb-3">
                <LuBuilding2 className="w-3.5 h-3.5" /> Zentelex Pvt. Ltd. • Formal Employment Offer
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white m-0">
                Welcome, {offer.candidate_name}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                We are thrilled to extend an offer for the position of <strong>{offer.designation}</strong> in our <strong>{offer.department}</strong> department.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button
                variant="light"
                size="sm"
                onClick={() => generateOfferLetterPDF(offer)}
                className="font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <LuDownload className="w-3.5 h-3.5 text-indigo-600" /> Download Offer Letter (PDF)
              </Button>
              <div className="text-[11px] text-indigo-200">Ref: {offer.offer_code}</div>
            </div>
          </div>
        </div>

        {/* Accepted Confirmation Card */}
        {isAccepted && (
          <div className="bg-emerald-500 text-white rounded-3xl p-6 shadow-lg border border-emerald-400/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <LuCircleCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white m-0">Offer Digitally Accepted &amp; Confirmed!</h3>
                <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
                  Thank you, <strong>{offer.candidate_signature_name || offer.candidate_name}</strong>. Your acceptance has been formally recorded in our system. Confirmed Joining Date: <strong>{formatDateStr(offer.candidate_confirmed_joining_date || offer.joining_date)}</strong>. Our onboarding team will connect with your joining kit and orientation schedule shortly!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Declined Status Card */}
        {isDeclined && (
          <div className="bg-rose-50 text-rose-800 rounded-3xl p-6 border border-rose-200">
            <div className="flex items-center gap-3">
              <LuCircleX className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-base font-black text-rose-900 m-0">Offer Declined</h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  You have recorded your response as declined. Thank you for your interest in Zentelex.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && !isAccepted && !isDeclined && (
          <div className="bg-amber-50 text-amber-800 rounded-3xl p-5 border border-amber-200 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1">
              <LuClock className="w-4 h-4 text-amber-600" /> Offer Validity Expired
            </div>
            This offer was valid until {formatDateStr(offer.offer_expiry_date)}. Please reach out to your HR coordinator at Zentelex to request an extension.
          </div>
        )}

        {/* Role & Engagement Overview */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Engagement &amp; Appointment Overview
            </span>
            <Badge bg="primary" className="rounded-pill px-3 py-1 text-[11px] font-bold">
              {offer.employment_type}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Designation</span>
              <span className="font-extrabold text-slate-900 text-sm">{offer.designation}</span>
              <span className="text-slate-500 text-[11px] block">{offer.department} Dept</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Location</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <LuMapPin className="w-3.5 h-3.5 text-indigo-600" /> {offer.work_location}
              </span>
              <span className="text-slate-500 text-[11px] block">Reporting: {offer.reporting_manager || "HOD"}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Proposed Joining Date</span>
              <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1 mt-0.5">
                <LuCalendar className="w-3.5 h-3.5 text-emerald-600" /> {formatDateStr(offer.joining_date)}
              </span>
              <span className="text-slate-500 text-[11px] block">Notice: {offer.notice_period_days} Days</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Probation Period</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5">
                {offer.probation_period_months > 0 ? `${offer.probation_period_months} Months` : "Direct Confirmation"}
              </span>
              <span className="text-rose-600 text-[11px] font-semibold block">Valid Until: {formatDateStr(offer.offer_expiry_date)}</span>
            </div>
          </div>
        </div>

        {/* Compensation & Benefits Annexure */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 m-0">
                Annexure A: Comprehensive Remuneration Package
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cost to Company (CTC) breakdown per annum &amp; monthly entitlement
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Annual CTC</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">
                {formatINR(offer.annual_ctc)}
              </div>
            </div>
          </div>

          {/* Salary Breakdown Table */}
          <div className="overflow-x-auto">
            <Table hover responsive className="text-xs align-middle mb-0">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-3">Salary Component</th>
                  <th className="py-2.5 px-3 text-end">Monthly (INR)</th>
                  <th className="py-2.5 px-3 text-end">Annualized (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-2 px-3 text-slate-800 font-semibold">Basic Salary (50% of Fixed Gross)</td>
                  <td className="py-2 px-3 text-end">{formatINR(offer.monthly_basic)}</td>
                  <td className="py-2 px-3 text-end">{formatINR(parseFloat(offer.monthly_basic || 0) * 12)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-800 font-semibold">House Rent Allowance (HRA)</td>
                  <td className="py-2 px-3 text-end">{formatINR(offer.monthly_hra)}</td>
                  <td className="py-2 px-3 text-end">{formatINR(parseFloat(offer.monthly_hra || 0) * 12)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-800 font-semibold">Special Allowance</td>
                  <td className="py-2 px-3 text-end">{formatINR(offer.monthly_special_allowance)}</td>
                  <td className="py-2 px-3 text-end">{formatINR(parseFloat(offer.monthly_special_allowance || 0) * 12)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-800 font-semibold">Statutory Conveyance Allowance</td>
                  <td className="py-2 px-3 text-end">{formatINR(offer.monthly_conveyance)}</td>
                  <td className="py-2 px-3 text-end">{formatINR(parseFloat(offer.monthly_conveyance || 0) * 12)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-800 font-semibold">Statutory Medical Allowance</td>
                  <td className="py-2 px-3 text-end">{formatINR(offer.monthly_medical)}</td>
                  <td className="py-2 px-3 text-end">{formatINR(parseFloat(offer.monthly_medical || 0) * 12)}</td>
                </tr>
                <tr className="bg-slate-50/70 font-bold text-slate-900">
                  <td className="py-2 px-3">TOTAL MONTHLY GROSS REMUNERATION</td>
                  <td className="py-2 px-3 text-end">{formatINR(offer.monthly_gross)}</td>
                  <td className="py-2 px-3 text-end">{formatINR(parseFloat(offer.monthly_gross || 0) * 12)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-800">Employer Provident Fund (PF) Contribution</td>
                  <td className="py-2 px-3 text-end">{formatINR(parseFloat(offer.employer_pf_annual || 0) / 12)}</td>
                  <td className="py-2 px-3 text-end">{formatINR(offer.employer_pf_annual)}</td>
                </tr>
                {parseFloat(offer.annual_performance_bonus || 0) > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-800">Annual Performance Bonus / Incentive</td>
                    <td className="py-2 px-3 text-end">—</td>
                    <td className="py-2 px-3 text-end">{formatINR(offer.annual_performance_bonus)}</td>
                  </tr>
                )}
                <tr className="bg-emerald-50 text-emerald-950 font-black text-sm border-t-2 border-emerald-300">
                  <td className="py-2.5 px-3">TOTAL ANNUAL COST TO COMPANY (CTC)</td>
                  <td className="py-2.5 px-3 text-end">—</td>
                  <td className="py-2.5 px-3 text-end text-emerald-700">{formatINR(offer.annual_ctc)}</td>
                </tr>
              </tbody>
            </Table>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            In Words: <strong>{amountInWords(offer.annual_ctc)}</strong>
          </div>

          {offer.other_benefits_notes && (
            <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 text-xs text-indigo-900">
              <strong>Additional Benefits &amp; Insurance:</strong> {offer.other_benefits_notes}
            </div>
          )}
        </div>

        {/* Digital Acceptance Form (Active if not yet accepted/declined) */}
        {!isAccepted && !isDeclined && !isExpired && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-200 shadow-md space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-1">
                <LuShieldCheck className="w-3.5 h-3.5" /> Digital Acceptance Portal
              </div>
              <h2 className="text-xl font-black text-slate-900 m-0">Confirm Your Digital Acceptance</h2>
              <p className="text-xs text-slate-500 mt-1">
                By entering your full legal name below, you digitally endorse and accept this employment offer.
              </p>
            </div>

            <Form onSubmit={handleAccept} className="space-y-4">
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="text-xs font-bold text-slate-700">
                    Full Legal Name (Digital Signature) *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your exact full legal name"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="text-xs rounded-xl font-bold py-2 border-slate-300"
                    required
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    This will appear as your authorized signature on the digital offer record.
                  </div>
                </Col>

                <Col md={6}>
                  <Form.Label className="text-xs font-bold text-slate-700">
                    Confirmed Date of Joining *
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={confirmedJoiningDate}
                    onChange={(e) => setConfirmedJoiningDate(e.target.value)}
                    className="text-xs rounded-xl font-bold py-2 border-slate-300"
                    required
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Confirm or adjust the date on which you will report to office.
                  </div>
                </Col>
              </Row>

              <div>
                <Form.Label className="text-xs font-bold text-slate-700">
                  Candidate Comments or Remarks (Optional)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Any message or queries for the HR onboarding coordinator..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="text-xs rounded-xl border-slate-300"
                />
              </div>

              {/* Declaration Checkbox */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <Form.Check
                  type="checkbox"
                  id="offer-ack-checkbox"
                  label={
                    <span className="text-xs text-slate-700 font-semibold leading-relaxed">
                      I have read, understood, and accept this formal offer of employment with Zentelex Pvt. Ltd. along with the terms, compensation structure (Annexure A), and probationary guidelines detailed herein.
                    </span>
                  }
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(true)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold underline bg-transparent border-0 p-0"
                >
                  Decline this Offer
                </button>

                <Button
                  type="submit"
                  disabled={submitting || !acknowledged || !signatureName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl border-0 shadow-md flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" /> Endorsing Offer...
                    </>
                  ) : (
                    <>
                      <LuCircleCheck className="w-4 h-4" /> Accept Offer &amp; Confirm Joining
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-4">
          Zentelex Pvt. Ltd. • Human Resources Department • Confidential &amp; Legally Privileged
        </div>
      </div>

      {/* Decline Reason Modal */}
      <Modal show={showDeclineModal} onHide={() => setShowDeclineModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-black text-rose-900 flex items-center gap-2">
            <LuCircleX className="text-rose-600 w-5 h-5" />
            <span>Decline Employment Offer</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <p className="text-xs text-slate-600">
            Please let us know the reason for declining this offer (e.g. counter-offer, personal reasons, relocation):
          </p>
          <Form.Control
            as="textarea"
            rows={3}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason for declining..."
            className="text-xs rounded-xl"
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="light" size="sm" onClick={() => setShowDeclineModal(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleDecline} disabled={submitting} className="rounded-xl text-xs font-bold">
              {submitting ? <Spinner animation="border" size="sm" /> : "Confirm Decline"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
