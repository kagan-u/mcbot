const FlayerCaptcha = require('flayercaptcha');
const Tesseract = require('tesseract.js');

// Captcha init (delay artırdım, image tamamlansın diye)
const captcha = new FlayerCaptcha(bot, { delay: 200 });

// 1. ENVANTER MAP CAPTCHA (en yaygın anarşi tipi)
captcha.on('inventoryInfo', async ({ data, image }) => {
  console.log(`Map ID: ${data.mapId} envanterde yakalandı, OCR...`);
  
  // Sharp image'ı buffer'a al + preprocess (kontrast artır)
  const processed = image
    .greyscale()
    .normalize()
    .toBuffer();
  
  const { data: { text } } = await Tesseract.recognize(processed, {
    logger: m => console.log(m.status),  // progress
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'  // sadece kod char'ları
  });
  
  let code = text.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();  // Temizle + lowercase (çoğu sunucu case-insensitive)
  
  if (code.length < 3) {  // Kısa/zayıf okuma → retry veya log
    console.log('Zayıf OCR, manuel bak:', `captcha_${data.mapId}.png`);
    await image.toFile(`captcha_${data.mapId}.png`);
    return;
  }
  
  console.log(`Okunan kod: ${code}`);
  
  // Chat'e yaz (sunucuya göre ayarla: direkt kod veya /verify KOD)
  setTimeout(() => {
    bot.chat(code);  // veya bot.chat(`/verify ${code}`);
  }, 800);  // 0.8s bekle, sunucu lag'ini alsın
});

// 2. DUVAR/FRAME CAPTCHA (eğer birden fazla frame varsa imageReady, tekse frameInfo)
captcha.on('imageReady', async ({ data, image }) => {
  console.log(`Frame'ler birleşti (${data.frames.length} adet), OCR...`);
  
  // Aynı OCR logic
  const processed = image.greyscale().normalize().toBuffer();
  const { data: { text } } = await Tesseract.recognize(processed, { /* aynı config */ });
  const code = text.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  setTimeout(() => bot.chat(code), 800);
});

// Opsiyonel: Tek frame için
captcha.on('frameInfo', async ({ data, image }) => {
  // Yukarıdaki gibi OCR + chat
});

bot.once('spawn', () => {
  console.log('Spawn! Captcha handler aktif.');
});
