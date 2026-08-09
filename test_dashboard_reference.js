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
  console.log("\n--- DESKTOP DASHBOARD VERIFICATION (1280x800) ---");
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5176/#admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const desktopScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\dashboard_reference_desktop.png';
  await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
  console.log("Desktop screenshot saved to:", desktopScreenshotPath);

  // 2. COURSE SWITCHING TEST
  console.log("\n--- TESTING COURSE WORKSPACE SWITCHING ---");
  // Open course selector dropdown
  await page.click('.admin-course-trigger');
  await new Promise(r => setTimeout(r, 500));

  // Click second course option in dropdown
  await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('.admin-course-option'));
    if (options.length > 1) options[1].click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const courseBScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\dashboard_course_b.png';
  await page.screenshot({ path: courseBScreenshotPath, fullPage: false });
  console.log("Course B switched screenshot saved to:", courseBScreenshotPath);

  // 3. MOBILE TEST (375x812)
  console.log("\n--- MOBILE DASHBOARD VERIFICATION (375x812) ---");
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5176/#admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const mobileScreenshotPath = 'C:\\Users\\abhis\\.gemini\\antigravity-ide\\brain\\5e8507d2-4178-436f-989c-fd778c111283\\dashboard_reference_mobile.png';
  await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log("Mobile screenshot saved to:", mobileScreenshotPath);

  await browser.close();
  console.log("\nVerification script finished!");
}

run().catch(console.error);
