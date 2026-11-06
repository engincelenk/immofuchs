// "Laden" einer Objektkarte (Merkliste.jsx): laedt das Objekt in den Rechner UND macht es zum aktiven Objekt.
// Das aktive Objekt (App.jsx aktivesObjekt) sorgt dafuer, dass "Speichern" im Rechner dieses Objekt
// aktualisiert, statt ein neues anzulegen. Ohne diese Uebergabe entstand bei jedem Laden + Speichern ein Duplikat.
export function ladeAlsAktivesObjekt(obj, loadObj, setTabExt) {
  loadObj(obj, (tabId) => setTabExt(tabId, { id: obj.id, name: obj.name }));
}
