/* Run explicitly after gxun-south-gate.html is generated.
   Screenshots complement the interaction assertions and need visual inspection. */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const playwrightPath = process.env.SCENE_PLAYWRIGHT_PATH || "C:/Users/23755/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium } = require(playwrightPath);
const htmlPath = "F:/Codex/测试/gxun-south-gate.html";
const outputDirectory = "C:/Users/23755/.codex/visualizations/2026/10/19/01a1558a-e823-7fc1-a38b-6f03c5429cee";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const minZoom = Number(process.env.SCENE_MIN_ZOOM || 0.78);
const maxZoom = Number(process.env.SCENE_MAX_ZOOM || 2);
const results = [];
const pageErrors = [];
const screenshots = {};
const angleMinimum = 20 * Math.PI / 180;
const angleMaximum = 75 * Math.PI / 180;

function difference(a, b) {
  return Math.max(
    Math.abs(a.azimuth - b.azimuth),
    Math.abs(a.elevation - b.elevation),
    Math.abs(a.zoom - b.zoom),
    Math.abs(a.radius - b.radius),
    Math.abs(a.target.x - b.target.x),
    Math.abs(a.target.y - b.target.y),
    Math.abs(a.target.z - b.target.z)
  );
}

async function view(page) {
  const state = await page.evaluate(() => window.campusScene.getView());
  for (const property of ["azimuth", "elevation", "radius", "zoom"]) {
    assert.ok(Number.isFinite(state[property]), "View must expose finite " + property);
  }
  assert.ok(state.radius > 0, "Camera radius must remain positive");
  assert.ok(state.target && ["x", "y", "z"].every(key => Number.isFinite(state.target[key])),
    "View must expose a finite target");
  return state;
}

async function ready(page) {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 60000 });
  await page.locator("html[data-scene-ready='true']").waitFor({ timeout: 60000 });
  await page.waitForFunction(() => window.campusScene && typeof window.campusScene.getView === "function");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function settle(page, timeout = 12000) {
  const started = Date.now();
  let previous = await view(page);
  let stillSamples = 0;
  while (Date.now() - started < timeout) {
    await page.waitForTimeout(150);
    const current = await view(page);
    if (difference(previous, current) < 0.000001) stillSamples++;
    else stillSamples = 0;
    if (stillSamples >= 3) return current;
    previous = current;
  }
  throw new Error("Camera damping did not converge within " + timeout + " ms");
}

async function test(name, action) {
  try {
    const detail = await action();
    results.push({ name, passed: true, detail });
    console.log("PASS " + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error("FAIL " + name + ": " + error.message);
  }
}

function watch(page, label) {
  page.on("pageerror", error => pageErrors.push({ page: label, kind: "exception", message: error.message }));
  page.on("console", message => {
    if (message.type() === "error") {
      pageErrors.push({ page: label, kind: "console", message: message.text() });
    }
  });
  page.on("requestfailed", request => {
    pageErrors.push({ page: label, kind: "request", message: request.url() + ": " + request.failure().errorText });
  });
}

async function sceneOnly(page, expectedWidth, expectedHeight) {
  const measurement = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const rect = canvas && canvas.getBoundingClientRect();
    const visible = element => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" &&
        Number(style.opacity) > 0 && bounds.width > 0 && bounds.height > 0;
    };
    const visualElements = [...document.body.querySelectorAll("*")].filter(element =>
      !["CANVAS", "SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName) && visible(element)
    );
    const samples = [
      [2, 2], [innerWidth - 3, 2], [2, innerHeight - 3],
      [innerWidth - 3, innerHeight - 3], [innerWidth / 2, innerHeight / 2]
    ];
    return {
      canvasCount: document.querySelectorAll("canvas").length,
      canvas: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      width: innerWidth,
      height: innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      visibleText: document.body.innerText.trim(),
      visibleOtherElements: visualElements.map(element => element.tagName + (element.id ? "#" + element.id : "")),
      canvasIsTopmost: samples.every(([x, y]) => document.elementFromPoint(x, y) === canvas),
      touchAction: canvas ? getComputedStyle(canvas).touchAction : null
    };
  });
  assert.equal(measurement.canvasCount, 1, "Exactly one canvas is expected");
  assert.equal(measurement.visibleText, "", "The page must not show UI text");
  assert.deepEqual(measurement.visibleOtherElements, [], "The canvas must have no visible UI or overlay elements");
  assert.equal(measurement.width, expectedWidth);
  assert.equal(measurement.height, expectedHeight);
  assert.ok(measurement.documentWidth <= expectedWidth, "The page must not overflow horizontally");
  assert.ok(measurement.documentHeight <= expectedHeight, "The page must not overflow vertically");
  assert.ok(Math.abs(measurement.canvas.x) < 1 && Math.abs(measurement.canvas.y) < 1,
    "The canvas must start at the viewport origin");
  assert.ok(Math.abs(measurement.canvas.width - expectedWidth) < 1 &&
    Math.abs(measurement.canvas.height - expectedHeight) < 1, "The canvas must fill the viewport");
  assert.equal(measurement.canvasIsTopmost, true, "No overlay may intercept canvas interaction");
  assert.equal(measurement.touchAction, "none", "Touch gestures must belong to the model");
  return measurement;
}

