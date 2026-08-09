import puppeteer from 'puppeteer-core';

async function run() {
  console.log("Launching Chrome for Chapter Manager Verification...");
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5176/#admin', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Click CHAPTERS sidebar item
  console.log("Navigating to CHAPTERS tab...");
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.admin-sidebar-item'));
    const ch = items.find(el => el.textContent.includes('CHAPTERS'));
    if (ch) ch.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const screenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\chapter_manager_desktop.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log("Desktop Chapter Manager screenshot saved to:", screenshotPath);

  await browser.close();
  console.log("Chapter Manager verification complete!");
}

run().catch(console.error);
