export function LegalModal({type,onClose}){
  if(!type)return null;
  const content=type==="impressum"?{
    title:"Impressum",
    sub:"Anbieterkennzeichnung nach § 5 TMG",
    body:<>
      <h3 style={lmH3}>Angaben zum Betreiber</h3>
      <div style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:10,padding:"16px 20px",margin:"12px 0",fontSize:13,lineHeight:1.8}}>
        <strong>Engin Celenk</strong><br/>
        Kontakt per E-Mail: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a>
      </div>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        ℹ️ Diese Website stellt kostenlose Rechner-Tools für private Nutzung bereit. Es werden keine Produkte oder Dienstleistungen verkauft. Es besteht kein Handelsgewerbe.
      </div>
      <h3 style={lmH3}>Verantwortlich i. S. d. § 18 Abs. 2 MStV</h3>
      <p style={lmP}>Der Websitebetreiber (Kontaktadresse wie oben).</p>
      <h3 style={lmH3}>Haftung für Inhalte</h3>
      <p style={lmP}>Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      <p style={lmP}>Die Berechnungen auf dieser Website dienen ausschließlich der Orientierung und ersetzen keine professionelle Rechts-, Steuer- oder Finanzberatung. Für die Richtigkeit der Ergebnisse wird keine Gewähr übernommen.</p>
      <h3 style={lmH3}>Haftung für Links</h3>
      <p style={lmP}>Diese Website enthält keine bezahlten Affiliate-Links und keine Werbung. Sollten externe Links vorhanden sein, haben wir auf deren Inhalte keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
      <h3 style={lmH3}>Urheberrecht</h3>
      <p style={lmP}>Die erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Rechner dürfen frei genutzt, jedoch nicht ohne Erlaubnis kopiert oder kommerziell verwertet werden.</p>
      <h3 style={lmH3}>Verbraucherstreitbeilegung</h3>
      <p style={lmP}>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={lmA}>https://ec.europa.eu/consumers/odr</a>. Ich bin weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, da kein Verbrauchervertrag besteht.</p>
    </>
  }:{
    title:"Datenschutzerklärung",
    sub:null,
    body:<>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        <strong>Kurz &amp; klar:</strong> immofuchs.info verzichtet vollständig auf Tracking, Analytics, Werbung und Affiliate-Links. Alle Berechnungen laufen ausschließlich lokal in Ihrem Browser. Es werden keine personenbezogenen Daten an Server übertragen.
      </div>
      <h3 style={lmH3}>1. Verantwortliche Stelle</h3>
      <p style={lmP}>Engin Celenk.<br/>Kontakt: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>2. Datenverarbeitung auf einen Blick</h3>
      <p style={lmP}>Immofuchs ist eine rein clientseitige Webanwendung. Alle Berechnungen finden ausschließlich in Ihrem Browser statt. Es werden <strong>keine personenbezogenen Daten an Server übertragen</strong>.</p>
      <h3 style={lmH3}>3. Lokale Datenspeicherung (localStorage)</h3>
      <p style={lmP}>Ihre Eingaben (Kaufpreis, Zinssatz, etc.) werden im localStorage Ihres Browsers gespeichert, damit Sie beim nächsten Besuch fortfahren können. Diese Daten:</p>
      <ul style={lmUl}><li>verlassen niemals Ihren Browser</li><li>sind nur für Sie zugänglich</li><li>können jederzeit über die Browser-Einstellungen gelöscht werden</li></ul>
      <h3 style={lmH3}>4. Cookies</h3>
      <p style={lmP}>Immofuchs setzt <strong>keine Tracking-Cookies</strong>. Es wird lediglich localStorage verwendet (technisch notwendig).</p>
      <h3 style={lmH3}>5. Hosting &amp; Server-Logs</h3>
      <p style={lmP}>Die Website wird bei einem Hosting-Anbieter betrieben. Beim Abrufen der Seiten werden durch den Hosting-Anbieter automatisch technische Zugriffsdaten in Server-Log-Dateien gespeichert (Browsertyp, Betriebssystem, Referrer-URL, Datum/Uhrzeit, IP-Adresse). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
      <h3 style={lmH3}>6. Externe Dienste</h3>
      <p style={lmP}>Zur Darstellung der Website werden Schriftarten von Google Fonts (DM Sans) geladen. Dabei kann die IP-Adresse an Google übertragen werden.</p>
      <p style={lmP}>Optional werden tagesaktuelle Bauzinsen von einer öffentlichen JSON-Datei geladen (GitHub Pages). Diese Datei enthält keine personenbezogenen Daten; beim Abruf wird Ihre IP-Adresse an GitHub übertragen.</p>
      <p style={lmP}>Es werden <strong>keine</strong> weiteren externen Dienste eingebunden — kein Google Analytics, keine Werbung, kein Facebook Pixel, keine Affiliate-Links.</p>
      <h3 style={lmH3}>7. Ihre Rechte (DSGVO)</h3>
      <p style={lmP}>Sie haben das Recht auf:</p>
      <ul style={lmUl}>
        <li>Auskunft über verarbeitete Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO) — Löschen Sie Ihre Browser-Daten</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p style={lmP}>Für Anfragen: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>8. SSL-/TLS-Verschlüsselung</h3>
      <p style={lmP}>Diese Seite nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung.</p>
    </>
  };
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,animation:"lmFade .2s ease"}}>
    <style>{`@keyframes lmFade{from{opacity:0}to{opacity:1}}@keyframes lmSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--cc)",borderRadius:14,maxWidth:720,width:"100%",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"lmSlide .25s ease",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid var(--cb)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:"var(--ca)",margin:0}}>{content.title}</h2>
          <p style={{fontSize:12,color:"var(--ch)",margin:"4px 0 0"}}>{content.sub}</p>
        </div>
        <button onClick={onClose} aria-label="Schließen" style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:8,width:34,height:34,fontSize:18,cursor:"pointer",color:"var(--ch)",display:"flex",alignItems:"center",justifyContent:"center",padding:0,fontFamily:"inherit"}}>×</button>
      </div>
      <div style={{padding:"20px 24px",overflow:"auto",flex:1,fontSize:13,color:"var(--cl)",lineHeight:1.7}}>
        {content.body}
      </div>
      <div style={{padding:"14px 24px",borderTop:"1px solid var(--cb)",background:"var(--ci)",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--ch)",flexShrink:0,flexWrap:"wrap",gap:8}}>
        <span>© 2026 immofuchs.info · Engin Celenk</span>
        <button onClick={onClose} style={{background:"var(--ca)",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Schließen</button>
      </div>
    </div>
  </div>;
}
const lmH3={fontSize:14,fontWeight:700,color:"var(--ct)",marginTop:20,marginBottom:8};
const lmP={fontSize:13,color:"var(--cl)",marginBottom:8,lineHeight:1.7};
const lmUl={paddingLeft:20,marginBottom:8,fontSize:13,color:"var(--cl)",lineHeight:1.8};
const lmA={color:"var(--ca)",textDecoration:"none"};
