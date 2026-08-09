import puppeteer from 'puppeteer-core';

async function run() {
  console.log("Launching Chrome to verify Subject Creation in Course Manager...");
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5176/#admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Click COURSE MANAGER tab
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.admin-sidebar-item'));
    const cm = items.find(el => el.textContent.includes('COURSE MANAGER'));
    if (cm) cm.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // 2. Click "+ Add Subject" in Selected Course Panel
  console.log("Opening Add Subject modal in Course Manager...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addSubBtn = btns.find(b => b.textContent.includes('Add Subject'));
    if (addSubBtn) addSubBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const screenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\course_manager_add_subject_modal.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log("Screenshot saved to:", screenshotPath);

  await browser.close();
  console.log("Subject Creation in Course Manager verification complete!");
}

run().catch(console.error);
