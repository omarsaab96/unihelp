const crypto = require("crypto");

// generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// create hash with expiry
function generateVerificationToken(otp) {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  const data = `${otp}.${expiresAt}`;
  const hash = crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(data)
    .digest("hex");

  return { token: `${hash}.${expiresAt}`, otp }; // otp only for sending email
}

// verify hash
function verifyOTP(otp, token) {
  const [hash, expiresAt] = token.split(".");
  if (Date.now() > parseInt(expiresAt)) return false;

  const data = `${otp}.${expiresAt}`;
  const newHash = crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(data)
    .digest("hex");

  return newHash === hash;
}


module.exports = { generateOTP, generateVerificationToken, verifyOTP };