import { useState } from "react";
import PageTitle from "@/components/PageTitle";
import { 
  HeadphonesIcon, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  MessageSquare,
  Clock,
  Sparkles
} from "lucide-react";

type FormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high";
};

type SubmitStatus = "idle" | "sending" | "success" | "error";

export default function SupportPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
    priority: "medium",
  });

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setStatus("error");
      setErrorMessage("Please fill in all required fields");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    setStatus("sending");

    try {
      // Send to Cloudflare Worker
      const response = await fetch("https://support.finotaur.com/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setStatus("success");
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
          priority: "medium",
        });
        setStatus("idle");
      }, 3000);

    } catch (error) {
      setStatus("error");
      setErrorMessage("Failed to send message. Please try again or email us directly at support@finotaur.com");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen" style={{ 
      background: 'radial-gradient(circle at top, #0A0A0A 0%, #121212 100%)'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
        }
      `}</style>

      <div className="p-6 w-full space-y-6">
        {/* Header */}
        <div className="animate-fadeIn">
          <PageTitle 
            title="Support Center" 
            subtitle="Get help with your trading journey - we're here to assist you"
          />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div 
            className="rounded-[18px] border bg-[#141414] p-5 shadow-[0_0_30px_rgba(201,166,70,0.05)]"
            style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-[#C9A646]/10 p-2">
                <Clock className="w-5 h-5 text-[#C9A646]" />
              </div>
              <h3 className="text-[#F4F4F4] font-semibold text-sm">Response Time</h3>
            </div>
            <p className="text-[#A0A0A0] text-sm font-light">
              We typically respond within <span className="text-[#C9A646] font-medium">24 hours</span>
            </p>
          </div>

          <div 
            className="rounded-[18px] border bg-[#141414] p-5 shadow-[0_0_30px_rgba(201,166,70,0.05)]"
            style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-[#C9A646]/10 p-2">
                <Mail className="w-5 h-5 text-[#C9A646]" />
              </div>
              <h3 className="text-[#F4F4F4] font-semibold text-sm">Direct Email</h3>
            </div>
            <p className="text-[#A0A0A0] text-sm font-light">
              <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline">
                support@finotaur.com
              </a>
            </p>
          </div>

          <div 
            className="rounded-[18px] border bg-[#141414] p-5 shadow-[0_0_30px_rgba(201,166,70,0.05)]"
            style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-[#C9A646]/10 p-2">
                <MessageSquare className="w-5 h-5 text-[#C9A646]" />
              </div>
              <h3 className="text-[#F4F4F4] font-semibold text-sm">Live Chat</h3>
            </div>
            <p className="text-[#A0A0A0] text-sm font-light">
              Coming soon with <span className="text-[#C9A646] font-medium">AI assistance</span>
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Form */}
          <div 
            className="lg:col-span-2 rounded-[20px] border bg-[#141414] p-8 shadow-[0_0_30px_rgba(201,166,70,0.08)] animate-fadeIn"
            style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-br from-[#C9A646]/10 to-[#C9A646]/5 p-3">
                <HeadphonesIcon className="w-6 h-6 text-[#C9A646]" />
              </div>
              <div>
                <h2 className="text-[#F4F4F4] text-xl font-semibold">Send us a message</h2>
                <p className="text-[#A0A0A0] text-sm font-light">Fill out the form below and we'll get back to you</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#A0A0A0] text-xs uppercase tracking-wider mb-2 font-medium">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    className="w-full bg-[#0A0A0A] border rounded-[12px] px-4 py-3 text-[#F4F4F4] text-sm focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                    style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
                  />
                </div>

                <div>
                  <label className="block text-[#A0A0A0] text-xs uppercase tracking-wider mb-2 font-medium">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                    className="w-full bg-[#0A0A0A] border rounded-[12px] px-4 py-3 text-[#F4F4F4] text-sm focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                    style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
                  />
                </div>
              </div>

              {/* Subject & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#A0A0A0] text-xs uppercase tracking-wider mb-2 font-medium">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    required
                    className="w-full bg-[#0A0A0A] border rounded-[12px] px-4 py-3 text-[#F4F4F4] text-sm focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                    style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
                  />
                </div>

                <div>
                  <label className="block text-[#A0A0A0] text-xs uppercase tracking-wider mb-2 font-medium">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full bg-[#0A0A0A] border rounded-[12px] px-4 py-3 text-[#F4F4F4] text-sm focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                    style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
                  >
                    <option value="low">Low - General inquiry</option>
                    <option value="medium">Medium - Need assistance</option>
                    <option value="high">High - Urgent issue</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[#A0A0A0] text-xs uppercase tracking-wider mb-2 font-medium">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us more about your question or issue..."
                  required
                  rows={6}
                  className="w-full bg-[#0A0A0A] border rounded-[12px] px-4 py-3 text-[#F4F4F4] text-sm focus:outline-none focus:border-[#C9A646]/50 transition-colors resize-none"
                  style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === "sending"}
                className={`
                  w-full flex items-center justify-center gap-2 rounded-[14px] px-6 py-4 text-sm font-semibold transition-all duration-300
                  ${status === "sending" 
                    ? "bg-[#A0A0A0]/20 text-[#A0A0A0] cursor-not-allowed" 
                    : status === "success"
                    ? "bg-[#4AD295]/20 text-[#4AD295] border border-[#4AD295]/40"
                    : status === "error"
                    ? "bg-[#E36363]/20 text-[#E36363] border border-[#E36363]/40"
                    : "bg-gradient-to-r from-[#C9A646] to-[#D4AF37] text-[#0A0A0A] hover:shadow-[0_0_30px_rgba(201,166,70,0.4)]"
                  }
                `}
              >
                {status === "sending" && (
                  <>
                    <div className="w-4 h-4 border-2 border-[#A0A0A0]/30 border-t-[#A0A0A0] rounded-full animate-spin" />
                    Sending...
                  </>
                )}
                {status === "success" && (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Message Sent Successfully!
                  </>
                )}
                {status === "error" && (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Failed to Send
                  </>
                )}
                {status === "idle" && (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>

              {/* Error Message */}
              {status === "error" && errorMessage && (
                <div 
                  className="rounded-[12px] border bg-[#E36363]/5 p-4 animate-slideIn"
                  style={{ borderColor: 'rgba(227, 99, 99, 0.2)' }}
                >
                  <p className="text-[#E36363] text-sm font-light">{errorMessage}</p>
                </div>
              )}
            </form>
          </div>

          {/* FAQ / Tips Sidebar */}
          <div className="space-y-4">
            {/* Quick Tips */}
            <div 
              className="rounded-[18px] border bg-[#141414] p-5 shadow-[0_0_30px_rgba(201,166,70,0.05)] animate-fadeIn"
              style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#C9A646]" />
                <h3 className="text-[#F4F4F4] font-semibold text-sm">Quick Tips</h3>
              </div>
              <ul className="space-y-3">
                <li className="text-[#A0A0A0] text-xs font-light flex items-start gap-2">
                  <span className="text-[#C9A646] mt-0.5">•</span>
                  <span>Include screenshots if reporting a bug</span>
                </li>
                <li className="text-[#A0A0A0] text-xs font-light flex items-start gap-2">
                  <span className="text-[#C9A646] mt-0.5">•</span>
                  <span>Provide your account email for faster support</span>
                </li>
                <li className="text-[#A0A0A0] text-xs font-light flex items-start gap-2">
                  <span className="text-[#C9A646] mt-0.5">•</span>
                  <span>Check our Academy for common questions</span>
                </li>
                <li className="text-[#A0A0A0] text-xs font-light flex items-start gap-2">
                  <span className="text-[#C9A646] mt-0.5">•</span>
                  <span>Be specific about the issue you're experiencing</span>
                </li>
              </ul>
            </div>

            {/* Common Topics */}
            <div 
              className="rounded-[18px] border bg-[#141414] p-5 shadow-[0_0_30px_rgba(201,166,70,0.05)] animate-fadeIn"
              style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
            >
              <h3 className="text-[#F4F4F4] font-semibold text-sm mb-4">Common Topics</h3>
              <div className="space-y-2">
                {[
                  "Account & Billing",
                  "Trade Import Issues",
                  "Strategy Questions",
                  "Feature Requests",
                  "Technical Problems",
                  "API & Integrations"
                ].map((topic) => (
                  <div
                    key={topic}
                    className="text-[#A0A0A0] text-xs font-light py-2 px-3 rounded-lg hover:bg-[#C9A646]/5 hover:text-[#C9A646] transition-colors cursor-pointer"
                  >
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}