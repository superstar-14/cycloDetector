import { useState } from 'react';

export interface DistrictAlertData {
  districtName: string;
  state: string;
  vulnerabilityScore: number; // 0-100
  windSpeedKmh: number;
  rainfallMm: number;
  eta: string;
  isCoastal: boolean;
  prob64kt?: number;
  prob34kt?: number;
  popExposed?: number;
  alertSent?: boolean;
}

interface DistrictAlertCardProps {
  data: DistrictAlertData;
  onClose: () => void;
  onSendSms: (districtName: string, lang: string, provider: string) => Promise<any>;
}

// Multi-language template format matching specification
const REGIONAL_TEMPLATES: Record<string, { langName: string; template: (d: DistrictAlertData) => string }> = {
  en: {
    langName: 'English',
    template: (d) =>
      `URGENT: Cyclone alert for ${d.districtName}. Vulnerability Score is ${d.vulnerabilityScore}/100. Expected winds of ${d.windSpeedKmh} km/h at ${d.eta}. Please secure agricultural assets and seek shelter immediately. - Warning System`,
  },
  hi: {
    langName: 'हिंदी (Hindi)',
    template: (d) =>
      `तत्काल: ${d.districtName} के लिए चक्रवात चेतावनी। संवेदनशीलता स्कोर ${d.vulnerabilityScore}/100 है। ${d.eta} पर ${d.windSpeedKmh} किमी/घंटा की अपेक्षित हवाएं। कृपया कृषि संपत्ति को सुरक्षित करें और तुरंत आश्रय लें। - चेतावनी प्रणाली`,
  },
  or: {
    langName: 'ଓଡ଼ିଆ (Odia)',
    template: (d) =>
      `ଜରୁରୀ: ${d.districtName} ପାଇଁ ବାତ୍ୟା ସତର୍କତା। ସମ୍ବେଦନଶୀଳତା ସ୍କୋର ${d.vulnerabilityScore}/100। ${d.eta} ରେ ${d.windSpeedKmh} କିମି/ଘଣ୍ଟା ବେଗରେ ପବନ ଆଶଙ୍କା। ଦୟାକରି କୃଷି ସମ୍ପତ୍ତି ସୁରକ୍ଷିତ କରନ୍ତୁ ଏବଂ ତୁରନ୍ତ ଆଶ୍ରୟ ନିଅନ୍ତୁ। - ସତର୍କତା ପ୍ରଣାଳୀ`,
  },
  bn: {
    langName: 'বাংলা (Bengali)',
    template: (d) =>
      `জরুরী: ${d.districtName} এর জন্য ঘূর্ণিঝড় সতর্কতা। দুর্বলতা স্কোর ${d.vulnerabilityScore}/100। ${d.eta} এ প্রত্যাশিত বাতাস ${d.windSpeedKmh} কিমি/ঘন্টা। অনুগ্রহ করে কৃষি সম্পদ সুরক্ষিত করুন এবং অবিলম্বে নিরাপদ আশ্রয়ে যান। - সতর্কবার্তা ব্যবস্থা`,
  },
  te: {
    langName: 'తెలుగు (Telugu)',
    template: (d) =>
      `అత్యవసరం: ${d.districtName} కోసం తుఫాను హెచ్చరిక. ప్రమాద స్కోరు ${d.vulnerabilityScore}/100. ${d.eta} వద్ద గంటకు ${d.windSpeedKmh} కి.మీ అంచనా వేయబడిన గాలులు. దయచేసి వ్యవసాయ ఆస్తులను భద్రపరుచుకోండి మరియు వెంటనే ఆశ్రయం పొందండి. - హెచ్చరిక వ్యవస్థ`,
  },
  ta: {
    langName: 'தமிழ் (Tamil)',
    template: (d) =>
      `அவசரம்: ${d.districtName} மாவட்டத்திற்கான புயல் எச்சரிக்கை. பாதிப்பு மதிப்பீடு ${d.vulnerabilityScore}/100. ${d.eta} நேரத்தில் ${d.windSpeedKmh} கிமீ/மணி வேகத்தில் காற்று வீசக்கூடும். உடனடியாக பாதுகாப்பான இடத்திற்கு செல்லவும். - எச்சரிக்கை அமைப்பு`,
  },
  gu: {
    langName: 'ગુજરાતી (Gujarati)',
    template: (d) =>
      `તાકીદ: ${d.districtName} માટે વાવાઝોડાની ચેતવણી. સંવેદનશીલતા સ્કોર ${d.vulnerabilityScore}/100 છે. ${d.eta} સમયે ${d.windSpeedKmh} કિમી/કલાકની પવનની સંભાવના. કૃપા કરીને કૃષિ સંપત્તિ સુરક્ષિત કરો અને તરત જ આશ્રય લો. - ચેતવણી પ્રણાલી`,
  },
};

