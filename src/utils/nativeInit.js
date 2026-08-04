// Kleine native "Look & Feel"-Ergaenzungen (Spec S6-3/S6-4: Splashscreen,
// Statusbar, Haptics, native Tab-Navigation statt reinem Web-Menue - eines
// der konkreten 4.2-Argumente gegenueber Apple). Ausserhalb einer nativen
// Huelle folgenlos (isNative() false), da @capacitor/haptics/splash-screen
// im Web-Kontext zu No-Op-Implementierungen zurueckfallen.
import { isNative } from "./nativeAuth.js";

export async function hideSplashScreen() {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* Plugin nicht verfuegbar (z.B. Web-Preview ohne echten nativen Build) */
  }
}

// Leichtes haptisches Feedback beim Tab-Wechsel - kleine, aber spuerbare
// Ergaenzung, die eine reine Web-Navigation nicht bieten kann.
export async function tabSwitchHaptic() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* Plugin nicht verfuegbar */
  }
}
