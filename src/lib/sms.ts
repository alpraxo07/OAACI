import "server-only";
import { env } from "./env";
import { UserError } from "./action";

/** Sends an SMS through Twilio. In development without Twilio, prints to the console. */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!env.twilio) {
    if (env.isProd) throw new UserError("Phone login isn't available right now.");
    console.info(`\n[oaaci:sms] To: ${to}\n${body}\n`);
    return;
  }
  const { accountSid, authToken, from } = env.twilio;
  const params = new URLSearchParams({ To: to, Body: body });
  params.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    console.error("[oaaci:sms] Twilio error", res.status, await res.text());
    throw new UserError("We couldn't send the code. Please check the number and try again.");
  }
}
