import React, { useEffect } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import { LuSparkles, LuPartyPopper, LuTrophy, LuHeart, LuX, LuSend } from "react-icons/lu";

// Play a cheerful synthesizer chime using Web Audio API
const playCelebrationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampDownAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
    });
  } catch (err) {
    // Audio autoplay restrictions or unsupported
  }
};

export default function CelebrationPopup({
  show,
  onHide,
  celebrationData = null, // { type: 'birthday' | 'anniversary', name, department, designation, dateStr, tenureYears, message }
  onSendWish = () => {}
}) {
  const isAnniversary = celebrationData?.type === "anniversary";
  const name = celebrationData?.name || celebrationData?.employee_name || "Team Member";
  const department = celebrationData?.department || celebrationData?.dept || "Zentelex IT Solutions";
  const designation = celebrationData?.designation || "Valued Colleague";
  const tenureYears = celebrationData?.tenureYears || 1;

  useEffect(() => {
    if (show) {
      playCelebrationChime();
    }
  }, [show]);

  if (!show || !celebrationData) return null;

  return (
    <>
      {/* CSS Confetti & Keyframe Animations */}
      <style>{`
        @keyframes float-balloon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.7); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 2px;
          pointer-events: none;
          z-index: 10;
          animation: confetti-fall 3.2s linear infinite;
        }
        .celebration-modal-dialog .modal-content {
          border: none;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <Modal
        show={show}
        onHide={onHide}
        centered
        dialogClassName="celebration-modal-dialog"
        backdrop="static"
      >
        <div
          className="position-relative p-0 overflow-hidden text-center"
          style={{
            background: isAnniversary
              ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)"
              : "linear-gradient(135deg, #1e1b4b 0%, #3b0764 50%, #4c0519 100%)",
            color: "#ffffff"
          }}
        >
          {/* Confetti Particles */}
          <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <span
                key={i}
                className="confetti-piece"
                style={{
                  left: `${(i * 5) % 100}%`,
                  top: `-${(i * 12) % 30}px`,
                  backgroundColor: [
                    "#f59e0b",
                    "#ec4899",
                    "#3b82f6",
                    "#10b981",
                    "#8b5cf6",
                    "#f43f5e",
                    "#eab308"
                  ][i % 7],
                  animationDelay: `${(i * 0.22).toFixed(2)}s`,
                  animationDuration: `${2.4 + (i % 3) * 0.6}s`,
                  transform: `scale(${0.7 + (i % 5) * 0.15})`
                }}
              />
            ))}
          </div>

          {/* Close Icon */}
          <button
            onClick={onHide}
            className="position-absolute top-3 end-3 btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{
              width: "36px",
              height: "36px",
              background: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(8px)",
              zIndex: 20
            }}
          >
            <LuX size={18} />
          </button>

          {/* Festive Banner Header */}
          <div className="pt-5 pb-3 px-4 position-relative z-10">
            {/* Animated Icon Avatar */}
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle shadow-lg"
              style={{
                width: "96px",
                height: "90px",
                background: isAnniversary
                  ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
                  : "linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%)",
                animation: "float-balloon 3s ease-in-out infinite, pulse-glow 2.5s infinite",
                border: "4px solid rgba(255, 255, 255, 0.8)"
              }}
            >
              {isAnniversary ? (
                <LuTrophy size={48} className="text-slate-900" />
              ) : (
                <span style={{ fontSize: "48px" }}>🎂</span>
              )}
            </div>

            {/* Event Category Badge */}
            <Badge
              bg={isAnniversary ? "warning" : "danger"}
              className="text-dark fw-bold px-3 py-1.5 rounded-pill text-[11px] mb-2 text-uppercase tracking-wider shadow-sm"
              style={{
                background: isAnniversary
                  ? "linear-gradient(90deg, #fde047, #f59e0b)"
                  : "linear-gradient(90deg, #fda4af, #f43f5e)",
                color: "#1e1b4b"
              }}
            >
              {isAnniversary ? (
                <span className="d-flex align-items-center gap-1">
                  <LuSparkles size={12} /> {tenureYears === 1 ? "1-Year Work Anniversary Milestone" : `${tenureYears}-Year Work Anniversary`}
                </span>
              ) : (
                <span className="d-flex align-items-center gap-1">
                  <LuPartyPopper size={12} /> Official Birthday Event
                </span>
              )}
            </Badge>

            {/* Headline */}
            <h2
              className="fw-extrabold text-white mt-2 mb-1"
              style={{
                fontSize: "24px",
                letterSpacing: "-0.5px",
                textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)"
              }}
            >
              {isAnniversary ? "Congratulations!" : "Happy Birthday!"}
            </h2>

            {/* Employee Name */}
            <div
              className="fw-black my-2"
              style={{
                fontSize: "26px",
                background: isAnniversary
                  ? "linear-gradient(90deg, #fef08a, #fbbf24, #f59e0b)"
                  : "linear-gradient(90deg, #fbcfe8, #f472b6, #fb7185)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              {name}
            </div>

            {/* Role & Department */}
            <p className="text-slate-300 text-xs mb-3 font-medium">
              {designation} &bull; <span className="text-slate-200">{department}</span>
            </p>

            {/* Milestone Card Content */}
            <div
              className="p-3.5 mx-2 rounded-2xl text-start position-relative"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(12px)"
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2 text-warning text-xs fw-bold">
                <LuSparkles size={14} />
                <span>{isAnniversary ? "365 Days of Dedication & Excellence" : "A Special Note From Team Zentelex"}</span>
              </div>
              <p
                className="mb-0 text-slate-200 text-xs leading-relaxed"
                style={{ fontSize: "12.5px" }}
              >
                {celebrationData.message || (isAnniversary
                  ? `Heartiest congratulations to ${name} on successfully completing ${tenureYears} year${tenureYears > 1 ? "s" : ""} at Zentelex IT Solutions! Thank you for your hard work, creativity, and tireless dedication to our mission.`
                  : `Wishing ${name} a magnificent birthday filled with joy, laughter, and grand achievements in the year ahead! May your journey continue to shine bright!`)}
              </p>
            </div>

            {/* Quick Wish Buttons */}
            <div className="mt-4 mb-2 d-flex flex-wrap justify-content-center gap-2">
              <button
                type="button"
                onClick={() => onSendWish(name, "🎂 Wishing you an amazing day!")}
                className="btn btn-sm text-white rounded-pill px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.25)"
                }}
              >
                {isAnniversary ? "🏆 Proud Milestone!" : "🎉 Have a blast!"}
              </button>
              <button
                type="button"
                onClick={() => onSendWish(name, "🌟 Keep shining and inspiring us!")}
                className="btn btn-sm text-white rounded-pill px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.25)"
                }}
              >
                🌟 Keep inspiring us!
              </button>
              <button
                type="button"
                onClick={() => onSendWish(name, "🥂 Here's to more success together!")}
                className="btn btn-sm text-white rounded-pill px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.25)"
                }}
              >
                🥂 Cheers to success!
              </button>
            </div>

            {/* Action Bar */}
            <div className="mt-4 pt-3 border-top border-slate-700/60 d-flex align-items-center justify-content-between">
              <span className="text-slate-400 text-[11px]">
                Organized by Zentelex HRMS
              </span>
              <div className="d-flex gap-2">
                <Button
                  variant="light"
                  size="sm"
                  className="rounded-xl px-4 py-1.5 fw-bold text-xs shadow-sm text-slate-800"
                  onClick={onHide}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
