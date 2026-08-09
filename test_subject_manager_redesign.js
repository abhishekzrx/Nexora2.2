import puppeteer from 'puppeteer-core';

async function run() {
  console.log("Launching Chrome for Subject Manager Verification...");
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. DESKTOP TEST (1280x800)
  console.log("\n--- DESKTOP SUBJECT MANAGER VERIFICATION (1280x800) ---");
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5176/#admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Click SUBJECTS sidebar item
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.admin-sidebar-item'));
    const sm = items.find(el => el.textContent.includes('SUBJECTS'));
    if (sm) sm.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const desktopScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\subject_manager_desktop.png';
  await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
  console.log("Desktop Subject Manager screenshot saved to:", desktopScreenshotPath);

  // 2. OPEN ADD SUBJECT MODAL
  console.log("\n--- TESTING ADD SUBJECT MODAL ---");
  await page.evaluate(() => {
    const btn = document.querySelector('.sm-banner-cta');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const modalScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\subject_manager_modal.png';
  await page.screenshot({ path: modalScreenshotPath, fullPage: false });
  console.log("Add Subject Modal screenshot saved to:", modalScreenshotPath);

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.sm-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. MOBILE TEST (375x812)
  console.log("\n--- MOBILE SUBJECT MANAGER VERIFICATION (375x812) ---");
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5176/#admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Click Subjects bottom nav item
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.bottom-nav-item'));
    const subjBtn = btns.find(b => b.textContent.includes('Subjects'));
    if (subjBtn) subjBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const mobileScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\subject_manager_mobile.png';
  await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log("Mobile Subject Manager screenshot saved to:", mobileScreenshotPath);

  await browser.close();
  console.log("\nSubject Manager verification finished successfully!");
}

run().catch(console.error);