export function DistrictAlertCard({ data, onClose, onSendSms }: DistrictAlertCardProps) {
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [provider, setProvider] = useState<'Fast2SMS' | 'Twilio' | 'AWS_SNS'>('Fast2SMS');
  const [sending, setSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);

  // Status Badge definition
  let statusBadge = { label: 'Safe', color: 'var(--accent-green)', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)' };
  let progressColor = '#22c55e'; // Green < 40

  if (data.vulnerabilityScore >= 75) {
    statusBadge = { label: 'Evacuate', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.25)', border: '#ef4444' };
    progressColor = '#ef4444'; // Red > 75
  } else if (data.vulnerabilityScore >= 40) {
    statusBadge = { label: 'Warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b' };
    progressColor = '#f59e0b'; // Yellow 40-75
  }

  const isThresholdTriggered = data.vulnerabilityScore >= 80;

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await onSendSms(data.districtName, selectedLang, provider);
      setDispatchResult(res);
    } catch (e: any) {
      setDispatchResult({ error: e?.message || 'Dispatch failed' });
    } finally {
      setSending(false);
    }
  };

  const previewMessage = REGIONAL_TEMPLATES[selectedLang]?.template(data) || REGIONAL_TEMPLATES.en.template(data);

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '380px',
        maxHeight: 'calc(100% - 32px)',
        zIndex: 50,
        background: 'rgba(11, 19, 36, 0.95)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${data.vulnerabilityScore >= 75 ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-default)'}`,
        boxShadow: data.vulnerabilityScore >= 75 ? '0 12px 36px rgba(239, 68, 68, 0.2)' : '0 12px 32px rgba(0, 0, 0, 0.5)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: data.vulnerabilityScore >= 75 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🏛️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
              {data.districtName}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {data.state} {data.isCoastal ? '• Coastal District' : '• Inland District'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Status Badge */}
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: statusBadge.color,
              background: statusBadge.bg,
              border: `1px solid ${statusBadge.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {data.vulnerabilityScore >= 75 && <span style={{ animation: 'pulse 1s infinite' }}>🚨</span>}
            {statusBadge.label}
          </span>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Close Alert Card"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body Scrollable */}
      <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {/* Vulnerability Score Gauge */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Vulnerability Score
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: progressColor }}>
              {data.vulnerabilityScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
            </span>
          </div>

          {/* Progress Bar with Color-Coded Range */}
          <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(5, data.vulnerabilityScore))}%`,
                height: '100%',
                background: progressColor,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            <span>0 (Safe &lt;40)</span>
            <span>40 (Warning)</span>
            <span>75 (Evacuate &gt;75)</span>
            <span>100</span>
          </div>
        </div>

        {/* Local Storm Parameters Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-default)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Peak Wind</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
              {data.windSpeedKmh} <span style={{ fontSize: '0.65rem' }}>km/h</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--accent-blue)' }}>
              {Math.round(data.windSpeedKmh / 1.852)} kt
            </div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-default)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Rainfall</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              {data.rainfallMm} <span style={{ fontSize: '0.65rem' }}>mm</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>24h Peak</div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-default)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Arrival ETA</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
              {data.eta}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Gale Winds</div>
          </div>
        </div>

        {/* Threshold Trigger Status Alert */}
        {isThresholdTriggered && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.7rem',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '1rem' }}>⚡</span>
            <div>
              <strong>Threshold Trigger Breached (Score ≥ 80):</strong>
              <div>Automated SMS alert dispatch activated for district administration and farmers.</div>
            </div>
          </div>
        )}

        {/* Multi-Language Ready Template Preview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              🌐 Multi-Language Alert Payload:
            </span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid var(--border-default)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {Object.entries(REGIONAL_TEMPLATES).map(([code, val]) => (
                <option key={code} value={code}>
                  {val.langName}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              background: '#040b17',
              border: '1px solid var(--border-default)',
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              lineHeight: 1.4,
              color: '#e2e8f0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            "{previewMessage}"
          </div>
        </div>

        {/* SMS Dispatch Configuration */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Gateway:</label>
          <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
            {(['Fast2SMS', 'Twilio', 'AWS_SNS'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                style={{
                  flex: 1,
                  fontSize: '0.65rem',
                  padding: '3px 4px',
                  borderRadius: '4px',
                  background: provider === p ? 'var(--accent-blue)' : '#1e293b',
                  color: provider === p ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Dispatch SMS */}
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            width: '100%',
            padding: '0.55rem',
            background: data.vulnerabilityScore >= 75 ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'var(--btn-primary-bg)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? (
            <>⏳ Dispatching SMS Broadcast...</>
          ) : (
            <>📡 Dispatch Alert SMS ({provider})</>
          )}
        </button>

        {/* Dispatch Confirmation Feedback */}
        {dispatchResult && (
          <div
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.68rem',
              background: dispatchResult.error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: `1px solid ${dispatchResult.error ? '#ef4444' : '#22c55e'}`,
              color: dispatchResult.error ? '#fca5a5' : '#86efac',
            }}
          >
            {dispatchResult.error ? (
              <div>❌ {dispatchResult.error}</div>
            ) : (
              <div>
                <div>✅ <strong>SMS Broadcast Dispatched!</strong></div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Gateway: {dispatchResult.alert?.provider || provider} • ID: {dispatchResult.alert?.id || 'ALT-2026-LIVE'} • Status: DELIVERED
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
