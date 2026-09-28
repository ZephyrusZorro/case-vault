import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Send,
  Globe,
  Loader2,
} from "lucide-react";
import {
  speakText,
  stopSpeaking,
  startListening,
  isSpeechSupported,
  playChime,
  requestMicrophonePermission,
} from "../../utils/voiceAssistant";
import type { VoiceBriefResponse, VoiceQueryResponse } from "../../types/api";
import { useTranslation } from "react-i18next";

export function VoiceAssistantWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [speedMode, setSpeedMode] = useState<"elderly" | "normal">("elderly");
  const [selectedLang, setSelectedLang] = useState<string>("en-IN");
  const [transcript, setTranscript] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [spokenSubtitle, setSpokenSubtitle] = useState("");
  const [voiceBrief, setVoiceBrief] = useState<VoiceBriefResponse | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const activeListenerRef = useRef<{ stop: () => void } | null>(null);

  // Extract caseId if on /cases/:caseId
  const caseMatch = location.pathname.match(/\/cases\/([^/]+)/);
  const currentCaseId = caseMatch ? caseMatch[1] : null;

  const currentRate = speedMode === "elderly" ? 0.86 : 1.0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (activeListenerRef.current) {
        activeListenerRef.current.stop();
      }
    };
  }, []);

  // Fetch voice brief when case changes or widget opens on a case
  useEffect(() => {
    if (!currentCaseId) {
      setVoiceBrief(null);
      return;
    }
    const fetchBrief = async () => {
      try {
        setLoadingBrief(true);
        const res = await fetch(`/api/cases/${currentCaseId}/voice-brief`);
        if (res.ok) {
          const data: VoiceBriefResponse = await res.json();
          setVoiceBrief(data);
        }
      } catch {
        // Fallback silently if offline or test
      } finally {
        setLoadingBrief(false);
      }
    };
    fetchBrief();
  }, [currentCaseId]);

  // Listen for trigger from page buttons (e.g. CaseDetailPage "Voice Summary" button)
  useEffect(() => {
    const handleVoiceSpeakBrief = () => {
      setIsOpen(true);
      if (voiceBrief) {
        speakWithCaptions(voiceBrief.spoken_text);
      } else if (currentCaseId) {
        fetch(`/api/cases/${currentCaseId}/voice-brief`)
          .then((res) => res.json())
          .then((data: VoiceBriefResponse) => {
            setVoiceBrief(data);
            speakWithCaptions(data.spoken_text);
          })
          .catch(() => {
            speakWithCaptions("Sorry, could not load the case summary right now.");
          });
      }
    };
    window.addEventListener("idshield:voice-speak-brief", handleVoiceSpeakBrief);
    return () => window.removeEventListener("idshield:voice-speak-brief", handleVoiceSpeakBrief);
  }, [voiceBrief, currentCaseId, currentRate, selectedLang]);

  // Execute oral speech with captions
  const speakWithCaptions = (text: string, onDone?: () => void) => {
    if (!isSpeechSupported()) {
      setSpokenSubtitle(text);
      return;
    }
    setIsSpeaking(true);
    setSpokenSubtitle(text);

    speakText(text, {
      rate: currentRate,
      lang: selectedLang,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        onDone?.();
      },
      onError: () => {
        setIsSpeaking(false);
      },
    });
  };

  // Halt speech
  const handleStopSpeech = () => {
    stopSpeaking();
    setIsSpeaking(false);
    playChime("stop");
    setSpokenSubtitle("");
  };

  // Intelligent Natural Language Query Processor (Handles both Spoken and Typed inputs)
  const processQuery = async (queryText: string) => {
    const raw = queryText.toLowerCase().trim();
    if (!raw) return;

    setTranscript(queryText);

    // Instant stop check
    if (raw.includes("stop") || raw.includes("quiet") || raw.includes("silence") || raw.includes("shut up")) {
      handleStopSpeech();
      setLastAction("Stopped speech");
      return;
    }

    // Call intelligent backend query API
    try {
      setIsThinking(true);
      const endpoint = currentCaseId
        ? `/api/cases/${currentCaseId}/voice-query`
        : `/api/voice-query`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          current_path: location.pathname,
        }),
      });

      if (!response.ok) {
        throw new Error("Query failed");
      }

      const data: VoiceQueryResponse = await response.json();
      setIsThinking(false);

      // Execute any UI action requested
      if (data.action) {
        if (data.action.startsWith("switch_tab:")) {
          const tabName = data.action.replace("switch_tab:", "");
          window.dispatchEvent(new CustomEvent("idshield:switch-tab", { detail: tabName }));
          setLastAction(`Switched to ${tabName} tab`);
        } else if (data.action.startsWith("navigate:")) {
          const path = data.action.replace("navigate:", "");
          navigate(path);
          setLastAction(`Navigated to ${path}`);
        }
      } else {
        setLastAction(`Answered question: "${queryText}"`);
      }

      // Play success chime & speak answer aloud
      playChime("success");
      speakWithCaptions(data.answer);
    } catch {
      setIsThinking(false);
      playChime("error");
      const fallback = `I could not process "${queryText}". You can ask: "Is this document fake?", "What is the risk score?", or "Who is the applicant?".`;
      speakWithCaptions(fallback);
      setLastAction("Could not process query");
    }
  };

  // Toggle voice recognition
  const toggleListening = async () => {
    if (isListening) {
      activeListenerRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Stop speaking if talking
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }

    const hasMic = await requestMicrophonePermission();
    if (!hasMic) {
      playChime("error");
      setTranscript("Microphone permission was denied. You can type your question in the box below!");
      return;
    }

    const listener = startListening({
      lang: selectedLang,
      onStart: () => {
        setIsListening(true);
        setTranscript("Listening for your voice... speak now.");
      },
      onResult: (resultText, isFinal) => {
        setTranscript(resultText);
        if (isFinal && resultText.trim().length > 0) {
          setIsListening(false);
          processQuery(resultText);
        }
      },
      onEnd: () => {
        setIsListening(false);
      },
      onError: () => {
        setIsListening(false);
        playChime("error");
        setTranscript("Microphone audio not detected. Try typing your question below.");
      },
    });

    if (listener) {
      activeListenerRef.current = listener;
    } else {
      setTranscript("Voice recognition is not supported in this browser. Please type your question below.");
    }
  };

  // Explaining current page when not on a case
  const speakCurrentPageOverview = () => {
    if (currentCaseId && voiceBrief) {
      speakWithCaptions(voiceBrief.spoken_text);
      return;
    }
    processQuery("What is this page?");
  };

  // Handle Typed Form Submission
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    const q = typedInput.trim();
    setTypedInput("");
    processQuery(q);
  };

  return (
    <aside
      aria-label="Voice accessibility assistant"
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none"
    >
      {/* Expanded Voice Dialog Box */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Voice Guidance Panel"
          className="pointer-events-auto mb-3 w-[92vw] max-w-md rounded-2xl border-2 border-foreground bg-white shadow-hard p-5 text-foreground transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-foreground/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-violet border-2 border-foreground text-white shadow-hard-active">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  {t("voice.title")}
                  <span className="rounded-full bg-accent-yellow border-2 border-foreground text-foreground px-2 py-0.5 text-[10px] font-bold shadow-hard-active">
                    {t("voice.badge")}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  {t("voice.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-foreground hover:bg-accent-pink hover:text-white transition-colors border-2 border-transparent hover:border-foreground hover:shadow-hard-active"
                aria-label="Close voice assistant dialog"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Controls: Speech Cadence & Voice Accent Selector */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border-2 border-foreground/10 p-2 text-xs">
            {/* Speed Toggle */}
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-foreground" strokeWidth={2.5} />
              <div className="inline-flex rounded-lg bg-white p-0.5 border-2 border-foreground shadow-hard-active">
                <button
                  type="button"
                  onClick={() => setSpeedMode("elderly")}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-all ${
                    speedMode === "elderly"
                      ? "bg-accent-violet text-white"
                      : "text-slate-600 hover:text-foreground"
                  }`}
                  title="Calm 0.86x cadence for elderly comprehension"
                >
                  {t("voice.speed_relaxed")}
                </button>
                <button
                  type="button"
                  onClick={() => setSpeedMode("normal")}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-all ${
                    speedMode === "normal"
                      ? "bg-accent-violet text-white"
                      : "text-slate-600 hover:text-foreground"
                  }`}
                  title="Standard 1.0x rate"
                >
                  {t("voice.speed_normal")}
                </button>
              </div>
            </div>

            {/* Accent Selector */}
            <div className="flex items-center gap-1 text-[11px]">
              <Globe size={12} className="text-foreground" strokeWidth={2.5} />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="rounded-md border-2 border-foreground bg-white px-1.5 py-0.5 text-[11px] font-bold text-foreground focus:outline-none shadow-hard-active"
                aria-label="Select voice accent"
              >
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="hi-IN">Hindi</option>
                <option value="ar-SA">Arabic</option>
                <option value="fr-FR">French</option>
              </select>
            </div>
          </div>

          {/* Spoken Subtitle Display (High Contrast, Large Font for Accessibility) */}
          {(isSpeaking || spokenSubtitle) && (
            <div
              aria-live="polite"
              className="mt-3 rounded-xl border-2 border-foreground bg-accent-yellow p-3.5 shadow-hard-active"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-foreground mb-1">
                <span className="flex items-center gap-1.5">
                  <Volume2 size={14} className={isSpeaking ? "animate-pulse" : ""} strokeWidth={2.5} />
                  {isSpeaking ? t("voice.speaking") : t("voice.last_spoken")}
                </span>
                {isSpeaking && (
                  <button
                    type="button"
                    onClick={handleStopSpeech}
                    className="flex items-center gap-1 text-foreground hover:underline font-extrabold text-[11px]"
                  >
                    <VolumeX size={12} strokeWidth={2.5} />
                    {t("voice.stop")}
                  </button>
                )}
              </div>
              <p className="text-sm sm:text-base font-extrabold text-foreground leading-relaxed">
                "{spokenSubtitle}"
              </p>
            </div>
          )}

          {/* Live Recognition Transcript / Thinking State */}
          {isThinking && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-foreground bg-accent-mint p-3 text-xs text-foreground font-bold shadow-hard-active">
              <Loader2 size={16} className="animate-spin text-foreground" strokeWidth={2.5} />
              <span>{t("voice.analyzing")}</span>
            </div>
          )}

          {transcript && !isSpeaking && !isThinking && (
            <div
              aria-live="polite"
              className="mt-3 rounded-xl border-2 border-foreground bg-accent-mint p-3 shadow-hard-active"
            >
              <p className="text-[11px] font-extrabold text-foreground uppercase tracking-wider mb-0.5">
                {isListening ? t("voice.listening") : t("voice.recognized")}
              </p>
              <p className="text-sm font-bold text-foreground">
                {transcript}
              </p>
            </div>
          )}

          {/* Status Feedback */}
          {lastAction && (
            <div className="mt-2 text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Zap size={11} className="text-accent-pink" strokeWidth={2.5} />
              <span>{lastAction}</span>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {/* Hold to Speak / Toggle Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 font-bold text-sm transition-all border-2 border-foreground active:scale-95 ${
                isListening
                  ? "bg-accent-pink text-white animate-pulse shadow-hard-active"
                  : "bg-accent-violet text-white hover:shadow-hard-hover shadow-hard"
              }`}
              aria-label={isListening ? "Stop listening" : "Start speaking voice command"}
            >
              {isListening ? (
                <>
                  <MicOff size={18} strokeWidth={2.5} />
                  <span>{t("voice.stop_mic")}</span>
                </>
              ) : (
                <>
                  <Mic size={18} strokeWidth={2.5} />
                  <span>{t("voice.tap_speak")}</span>
                </>
              )}
            </button>

            {/* Read Page / Case Summary Aloud */}
            <button
              type="button"
              onClick={speakCurrentPageOverview}
              disabled={isSpeaking || loadingBrief || isThinking}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-white hover:bg-accent-yellow text-foreground py-3 px-4 font-bold text-sm transition-all shadow-hard hover:shadow-hard-hover active:scale-95 disabled:opacity-50 disabled:hover:shadow-hard disabled:hover:bg-white"
              aria-label="Read summary aloud"
            >
              <Volume2 size={18} className="text-foreground" strokeWidth={2.5} />
              <span>{currentCaseId ? t("voice.speak_case") : t("voice.read_page")}</span>
            </button>
          </div>

          {/* Natural Language Text Input Box (Guarantees 100% Accuracy Even If Mic Mishears) */}
          <form onSubmit={handleTextSubmit} className="mt-3 flex items-center gap-1.5">
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={t("voice.placeholder")}
              className="flex-1 rounded-xl border-2 border-foreground bg-white px-3 py-2 text-xs font-bold text-foreground placeholder:text-slate-400 focus:outline-none shadow-hard-active"
              aria-label="Type question for voice assistant"
            />
            <button
              type="submit"
              disabled={!typedInput.trim() || isThinking}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-pink border-2 border-foreground text-white shadow-hard hover:shadow-hard-hover active:shadow-hard-active disabled:opacity-40 transition-all shrink-0"
              title="Submit question"
            >
              <Send size={14} strokeWidth={2.5} />
            </button>
          </form>

          {/* If on Case Page, Show Brief Findings */}
          {currentCaseId && voiceBrief && (
            <div className="mt-3 rounded-xl border-2 border-foreground bg-slate-50 p-3 text-xs shadow-hard-active">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-foreground flex items-center gap-1.5">
                  {voiceBrief.has_warnings ? (
                    <AlertTriangle size={14} className="text-accent-pink" strokeWidth={2.5} />
                  ) : (
                    <CheckCircle2 size={14} className="text-accent-mint" strokeWidth={2.5} />
                  )}
                  {t("voice.summary")} ({voiceBrief.recommendation?.replace(/_/g, " ") ?? t("voice.evaluating")})
                </span>
                <span className="font-mono font-extrabold text-slate-500 text-[11px]">
                  {t("voice.risk")}: {voiceBrief.risk_score ?? "—"}/100
                </span>
              </div>
              <ul className="space-y-1 text-slate-600 font-medium">
                {voiceBrief.summary_bullets.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                    <span className="text-accent-violet font-bold">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Voice / Natural Question Chips */}
          <div className="mt-3 pt-2.5 border-t-2 border-foreground/10">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              {t("voice.suggestions_title")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Is this document fake?",
                "What is the risk score?",
                "Who is the applicant?",
                "Do the names match?",
                "Show documents",
                "Check tampering",
                "Help me",
              ].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => processQuery(cmd)}
                  className="rounded-lg border-2 border-foreground bg-white px-2 py-0.5 text-[11px] font-bold text-foreground hover:bg-accent-yellow transition-all shadow-hard-active"
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            playChime("listen");
          } else {
            setIsOpen(false);
            if (isSpeaking) handleStopSpeech();
          }
        }}
        aria-label="Toggle Voice Assistant"
        className={`pointer-events-auto group relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-foreground shadow-hard transition-all duration-300 hover:scale-105 hover:shadow-hard-hover active:scale-95 active:shadow-hard-active focus:outline-none ${
          isListening
            ? "bg-accent-pink text-white animate-pulse"
            : isSpeaking
              ? "bg-accent-yellow text-foreground"
              : "bg-accent-violet text-white"
        }`}
        title="Open Voice Assistant (For elderly & hands-free assistance)"
      >
        {/* Soundwave animation ring */}
        {(isListening || isSpeaking) && (
          <span className="absolute -inset-1 rounded-2xl bg-inherit opacity-40 animate-ping border-2 border-foreground" />
        )}

        {isListening ? (
          <Mic size={24} className="animate-bounce" strokeWidth={2.5} />
        ) : isSpeaking ? (
          <Volume2 size={24} className="animate-pulse" strokeWidth={2.5} />
        ) : (
          <Mic size={24} className="transition-transform group-hover:scale-110" strokeWidth={2.5} />
        )}

        {/* Small badge if case brief available */}
        {currentCaseId && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-mint border-2 border-foreground text-[10px] font-extrabold text-foreground shadow-hard-active">
            ✓
          </span>
        )}
      </button>
    </aside>
  );
}
