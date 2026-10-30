import "server-only";

type Mail = { to: string; subject: string; text: string; html: string };

/** False in production without a Resend key, when no email can reach anyone. */
export function canSendMail(): boolean {
  return Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";
}

/**
 * Sends an email through Resend. Returns false instead of throwing: a failed email
 * must never undo the sign-up or reveal anything to the visitor, and the panel
 * offers to send it again. Without an API key, development prints the mail.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY is not set: email not sent.");
      return false;
    }
    console.info(`[mail] to ${mail.to}: ${mail.subject}\n${mail.text}`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, ...mail }),
    });
    if (!response.ok) console.error(`Resend answered ${response.status}.`);
    return response.ok;
  } catch (error) {
    console.error("Could not reach Resend.", error);
    return false;
  }
}

/** A short message with one button. `url` and the texts are ours, never user input. */
export function actionMail(intro: string, label: string, url: string): Pick<Mail, "text" | "html"> {
  return {
    text: `${intro}\n\n${label}: ${url}\n\nSe não foi você, pode ignorar este email.`,
    html: `<p>${intro}</p><p><a href="${url}">${label}</a></p><p>Se não foi você, pode ignorar este email.</p>`,
  };
}
