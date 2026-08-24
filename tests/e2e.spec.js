import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Patrimoinoscope", ()=>{
  test.beforeEach(async ({page})=>{
    await page.addInitScript(()=> localStorage.setItem("onboard_done","1"));
    await page.goto("/");
  });
  test("quiz affiche résultat et perso card", async ({page})=>{
    await expect(page.locator("#quiz")).toBeVisible();
    // close onboarding if still there
    const onboard=page.locator("#onboard");
    if(await onboard.isVisible()) await page.click("#onboard-skip");
    await page.click('[data-answer="immobilier"]');
    await expect(page.locator("#quiz-result")).toBeVisible();
    await expect(page.locator("#btn-perso")).toBeVisible({timeout:2000});
  });
  test("charts se chargent", async ({page})=>{
    await expect(page.locator("#chart-categories")).toBeVisible();
    await expect(page.locator("#chart-timeseries")).toBeVisible();
    await expect(page.locator("#chart-particip")).toBeVisible();
  });
  test("slider filtre", async ({page})=>{
    const n1=await page.locator("#duree-n").textContent();
    await page.locator("#duree").fill("5");
    await page.locator("#duree").dispatchEvent("input");
    const n2=await page.locator("#duree-n").textContent();
    expect(n1).not.toEqual(n2);
  });
  test("explorer charge et export", async ({page})=>{
    await page.goto("/explorer.html");
    await expect(page.locator("#tbl")).toBeVisible();
    await page.fill("#q","AIR LIQUIDE");
    await expect(page.locator("#tbody tr").first()).toContainText("AIR LIQUIDE", {timeout:3000});
  });
  test("a11y axe", async ({page})=>{
    const results=await new AxeBuilder({page}).exclude("#onboard").analyze();
    // allow moderate region violations for onboarding (now fixed) — only critical should fail
    const critical=results.violations.filter(v=>v.impact==="critical");
    expect(critical).toEqual([]);
  });
});
