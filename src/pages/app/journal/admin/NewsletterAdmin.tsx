// src/pages/app/journal/admin/NewsletterAdmin.tsx
// Complete Newsletter Admin with Audience Selection

import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type AudienceType = 'premium' | 'newsletter' | 'both';

interface AudienceCounts {
  premium: number;
  newsletter: number;
}

interface NewsletterSection {
  id: string;
  title: string;
  content: string;
}

interface PreviewData {
  subject: string;
  preheader: string;
  sections: NewsletterSection[];
  html: string;
  subscriberCount: number;
  premiumCount: number;
  audienceCounts: AudienceCounts;
  generatedAt: string;
}

interface Subscriber {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  emails_sent: number;
  created_at: string;
}

interface HistoryItem {
  id: string;
  subject: string;
  status: string;
  sent_at: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
}

export default function NewsletterAdmin() {
  // State
  const [activeTab, setActiveTab] = useState<'preview' | 'subscribers' | 'history' | 'settings'>('preview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Audience state
  const [audienceType, setAudienceType] = useState<AudienceType>('newsletter');
  const [audienceCounts, setAudienceCounts] = useState<AudienceCounts>({ premium: 0, newsletter: 0 });

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newSubscriber, setNewSubscriber] = useState({ email: '', first_name: '', last_name: '' });

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load audience counts on mount
  useEffect(() => {
    loadAudienceCounts();
  }, []);

  // Load subscribers when tab changes
  useEffect(() => {
    if (activeTab === 'subscribers') {
      loadSubscribers();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // ==========================================
  // API Functions
  // ==========================================

  async function loadAudienceCounts() {
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/audience-counts`);
      const data = await res.json();
      if (data.success && data.data) {
        setAudienceCounts(data.data);
      }
    } catch (err) {
      console.error('Failed to load audience counts:', err);
    }
  }

  async function generatePreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/preview`);
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
        if (data.data.audienceCounts) {
          setAudienceCounts(data.data.audienceCounts);
        }
        setSuccess('Preview generated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to generate preview');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }

  async function sendTestEmail() {
    if (!testEmail || !testEmail.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Test email sent to ${testEmail}`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to send test email');
      }
    } catch (err) {
      setError('Failed to send test email');
    } finally {
      setLoading(false);
    }
  }

  async function sendToAudience() {
    const info = getAudienceInfo();
    const confirmed = window.confirm(
      `Are you sure you want to send the newsletter to ${info.count} ${info.label}?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audienceType }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Newsletter sent to ${data.data.sentCount} recipients!`);
        setTimeout(() => setSuccess(null), 5000);
        loadHistory();
      } else {
        setError(data.error || 'Failed to send newsletter');
      }
    } catch (err) {
      setError('Failed to send newsletter');
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscribers() {
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/subscribers`);
      const data = await res.json();
      if (data.success) {
        setSubscribers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load subscribers:', err);
    }
  }

  async function addSubscriber() {
    if (!newSubscriber.email || !newSubscriber.email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubscriber),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Subscriber added!');
        setNewSubscriber({ email: '', first_name: '', last_name: '' });
        loadSubscribers();
        loadAudienceCounts();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error === 'email_already_exists' ? 'Email already exists' : data.error);
      }
    } catch (err) {
      setError('Failed to add subscriber');
    } finally {
      setLoading(false);
    }
  }

  async function deleteSubscriber(id: string) {
    if (!window.confirm('Are you sure you want to delete this subscriber?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/subscribers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Subscriber deleted');
        loadSubscribers();
        loadAudienceCounts();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete subscriber');
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/history`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  // ==========================================
  // Helper Functions
  // ==========================================

  function getAudienceInfo(): { label: string; count: number; emoji: string } {
    switch (audienceType) {
      case 'premium':
        return { label: 'Premium Users', count: audienceCounts.premium, emoji: '💎' };
      case 'newsletter':
        return { label: 'Newsletter Subscribers', count: audienceCounts.newsletter, emoji: '📧' };
      case 'both':
        return { label: 'All Recipients', count: audienceCounts.premium + audienceCounts.newsletter, emoji: '🎯' };
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('he-IL');
  }

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#C9A646' }}>
            📧 ניהול ניוזלטר
          </h1>
          <p className="text-gray-400">יצירה, תצוגה מקדימה ושליחת ניוזלטרים</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="float-left text-red-400 hover:text-red-300">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Audience Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <div>
                <p className="text-gray-400 text-sm">מנויי פרימיום</p>
                <p className="text-2xl font-bold" style={{ color: '#C9A646' }}>{audienceCounts.premium}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <p className="text-gray-400 text-sm">מנויי ניוזלטר</p>
                <p className="text-2xl font-bold" style={{ color: '#C9A646' }}>{audienceCounts.newsletter}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-gray-400 text-sm">סה״כ נמענים</p>
                <p className="text-2xl font-bold" style={{ color: '#C9A646' }}>
                  {audienceCounts.premium + audienceCounts.newsletter}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2a2a2a] pb-4">
          {[
            { id: 'preview', label: 'תצוגה מקדימה', emoji: '👁️' },
            { id: 'subscribers', label: 'מנויים', emoji: '👥' },
            { id: 'history', label: 'היסטוריה', emoji: '📜' },
            { id: 'settings', label: 'הגדרות', emoji: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-[#C9A646] text-black font-medium'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          {/* ==================== PREVIEW TAB ==================== */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* Generate Preview Button */}
              <div className="flex gap-4 items-center">
                <button
                  onClick={generatePreview}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)', color: '#0F0F0F' }}
                >
                  {loading ? '⏳ טוען...' : '🔄 צור תצוגה מקדימה'}
                </button>

                {/* Test Email */}
                <div className="flex gap-2 flex-1">
                  <input
                    type="email"
                    placeholder="אימייל לבדיקה"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white"
                    dir="ltr"
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={loading || !preview}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    🧪 שלח בדיקה
                  </button>
                </div>
              </div>

              {/* Audience Selector */}
              {preview && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">בחר קהל יעד:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: 'premium' as AudienceType, label: 'מנויי פרימיום', emoji: '💎', count: audienceCounts.premium },
                      { type: 'newsletter' as AudienceType, label: 'מנויי ניוזלטר', emoji: '📧', count: audienceCounts.newsletter },
                      { type: 'both' as AudienceType, label: 'שניהם', emoji: '🎯', count: audienceCounts.premium + audienceCounts.newsletter },
                    ].map((option) => (
                      <button
                        key={option.type}
                        onClick={() => setAudienceType(option.type)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          audienceType === option.type
                            ? 'border-[#C9A646] bg-[#C9A646]/10'
                            : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <span className="text-3xl block mb-2">{option.emoji}</span>
                        <span className="block font-medium">{option.label}</span>
                        <span className="text-sm text-gray-400">{option.count} נמענים</span>
                      </button>
                    ))}
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={sendToAudience}
                    disabled={loading || getAudienceInfo().count === 0}
                    className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)' }}
                  >
                    {loading ? '⏳ שולח...' : `🚀 שלח ל-${getAudienceInfo().count} ${getAudienceInfo().label} ${getAudienceInfo().emoji}`}
                  </button>
                </div>
              )}

              {/* Preview Content */}
              {preview && (
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">תוכן הניוזלטר:</h3>
                    <button
                      onClick={() => setShowHtml(!showHtml)}
                      className="px-3 py-1 bg-[#2a2a2a] rounded-lg text-sm"
                    >
                      {showHtml ? '📝 Sections' : '🌐 HTML'}
                    </button>
                  </div>

                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Subject:</p>
                    <p className="text-xl font-bold mb-4">{preview.subject}</p>
                    <p className="text-gray-400 text-sm mb-1">Preheader:</p>
                    <p className="text-gray-300 mb-4">{preview.preheader}</p>
                  </div>

                  {showHtml ? (
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap" dir="ltr">
                        {preview.html}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {preview.sections?.map((section, idx) => (
                        <div key={idx} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                          <h4 className="font-bold text-[#C9A646] mb-2">{section.title}</h4>
                          <p className="text-gray-300 whitespace-pre-wrap">{section.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== SUBSCRIBERS TAB ==================== */}
          {activeTab === 'subscribers' && (
            <div className="space-y-6">
              {/* Add Subscriber Form */}
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <h3 className="font-medium mb-4">הוסף מנוי חדש</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="email"
                    placeholder="אימייל *"
                    value={newSubscriber.email}
                    onChange={(e) => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg"
                    dir="ltr"
                  />
                  <input
                    type="text"
                    placeholder="שם פרטי"
                    value={newSubscriber.first_name}
                    onChange={(e) => setNewSubscriber({ ...newSubscriber, first_name: e.target.value })}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="שם משפחה"
                    value={newSubscriber.last_name}
                    onChange={(e) => setNewSubscriber({ ...newSubscriber, last_name: e.target.value })}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg"
                  />
                  <button
                    onClick={addSubscriber}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                  >
                    ➕ הוסף
                  </button>
                </div>
              </div>

              {/* Subscribers Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-right py-3 px-4">אימייל</th>
                      <th className="text-right py-3 px-4">שם</th>
                      <th className="text-right py-3 px-4">סטטוס</th>
                      <th className="text-right py-3 px-4">אימיילים שנשלחו</th>
                      <th className="text-right py-3 px-4">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="border-b border-[#2a2a2a] hover:bg-[#0a0a0a]">
                        <td className="py-3 px-4" dir="ltr">{sub.email}</td>
                        <td className="py-3 px-4">{sub.first_name} {sub.last_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sub.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{sub.emails_sent || 0}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => deleteSubscriber(sub.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                          >
                            🗑️ מחק
                          </button>
                        </td>
                      </tr>
                    ))}
                    {subscribers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          אין מנויים עדיין
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== HISTORY TAB ==================== */}
          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-right py-3 px-4">נושא</th>
                    <th className="text-right py-3 px-4">סטטוס</th>
                    <th className="text-right py-3 px-4">תאריך שליחה</th>
                    <th className="text-right py-3 px-4">נמענים</th>
                    <th className="text-right py-3 px-4">נשלח/נכשל</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#0a0a0a]">
                      <td className="py-3 px-4">{item.subject}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'sending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{item.sent_at ? formatDate(item.sent_at) : '-'}</td>
                      <td className="py-3 px-4">{item.recipient_count || 0}</td>
                      <td className="py-3 px-4">
                        <span className="text-green-400">{item.sent_count || 0}</span>
                        {' / '}
                        <span className="text-red-400">{item.failed_count || 0}</span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        אין היסטוריה עדיין
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================== SETTINGS TAB ==================== */}
          {activeTab === 'settings' && (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">⚙️</span>
              <h3 className="text-xl font-medium mb-2">הגדרות Prompts</h3>
              <p className="text-gray-500">בקרוב - אפשרות להתאמת הפרומפטים והסגנון</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}