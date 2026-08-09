import puppeteer from 'puppeteer-core';

async function run() {
  console.log("Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. DESKTOP TEST (1280x800)
  console.log("\n--- DESKTOP COURSE MANAGER VERIFICATION (1280x800) ---");
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5176/#admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Navigate to Course Manager tab
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.admin-sidebar-item'));
    const cm = items.find(el => el.textContent.includes('COURSE MANAGER'));
    if (cm) cm.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const desktopScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\course_manager_desktop.png';
  await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
  console.log("Desktop screenshot saved to:", desktopScreenshotPath);

  // 2. TEST COURSE SELECTION
  console.log("\n--- TESTING COURSE SELECTION IN LIST ---");
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.cm-course-card'));
    if (cards.length > 1) cards[1].click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const selectedScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\course_manager_selected.png';
  await page.screenshot({ path: selectedScreenshotPath, fullPage: false });
  console.log("Course selection screenshot saved to:", selectedScreenshotPath);

  // 3. MOBILE TEST (375x812)
  console.log("\n--- MOBILE COURSE MANAGER VERIFICATION (375x812) ---");
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5176/#admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Click Courses bottom nav
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.bottom-nav-item'));
    const coursesBtn = btns.find(b => b.textContent.includes('Courses'));
    if (coursesBtn) coursesBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const mobileScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\course_manager_mobile.png';
  await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log("Mobile screenshot saved to:", mobileScreenshotPath);

  await browser.close();
  console.log("\nVerification script finished!");
}

run().catch(console.error);
