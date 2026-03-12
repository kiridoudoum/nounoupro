const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('file:///Users/antoinedhayer/Desktop/app%20nounou/index.html', { waitUntil: 'networkidle2', timeout: 5000 }).catch(e => console.log('GOTO TIMEOUT/ERROR:', e.message));
  
  await browser.close();
})();