async function capture(page, name) {
  const outputPath = path.join(outputDirectory, name + ".png");
  await page.screenshot({ path: outputPath, fullPage: false });
  screenshots[name] = outputPath;
}

async function drag(page, start, end) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 1 });
  await page.mouse.up();
}

async function touch(cdp, type, points) {
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map(point => ({ ...point, radiusX: 6, radiusY: 6, force: 1 }))
  });
}

(async () => {
  assert.ok(fs.existsSync(htmlPath), "Generate the target HTML before running this script");
  assert.ok(fs.existsSync(edgePath), "Microsoft Edge executable was not found");
  assert.ok(fs.existsSync(outputDirectory), "The approved screenshot directory must already exist");
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
    args: [
      "--allow-file-access-from-files",
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
      "--disable-gpu-sandbox"
    ]
  });
  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
      deviceScaleFactor: 1,
      colorScheme: "light",
      reducedMotion: "reduce"
    });
    const desktop = await desktopContext.newPage();
    watch(desktop, "desktop");
    await ready(desktop);
    const initial = await view(desktop);

    await test("Desktop canvas fills 1440 × 1080 without UI or overlays", async () =>
      sceneOnly(desktop, 1440, 1080));
    await capture(desktop, "gxun-south-gate-desktop");

    // Inspect the physical arch fences, recognition screens and uninterrupted path.
    await drag(desktop, { x: 700, y: 510 }, { x: 790, y: 470 });
    await desktop.mouse.wheel(0, -300);
    await settle(desktop);
    await capture(desktop, "gxun-south-gate-access-detail");
    await desktop.evaluate(() => window.campusScene.resetView());
    await settle(desktop);

    await test("Initial model remains still without automatic rotation", async () => {
      await desktop.waitForTimeout(650);
      const later = await view(desktop);
      assert.ok(difference(initial, later) < 0.000001, "The untouched model must not move");
      assert.ok(initial.elevation >= 35 * Math.PI / 180 && initial.elevation <= 45 * Math.PI / 180,
        "Initial elevation must be between 35 and 45 degrees");
      return initial;
    });

    await test("Mouse dragging rotates the camera and damping converges", async () => {
      const before = await view(desktop);
      await drag(desktop, { x: 660, y: 500 }, { x: 890, y: 545 });
      const released = await view(desktop);
      const final = await settle(desktop);
      assert.ok(Math.abs(final.azimuth - before.azimuth) > 0.1, "Dragging must rotate azimuth");
      assert.ok(difference(released, final) > 0.000001, "Camera movement must continue briefly after release");
      assert.deepEqual(final.target, before.target, "Dragging must not pan the model out of frame");
      await desktop.waitForTimeout(350);
      assert.ok(difference(final, await view(desktop)) < 0.000001, "Damping must finish without perpetual movement");
      return { before, released, final };
    });
    await capture(desktop, "gxun-south-gate-rotated");

    await test("Wheel zoom changes scale and respects both zoom limits", async () => {
      const before = await view(desktop);
      await desktop.mouse.wheel(0, -450);
      const enlarged = await settle(desktop);
      assert.ok(enlarged.zoom > before.zoom, "Upward wheel must enlarge the model");
      await desktop.mouse.wheel(0, -10000);
      const maximum = await settle(desktop);
      assert.ok(Math.abs(maximum.zoom - maxZoom) < 0.00001, "Zoom must stop at its maximum");
      await desktop.mouse.wheel(0, 10000);
      await desktop.mouse.wheel(0, 10000);
      const minimum = await settle(desktop);
      assert.ok(Math.abs(minimum.zoom - minZoom) < 0.00001, "Zoom must stop at its minimum");
      const scroll = await desktop.evaluate(() => ({ x: scrollX, y: scrollY }));
      assert.deepEqual(scroll, { x: 0, y: 0 }, "Wheel must not scroll the page");
      return { enlarged: enlarged.zoom, minimum: minimum.zoom, maximum: maximum.zoom };
    });

    await test("Vertical dragging keeps the camera above ground and below overhead", async () => {
      await drag(desktop, { x: 700, y: 250 }, { x: 700, y: 900 });
      const high = await settle(desktop);
      assert.ok(Math.abs(high.elevation - angleMaximum) < 0.00001, "Upper elevation must stop at 75 degrees");
      await drag(desktop, { x: 700, y: 900 }, { x: 700, y: 200 });
      const low = await settle(desktop);
      assert.ok(Math.abs(low.elevation - angleMinimum) < 0.00001, "Lower elevation must stop at 20 degrees");
      return { minimum: low.elevation, maximum: high.elevation };
    });

    const mobileContext = await browser.newContext({
      viewport: { width: 360, height: 800 },
      screen: { width: 360, height: 800 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
      reducedMotion: "reduce"
    });
    const mobile = await mobileContext.newPage();
    watch(mobile, "mobile");
    await ready(mobile);
    await test("Mobile canvas fills 360 × 800 with no overflow", async () => sceneOnly(mobile, 360, 800));
    await capture(mobile, "gxun-south-gate-mobile");
    const cdp = await mobileContext.newCDPSession(mobile);

    await test("A real CDP single-finger gesture rotates the mobile model", async () => {
      const before = await view(mobile);
      await touch(cdp, "touchStart", [{ id: 1, x: 110, y: 410 }]);
      for (let i = 1; i <= 8; i++) {
        await touch(cdp, "touchMove", [{ id: 1, x: 110 + 10 * i, y: 410 + 3 * i }]);
        await mobile.waitForTimeout(20);
      }
      await touch(cdp, "touchEnd", []);
      const after = await settle(mobile);
      assert.ok(Math.abs(after.azimuth - before.azimuth) > 0.1, "One finger must rotate the model");
      assert.deepEqual(after.target, before.target, "Touch rotation must not pan the model");
      return { before, after };
    });

    await test("A real CDP two-finger pinch zooms without rotation or page scrolling", async () => {
      const before = await view(mobile);
      const scaleBefore = await mobile.evaluate(() => visualViewport.scale);
      await touch(cdp, "touchStart", [{ id: 1, x: 130, y: 460 }, { id: 2, x: 230, y: 460 }]);
      for (let i = 1; i <= 8; i++) {
        await touch(cdp, "touchMove", [
          { id: 1, x: 130 - 5 * i, y: 460 },
          { id: 2, x: 230 + 5 * i, y: 460 }
        ]);
        await mobile.waitForTimeout(20);
      }
      await touch(cdp, "touchEnd", []);
      const after = await settle(mobile);
      assert.ok(after.zoom > before.zoom + 0.25, "Spreading two fingers must enlarge the model");
      assert.ok(after.zoom <= maxZoom, "Pinch must respect the model zoom limit");
      assert.ok(Math.abs(after.azimuth - before.azimuth) < 0.00001, "Pinch must not rotate the scene");
      assert.ok(Math.abs(after.elevation - before.elevation) < 0.00001, "Pinch must not alter elevation");
      assert.deepEqual(after.target, before.target, "Pinch must not pan the scene");
      const documentView = await mobile.evaluate(() => ({ x: scrollX, y: scrollY, scale: visualViewport.scale }));
      assert.deepEqual(documentView, { x: 0, y: 0, scale: scaleBefore }, "Pinch must affect the model, not the document");
      return { before: before.zoom, after: after.zoom };
    });

    await test("Mobile orientation resize preserves the user's camera view", async () => {
      const before = await settle(mobile);
      await mobile.setViewportSize({ width: 800, height: 360 });
      await mobile.waitForTimeout(250);
      const landscape = await view(mobile);
      assert.ok(difference(before, landscape) < 0.000001, "Changing viewport orientation must not reset camera state");
      await sceneOnly(mobile, 800, 360);
      await mobile.setViewportSize({ width: 360, height: 800 });
      await mobile.waitForTimeout(250);
      const portrait = await view(mobile);
      assert.ok(difference(before, portrait) < 0.000001, "Returning to portrait must preserve camera state");
      await sceneOnly(mobile, 360, 800);
      return { before, after: portrait };
    });

    await test("Desktop and mobile have no JavaScript, console, or failed-request errors", async () => {
      assert.deepEqual(pageErrors, [], JSON.stringify(pageErrors));
      return { errors: 0 };
    });

    console.log(JSON.stringify({
      passed: results.filter(result => result.passed).length,
      failed: results.filter(result => !result.passed).length,
      results,
      screenshots,
      visualReviewRequired: "Inspect the desktop, mobile and rotated screenshots for complete base framing, scene composition and model rendering."
    }, null, 2));
    process.exitCode = results.some(result => !result.passed) ? 1 : 0;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
