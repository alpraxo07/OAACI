import "server-only";

const isProd = process.env.NODE_ENV === "production";

/** Reads a variable, ignoring surrounding spaces and quotes pasted in by mistake. */
function value(name: string): string | undefined {
  const v = process.env[name]?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return v ? v : undefined;
}

const sessionSecret = value("SESSION_SECRET");
if (isProd && (!sessionSecret || sessionSecret.length < 32)) {
  console.warn("[oaaci] SESSION_SECRET is missing or shorter than 32 characters.");
}

export const env = {
  isProd,
  appUrl: (value("APP_URL") ?? "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: sessionSecret ?? "dev-only-insecure-secret-change-me-please",
  adminEmails: (value("ADMIN_EMAILS") ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.replace(/["'<>]/g, "").trim().toLowerCase())
    .filter(Boolean),

  cloudinary:
    value("CLOUDINARY_CLOUD_NAME") && value("CLOUDINARY_API_KEY") && value("CLOUDINARY_API_SECRET")
      ? {
          cloudName: value("CLOUDINARY_CLOUD_NAME")!,
          apiKey: value("CLOUDINARY_API_KEY")!,
          apiSecret: value("CLOUDINARY_API_SECRET")!,
        }
      : null,

  smtp: value("SMTP_HOST")
    ? {
        host: value("SMTP_HOST")!,
        port: Number(value("SMTP_PORT") ?? 587),
        user: value("SMTP_USER"),
        password: value("SMTP_PASSWORD"),
      }
    : null,
  emailFrom: value("EMAIL_FROM") ?? "OAACI <no-reply@oaaci.local>",

  google:
    value("GOOGLE_CLIENT_ID") && value("GOOGLE_CLIENT_SECRET")
      ? { clientId: value("GOOGLE_CLIENT_ID")!, clientSecret: value("GOOGLE_CLIENT_SECRET")! }
      : null,

  twilio:
    value("TWILIO_ACCOUNT_SID") && value("TWILIO_AUTH_TOKEN") && value("TWILIO_FROM")
      ? {
          accountSid: value("TWILIO_ACCOUNT_SID")!,
          authToken: value("TWILIO_AUTH_TOKEN")!,
          from: value("TWILIO_FROM")!,
        }
      : null,

  pusher:
    value("PUSHER_APP_ID") && value("PUSHER_SECRET") && value("NEXT_PUBLIC_PUSHER_KEY")
      ? {
          appId: value("PUSHER_APP_ID")!,
          key: value("NEXT_PUBLIC_PUSHER_KEY")!,
          secret: value("PUSHER_SECRET")!,
          cluster: value("NEXT_PUBLIC_PUSHER_CLUSTER") ?? "ap2",
        }
      : null,

  sightengine:
    value("SIGHTENGINE_API_USER") && value("SIGHTENGINE_API_SECRET")
      ? { user: value("SIGHTENGINE_API_USER")!, secret: value("SIGHTENGINE_API_SECRET")! }
      : null,
};

/** Phone OTP works with Twilio, or in development where codes are printed to the console. */
export const phoneLoginEnabled = () => Boolean(env.twilio) || !env.isProd;
export const googleLoginEnabled = () => Boolean(env.google);
