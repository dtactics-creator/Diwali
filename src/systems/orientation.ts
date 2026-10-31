// Screen orientation helpers for landscape gameplay mode.
// All calls are defensive: unsupported browsers simply no-op.

type LockableOrientation = {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

type OrientationScreen = Screen & {
  lockOrientation?: (orientation: string) => boolean;
  mozLockOrientation?: (orientation: string) => boolean;
  msLockOrientation?: (orientation: string) => boolean;
  unlockOrientation?: () => void;
  mozUnlockOrientation?: () => void;
  msUnlockOrientation?: () => void;
};

function getOrientationApi(): LockableOrientation | undefined {
  if (typeof screen === 'undefined') return undefined;
  return (screen as any).orientation as LockableOrientation | undefined;
}

export function isOrientationLockSupported(): boolean {
  if (typeof screen === 'undefined') return false;
  const orientationApi = getOrientationApi();
  const orientationScreen = screen as OrientationScreen;
  return (
    typeof orientationApi?.lock === 'function' ||
    typeof orientationScreen.lockOrientation === 'function' ||
    typeof orientationScreen.mozLockOrientation === 'function' ||
    typeof orientationScreen.msLockOrientation === 'function'
  );
}

export async function requestLandscape(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  // Fullscreen is required by most browsers before an orientation lock
  // can be applied. Failures here are non-fatal.
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Fullscreen may be rejected or unsupported; continue to lock attempt.
  }

  try {
    const orientationApi = getOrientationApi();
    if (orientationApi && typeof orientationApi.lock === 'function') {
      await orientationApi.lock('landscape');
      return true;
    }

    const orientationScreen = screen as OrientationScreen;
    if (typeof orientationScreen.lockOrientation === 'function') {
      orientationScreen.lockOrientation('landscape');
      return true;
    }
    if (typeof orientationScreen.mozLockOrientation === 'function') {
      orientationScreen.mozLockOrientation('landscape');
      return true;
    }
    if (typeof orientationScreen.msLockOrientation === 'function') {
      orientationScreen.msLockOrientation('landscape');
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function releaseLandscape(): void {
  if (typeof document === 'undefined') return;

  try {
    const orientationApi = getOrientationApi();
    if (orientationApi && typeof orientationApi.unlock === 'function') {
      orientationApi.unlock();
    }
  } catch {
    // Ignore unlock failures.
  }

  try {
    const orientationScreen = screen as OrientationScreen;
    if (typeof orientationScreen.unlockOrientation === 'function') {
      orientationScreen.unlockOrientation();
    }
    if (typeof orientationScreen.mozUnlockOrientation === 'function') {
      orientationScreen.mozUnlockOrientation();
    }
    if (typeof orientationScreen.msUnlockOrientation === 'function') {
      orientationScreen.msUnlockOrientation();
    }
  } catch {
    // Ignore vendor unlock failures.
  }

  try {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  } catch {
    // Ignore exit fullscreen failures.
  }
}

export function getOrientationKind(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}
