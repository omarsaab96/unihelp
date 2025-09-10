
const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const REMOVE_BG_API_KEY = 'ty9sdnF7P1DzzCSgjdqizqCp';

router.post('/', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Remove the data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_file_b64: base64Data,
        size: 'auto',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remove.bg API error:', errorText);
      return res.status(500).json({ error: 'Background removal failed', details: errorText });
    }

    const buffer = await response.buffer();
    const outputBase64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${outputBase64}`;

    res.json({ image: dataUrl });
  } catch (err) {
    console.error('Background removal failed:', err);
    res.status(500).json({ error: 'Background removal failed' });
  }
});

module.exports = router;
