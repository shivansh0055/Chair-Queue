const nodemailer = require("nodemailer");

// Uses Gmail SMTP with an "app password" (not your normal Gmail password).
// To get one: Google Account -> Security -> 2-Step Verification -> App passwords.
// Put the resulting values in .env as EMAIL_USER and EMAIL_PASS.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendBookingEmail({ to, shopkeeperName, shopName, customerName, customerPhone, date, startTime, endTime }) {
  // If email isn't configured, skip quietly instead of crashing the booking flow
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("Email not configured (EMAIL_USER/EMAIL_PASS missing) - skipping notification email.");
    return;
  }

  const mailOptions = {
    from: `"Chair&Queue" <${process.env.EMAIL_USER}>`,
    to,
    subject: `New booking at ${shopName} — ${date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#c9622a;">New booking received</h2>
        <p>Hi ${shopkeeperName},</p>
        <p><strong>${customerName}</strong> just booked a slot at <strong>${shopName}</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:6px 0; color:#666;">Date</td><td style="padding:6px 0;"><strong>${date}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#666;">Time</td><td style="padding:6px 0;"><strong>${startTime} – ${endTime}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#666;">Customer</td><td style="padding:6px 0;">${customerName}</td></tr>
          ${customerPhone ? `<tr><td style="padding:6px 0; color:#666;">Phone</td><td style="padding:6px 0;">${customerPhone}</td></tr>` : ""}
        </table>
        <p style="color:#888; font-size:13px;">Log in to your Chair&amp;Queue dashboard to see all bookings for this shop.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Booking notification email sent to ${to}`);
  } catch (err) {
    // Don't let an email failure break the booking itself
    console.error("Failed to send booking email:", err.message);
  }
}

module.exports = { sendBookingEmail };
