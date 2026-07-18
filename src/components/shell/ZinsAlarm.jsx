import { useState, useEffect } from "react";
import { TL } from "../../i18n/translations.js";

function showAlarmNotification(avg, threshold, lang) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const l = TL[lang] || TL.de;
  const body = (l.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
    .replace('{avg}', avg).replace('{threshold}', threshold);
  try {
    new Notification(l.notifTitle || 'ImmoFuchs Zinsalarm', {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'zinsalarm',
      renotify: true,
    });
  } catch(e) { console.warn('[alarm] Notification failed:', e); }
}

// ═══════════ ZINSALARM COMPONENT ═══════════
export function ZinsAlarm({ zinsen, lang }) {
  const l = TL[lang] || TL.de;
  const avg = zinsen?.avg ?? null;

  const [threshold, setThreshold] = useState(() => {
    try { return parseFloat(localStorage.getItem('if_alarm_threshold') || '3.5'); }
    catch { return 3.5; }
  });
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('if_alarm_enabled') === '1'; }
    catch { return false; }
  });
  const [permission, setPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [saved, setSaved] = useState(false);

  const triggered = enabled && avg !== null && avg <= threshold;

  function persistAlarm(en, th) {
    localStorage.setItem('if_alarm_enabled', en ? '1' : '0');
    localStorage.setItem('if_alarm_threshold', String(th));
    // Inform SW
    try {
      navigator.serviceWorker?.controller?.postMessage({
        type: 'SET_ALARM', enabled: en, threshold: th,
        avg, lang,
        notifTitle: l.notifTitle || 'ImmoFuchs Zinsalarm',
        notifBody: (l.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
          .replace('{avg}', avg).replace('{threshold}', th),
      });
    } catch(e) {}
  }

  async function handleToggle() {
    let perm = permission;
    if (!enabled && perm !== 'granted') {
      if (!('Notification' in window)) return;
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (!enabled && perm !== 'granted') return;
    const next = !enabled;
    setEnabled(next);
    persistAlarm(next, threshold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Check on zinsen load
  useEffect(() => {
    if (!enabled || avg === null || permission !== 'granted') return;
    if (avg <= threshold) showAlarmNotification(avg, threshold, lang);
  }, [avg]);

  const card = {
    marginTop: 20,
    padding: '18px 20px',
    background: 'var(--cc)',
    border: '1px solid var(--cb)',
    borderRadius: 12,
  };
  const btnStyle = (active) => ({
    background: active ? 'var(--ca)' : 'var(--ca-bg)',
    color: active ? '#fff' : 'var(--ca)',
    border: '1px solid var(--ca-bd)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .2s, color .2s',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ct)' }}>{l.alarmTitle}</div>
          <div style={{ fontSize: 12, color: 'var(--ch)', marginTop: 2 }}>{l.alarmSub}</div>
        </div>
        {triggered && (
          <span style={{
            background: 'var(--ca-bg)', color: 'var(--ca)',
            border: '1px solid var(--ca-bd)', borderRadius: 8,
            padding: '3px 10px', fontSize: 12, fontWeight: 700,
          }}>
            🔔 {l.alarmTriggered}
          </span>
        )}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--cl)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {l.alarmThreshold}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            step="0.05"
            min="1"
            max="8"
            value={threshold}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) { setThreshold(v); if (enabled) persistAlarm(enabled, v); }
            }}
            style={{
              width: 76, height: 38,
              border: '1px solid var(--cb)', borderRadius: 8,
              padding: '0 10px', fontSize: 15,
              background: 'var(--ci)', color: 'var(--ct)',
              fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--ch)' }}>%</span>
        </div>

        {permission === 'denied'
          ? <span style={{ fontSize: 12, color: '#e74c3c', marginLeft: 'auto' }}>{l.alarmDenied}</span>
          : (
            <button style={{ ...btnStyle(enabled), marginLeft: 'auto' }} onClick={handleToggle}>
              {!enabled && permission !== 'granted'
                ? l.alarmPermission
                : enabled ? l.alarmBtnOff : l.alarmBtn}
            </button>
          )
        }

        {saved && <span style={{ fontSize: 12, color: '#27ae60' }}>{l.alarmSaved}</span>}
        {!saved && enabled && permission === 'granted' && (
          <span style={{ fontSize: 12, color: 'var(--ch)' }}>{l.alarmGranted}</span>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{
        margin: '14px 0 0',
        fontSize: 11, color: 'var(--ch)', lineHeight: 1.6,
        borderTop: '1px solid var(--cb)', paddingTop: 12,
      }}>
        ℹ️ {l.alarmHint}
      </p>
    </div>
  );
}
