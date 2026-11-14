/**
 * Adding Deegee to the home screen. Only the web build has anything to do here — a native app is
 * already installed — so this is the empty version.
 */
export type InstallState = {
  /** The browser has offered to install, so we can show a button that does it in one tap. */
  canInstall: boolean;
  /** iPhone: Safari never offers, so the only route is the share sheet, which has to be explained. */
  showIosHint: boolean;
  /** Already on the home screen. */
  installed: boolean;
  install: () => void;
  dismiss: () => void;
};

export function useInstall(): InstallState {
  return { canInstall: false, showIosHint: false, installed: true, install: () => {}, dismiss: () => {} };
}
