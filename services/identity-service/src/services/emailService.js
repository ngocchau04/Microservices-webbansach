const nodemailer = require("nodemailer");

const sendEmail = async ({ config, to, subject, text }) => {
  if (!config.emailUser || !config.emailPassword) {
    console.warn(
      "[identity-service] EMAIL_USER/EMAIL_PASSWORD missing. Email skipped."
    );
    return { success: false, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.emailUser,
      pass: config.emailPassword,
    },
  });

  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
  });

  return { success: true };
};

module.exports = {
  sendEmail,
};
