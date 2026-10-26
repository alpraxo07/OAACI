import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";
import { APP_FULL_NAME, APP_NAME } from "./constants";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!env.smtp) return null;
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });
  return transporter;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(heading: string, paragraphs: string[], button?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p)}</p>`).join("");
  const cta = button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="background:#c2410c;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#6b635b">Or paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(button.url)}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#faf7f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#c2410c;margin-bottom:4px">${APP_NAME}</div>
    <div style="font-size:12px;color:#6b635b;margin-bottom:28px">${APP_FULL_NAME}</div>
    <div style="background:#fff;border:1px solid #e7e0d6;border-radius:16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>${body}${cta}
    </div>
    <p style="font-size:12px;color:#6b635b;margin-top:20px">You received this email because of activity on your ${APP_NAME} account. If this wasn't you, you can ignore it.</p>
  </div></body></html>`;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
}): Promise<void> {
  const html = layout(opts.heading, opts.paragraphs, opts.button);
  const text = [opts.heading, "", ...opts.paragraphs, ...(opts.button ? ["", `${opts.button.label}: ${opts.button.url}`] : [])].join("\n");
  const t = getTransporter();
  if (!t) {
    console.info(`\n[oaaci:email] To: ${opts.to}\nSubject: ${opts.subject}\n${text}\n`);
    return;
  }
  await t.sendMail({ from: env.emailFrom, to: opts.to, subject: opts.subject, html, text });
}

export const emails = {
  verify: (to: string, name: string, url: string) =>
    sendMail({
      to,
      subject: `Confirm your email for ${APP_NAME}`,
      heading: `Welcome to ${APP_NAME}, ${name}!`,
      paragraphs: ["Please confirm your email address so you can start posting and messaging other artists.", "This link expires in 48 hours."],
      button: { label: "Confirm email", url },
    }),
  reset: (to: string, url: string) =>
    sendMail({
      to,
      subject: `Reset your ${APP_NAME} password`,
      heading: "Reset your password",
      paragraphs: ["Someone (hopefully you) asked to reset the password for your account.", "This link expires in 1 hour. If you didn't ask for this, you can safely ignore this email."],
      button: { label: "Choose a new password", url },
    }),
  changeEmail: (to: string, url: string) =>
    sendMail({
      to,
      subject: `Confirm your new email for ${APP_NAME}`,
      heading: "Confirm your new email address",
      paragraphs: ["Click the button below to start using this email address for your account.", "This link expires in 48 hours."],
      button: { label: "Confirm new email", url },
    }),
  invite: (to: string, name: string, code: string, url: string) =>
    sendMail({
      to,
      subject: `You're invited to ${APP_NAME}`,
      heading: `${name}, your invite is here`,
      paragraphs: [
        `${APP_NAME} is an invite-only community for Indian artists and craftspeople. We'd love to have you.`,
        `Your invite code is ${code}.`,
      ],
      button: { label: "Create your account", url },
    }),
};
