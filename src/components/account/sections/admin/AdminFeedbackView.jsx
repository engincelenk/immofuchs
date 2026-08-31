import { useCallback, useEffect, useState } from "react";
import { IconArrowLeft, IconArrowRight } from "../../accountIcons.jsx";
import { fetchFeedback } from "./adminApi.js";
import { errorText, mutedTextStyle, secondaryBtnStyle } from "./adminUiStyles.js";

const CATEGORY_LABELS = { bug: "Fehler", idee: "Idee", sonstiges: "Sonstiges" };

// Liest das Feedback-Modal aus (Spec neue-phase2, Abschnitt 2.4) - reine
// Leseansicht, analog zu AdminAuditLogView.jsx, aber ohne Filter: bei der
// erwarteten Startmenge lohnt sich das noch nicht.
export function AdminFeedbackView() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchFeedback(page));
    } catch (err) {
      setError(errorText(err));
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 16 }}>
        Freitext-Feedback aus „Mein Konto" → Hilfe, neueste zuerst.
      </p>

      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {!data && !error && <div style={mutedTextStyle}>Wird geladen …</div>}
      {data && data.entries.length === 0 && <div style={mutedTextStyle}>Noch kein Feedback.</div>}

      {data && data.entries.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.entries.map((entry) => (
              <div
                key={entry.id}
                style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 14 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{entry.email}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ch)", whiteSpace: "nowrap" }}>
                    {new Date(entry.erstelltAm).toLocaleString("de-DE")}
                    {entry.plattform ? ` · ${entry.plattform}` : ""}
                    {entry.category ? ` · ${CATEGORY_LABELS[entry.category] || entry.category}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ ...secondaryBtnStyle, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <IconArrowLeft size={16} />
              Zurück
            </button>
            <span style={{ fontSize: 13, color: "var(--ch)" }}>
              Seite {page} / {totalPages} · {data.total} Einträge
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ ...secondaryBtnStyle, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Weiter
              <IconArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
