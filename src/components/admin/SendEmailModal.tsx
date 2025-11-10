// src/components/admin/SendEmailModal.tsx
import { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';
import { UserWithStats } from '../../../../types/admin';

interface SendEmailModalProps {
  user: UserWithStats;
  onClose: () => void;
}

const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to Finotaur!',
    body: 'Hi {{name}},\n\nWelcome to Finotaur! We\'re excited to have you on board.\n\nBest regards,\nThe Finotaur Team',
  },
  {
    id: 'premium_offer',
    name: 'Premium Offer',
    subject: 'Special Premium Offer',
    body: 'Hi {{name}},\n\nWe have a special offer for you! Upgrade to Premium and get unlimited trades.\n\nBest regards,\nThe Finotaur Team',
  },
  {
    id: 'feedback',
    name: 'Feedback Request',
    subject: 'We\'d love your feedback',
    body: 'Hi {{name}},\n\nHow has your experience been with Finotaur? We\'d love to hear your thoughts.\n\nBest regards,\nThe Finotaur Team',
  },
  {
    id: 'custom',
    name: 'Custom Email',
    subject: '',
    body: '',
  },
];

export default function SendEmailModal({ user, onClose }: SendEmailModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0].id);
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [message, setMessage] = useState(EMAIL_TEMPLATES[0].body);

  function handleTemplateChange(templateId: string) {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject);
      setMessage(template.body);
    }
  }

  function handleSend() {
    const finalSubject = subject.replace('{{name}}', user.display_name || user.email);
    const finalMessage = message.replace('{{name}}', user.display_name || user.email);

    // Note: Email sending is console-only for now
    // TODO: Integrate with SendGrid or AWS SES
    console.log('📧 Email to send:', {
      to: user.email,
      subject: finalSubject,
      message: finalMessage,
    });

    alert('Email preview logged to console. Email backend integration needed for actual sending.');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">✉️ Send Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Recipient */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-300">
              To: <span className="text-white font-medium">{user.email}</span>
            </p>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Template:
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
            >
              {EMAIL_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email message..."
              rows={10}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use {'{{name}}'} to insert user's name
            </p>
          </div>

          {/* Preview */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Preview:</p>
            <div className="space-y-2">
              <p className="text-sm text-white font-medium">
                {subject.replace('{{name}}', user.display_name || user.email)}
              </p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {message.replace('{{name}}', user.display_name || user.email)}
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-xs text-blue-300">
              📝 Note: Email backend integration (SendGrid/AWS SES) required for actual sending. Currently logs to console only.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white hover:bg-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-medium rounded-lg hover:bg-[#E5C158] transition-colors"
          >
            <Send className="w-4 h-4" />
            Send Email (Preview)
          </button>
        </div>
      </div>
    </div>
  );
}