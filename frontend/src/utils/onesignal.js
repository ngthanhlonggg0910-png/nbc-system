const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
let initialization;

function loadSdk() {
  const existingScript = document.querySelector('script[data-nbc-onesignal="true"]');
  if (existingScript) return existingScript;
  const script = document.createElement("script");
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.defer = true;
  script.dataset.nbcOnesignal = "true";
  document.head.appendChild(script);
  return script;
}

export function initializeOneSignal(staffId) {
  if (!appId || !staffId || typeof window === "undefined") return Promise.resolve(null);

  if (!initialization) {
    initialization = new Promise((resolve, reject) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: "onesignal/OneSignalSDKWorker.js",
            serviceWorkerParam: { scope: "/onesignal/" },
          });
          resolve(OneSignal);
        } catch (error) {
          initialization = undefined;
          reject(error);
        }
      });
      loadSdk();
    });
  }

  return initialization.then(async (OneSignal) => {
    await OneSignal.login(String(staffId));
    if (OneSignal.Notifications.permission && !OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optIn();
    }
    return OneSignal;
  });
}

export async function requestOneSignalPermission(staffId) {
  const OneSignal = await initializeOneSignal(staffId);
  if (!OneSignal) return false;
  await OneSignal.Notifications.requestPermission();
  if (OneSignal.Notifications.permission) {
    await OneSignal.User.PushSubscription.optIn();
  }
  const subscribed = Boolean(
    OneSignal.Notifications.permission &&
    OneSignal.User.PushSubscription.optedIn &&
    OneSignal.User.PushSubscription.id
  );
  if (!subscribed) {
    throw new Error("Không thể tạo đăng ký nhận thông báo nền trên thiết bị này.");
  }
  return true;
}

export async function getOneSignalStatus(staffId) {
  const OneSignal = await initializeOneSignal(staffId);
  if (!OneSignal) return { configured: false, permission: false, optedIn: false, subscriptionId: null };
  return {
    configured: true,
    permission: Boolean(OneSignal.Notifications.permission),
    optedIn: Boolean(OneSignal.User.PushSubscription.optedIn),
    subscriptionId: OneSignal.User.PushSubscription.id ?? null,
  };
}

export async function logoutOneSignal() {
  if (!initialization) return;
  const OneSignal = await initialization;
  await OneSignal.logout();
}
