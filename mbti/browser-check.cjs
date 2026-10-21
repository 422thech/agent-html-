const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');

(async () => {
 const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const url=pathToFileURL(path.join(__dirname,'index.html')).href;
  await page.goto(url);await page.waitForLoadState('networkidle');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'homepage must not overflow');
  await page.screenshot({path:path.join(__dirname,'preview-desktop.png'),fullPage:true,animations:'disabled'});
  await page.locator('#start-btn').click();
  assert.equal(await page.locator('#next-btn').isDisabled(),true);
  await page.keyboard.press('5');
  await page.locator('#next-btn').click();
  await page.locator('#prev-btn').click();
  assert.equal(await page.locator('input[value="2"]').isChecked(),true);
  await page.locator('input[value="-2"]').check();
  await page.locator('#next-btn').click();
  await page.reload();await page.locator('#start-btn').click();
  assert.match(await page.locator('#question-number').innerText(),/第 2 \/ 48/);
  await page.screenshot({path:path.join(__dirname,'preview-question.png'),fullPage:true,animations:'disabled'});
  // INFP: all positive items strongly disagreed, all reverse items strongly agreed.
  for(let i=1;i<48;i++){
   const answer=Math.floor(i/4)%2===0?-2:2;
   await page.locator('input[value="'+answer+'"]').check();
   await page.locator('#next-btn').click();
  }
  assert.equal(await page.locator('#portrait .type-code').innerText(),'INFP');
  assert.equal(await page.locator('.why-block').count(),4);
  assert.equal(await page.locator('.evidence').count(),8);
  assert.match(await page.locator('#why-content').innerText(),/非常不同意/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(__dirname,'preview-result-desktop.png'),fullPage:true,animations:'disabled'});
  await page.reload();
  assert.equal(await page.locator('#result').isVisible(),true);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#download-btn').click();
  const download=await downloadPromise;
  await download.saveAs(path.join(__dirname,'preview-share-card.png'));
  assert.ok(fs.statSync(path.join(__dirname,'preview-share-card.png')).size>10000);
  await page.locator('#toast').waitFor({state:'hidden'});
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(__dirname,'preview-result-mobile.png'),fullPage:true,animations:'disabled'});
  await page.locator('#review-btn').click();
  assert.equal(await page.locator('input[value="-2"]').isChecked(),true);
  await page.screenshot({path:path.join(__dirname,'preview-question-mobile.png'),fullPage:true,animations:'disabled'});
  await page.locator('#brand-home').click();
  await page.screenshot({path:path.join(__dirname,'preview-mobile.png'),fullPage:true,animations:'disabled'});
  await page.locator('#home-restart').click();await page.locator('#cancel-restart').click();
  await page.locator('#start-btn').click();
  assert.equal(await page.locator('#result').isVisible(),true);
  await page.locator('#restart-btn').click();await page.locator('#confirm-restart').click();
  assert.equal(await page.locator('#next-btn').isDisabled(),true);
  for(let i=0;i<48;i++){await page.locator('input[value="0"]').check();await page.locator('#next-btn').click();}
  assert.match(await page.locator('#balance-note').innerText(),/完全平分/);
  assert.equal(await page.locator('.evidence').count(),0);
  assert.match(await page.locator('#why-content').innerText(),/均选择了“不确定”/);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#result')).animationName),'none');
  assert.deepEqual(errors,[]);
  await context.close();
  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}});});
  const blockedPage=await blocked.newPage();
  await blockedPage.goto(url);await blockedPage.locator('#start-btn').click();
  await blockedPage.locator('input[value="1"]').check();
  assert.match(await blockedPage.locator('#save-message').innerText(),/未允许保存/);
  assert.equal(await blockedPage.locator('#next-btn').isDisabled(),false);
  await blocked.close();
  console.log('PASS: 48-question journey, reverse scoring, keyboard, back/next, refresh restore, result restore, answer review, restart, neutral result, PNG download, 375px overflow, reduced motion, blocked storage. No page errors.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
