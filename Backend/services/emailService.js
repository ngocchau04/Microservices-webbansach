const nodemailer = require('nodemailer');
require('dotenv').config();

const sendMail = async (to, subject, text) => {
    try {
        // Tạo transporter với Gmail App Password
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + result.response);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.log('Error sending email: ', error);
        return { success: false, message: error.message };
    }
}

module.exports = {sendMail};