import puppeteer from 'puppeteer-core';

async function run() {
  console.log("Launching Chrome for Action Menu Positioning Verification...");
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5176/#admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Navigate to SUBJECTS section
  console.log("Navigating to SUBJECTS tab...");
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.admin-sidebar-item'));
    const sub = items.find(el => el.textContent.includes('SUBJECTS'));
    if (sub) sub.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Click 3-dots action button on the first Subject row
  console.log("Clicking 3-dots button on first Subject row...");
  await page.evaluate(() => {
    const dotsBtns = Array.from(document.querySelectorAll('.sm-three-dots-btn'));
    if (dotsBtns.length > 0) dotsBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const screenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\subject_action_menu_anchored.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log("Action menu screenshot saved to:", screenshotPath);

  await browser.close();
  console.log("Action Menu verification finished successfully!");
}

run().catch(console.error);
