const nodemailer = require('./node_modules/nodemailer');

async function testSmtp() {
  console.log('Testing SMTP connection to mail.verital.ae...');
  
  const transporter = nodemailer.createTransport({
    host: 'mail.verital.ae',
    port: 465,
    secure: true,
    auth: {
      user: 'alerts@verital.ae',
      pass: 'VMcs2@26',
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: true,
    logger: true,
  });

  try {
    const verified = await transporter.verify();
    console.log('✅ SMTP Connection & Auth Successful:', verified);
    
    const info = await transporter.sendMail({
      from: '"VMCertifs - Verital Marine" <alerts@verital.ae>',
      to: 'alerts@verital.ae',
      subject: 'VMCertifs Test Email',
      text: 'This is a test email from VMCertifs.',
    });
    console.log('✅ Email sent successfully:', info.messageId);
  } catch (err) {
    console.error('❌ SMTP Error:', err);
  }
}

testSmtp();
