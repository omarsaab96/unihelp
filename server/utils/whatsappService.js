
async function sendWhatsapp(to, code) {
    try {
        const response = await fetch('https://api.verifyway.com/api/v1/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VERIFYWAY_API_KEY}`,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify({
                "recipient": to,
                "type": "otp",
                "channel": "whatsapp",
                "fallback": "no",
                "code": code,
                "lang": "en"
            })
        });

        const data = await response.json();

        // Check if the HTTP response itself failed
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // More explicit check for success
        if (data.status !== "success") {
            throw new Error(`HTTP error! ${data.error||'Unknown error'}`);
        }

        console.log("WhatsApp sent successfully:", data);
        return true;
        
    } catch (err) {
        console.error("WhatsApp send error:", err);
        return false;
    }
}

module.exports = { sendWhatsapp };