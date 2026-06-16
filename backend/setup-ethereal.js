const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }

    console.log('Created Ethereal account: %s', account.user);

    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Append credentials to .env
    envContent += `\nSMTP_HOST=smtp.ethereal.email\n`;
    envContent += `SMTP_PORT=587\n`;
    envContent += `SMTP_USER=${account.user}\n`;
    envContent += `SMTP_PASS=${account.pass}\n`;
    envContent += `SMTP_FROM="Chrono Stellar <noreply@chronostellar.com>"\n`;

    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env with Ethereal credentials.');
});
