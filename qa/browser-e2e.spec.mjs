import { test, expect } from '@playwright/test';

const baseURL=process.env.AZAAD_BASE_URL||'https://azaad-clinic-website.vercel.app';
const navigation={waitUntil:'commit'};
const AUTH_READY_TIMEOUT=15000;
const AUTH_COOKIE='azaad_admin_appwrite_session';

async function resetBrowserSession(page){
  await page.goto(`${baseURL}/admin.html`,navigation);
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
  await page.reload(navigation);
  await expect(page.locator('#loginPage')).toBeVisible({timeout:5000});
  await expect(page.locator('#loginForm')).toBeVisible({timeout:5000});
}

async function authenticate(page){
  test.skip(!process.env.AZAAD_TEST_USERNAME||!process.env.AZAAD_TEST_PASSWORD,'Authenticated E2E requires dedicated CI credentials.');
  const authResponses=[]; const pageErrors=[]; const consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('response',r=>{if(r.url().includes('/api/admin-auth')&&r.request().method()==='POST')authResponses.push({status:r.status(),url:r.url()});});
  await resetBrowserSession(page);
  await page.waitForFunction(()=>Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),{timeout:10000});
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect.poll(()=>authResponses.length,{timeout:AUTH_READY_TIMEOUT,message:`Appwrite admin-auth POST was not observed. pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)}`}).toBeGreaterThan(0);
  expect(authResponses.at(-1).status).toBe(200);
  await expect(page.locator('#loginPage')).toBeHidden({timeout:AUTH_READY_TIMEOUT});
  await expect(page.locator('#adminPage')).toBeVisible({timeout:AUTH_READY_TIMEOUT});
}

test('admin login shell loads with the canonical credential fields and no retired bootstrap',async({page})=>{
  await resetBrowserSession(page); await expect(page.locator('#username')).toHaveAttribute('type','text'); await expect(page.locator('#password')).toHaveAttribute('type','password');
  const r=await page.request.get(`${baseURL}/admin.html`); expect(r.ok()).toBeTruthy(); const h=await r.text();
  expect(h).toContain('autocomplete="username"'); expect(h).toContain('autocomplete="current-password"'); expect(h).not.toContain('/admin-login-bootstrap.js'); expect(h).not.toContain('/admin-auth.html');
});

test('production browser surface is the exact certified commit',async({page})=>{
  const expected=process.env.AZAAD_EXPECTED_PRODUCTION_SHA||process.env.GITHUB_SHA; test.skip(!expected,'Exact production SHA binding is required for browser certification.');
  await page.goto(`${baseURL}/admin.html`,navigation); await expect.poll(()=>page.locator('meta[name="azaad-build-sha"]').getAttribute('content'),{timeout:10000}).toBe(expected);
});

test('admin password remains interactive while the canonical controller is loading',async({page})=>{
  await page.route('**/admin.js*',async route=>{await new Promise(resolve=>setTimeout(resolve,1800));await route.continue();}); await page.goto(`${baseURL}/admin.html`,navigation); await expect(page.locator('#loginForm')).toBeVisible({timeout:5000});
  const password=page.locator('#password'); await password.fill('temporary-e2e-value'); await expect(password).toHaveValue('temporary-e2e-value'); await page.locator('#loginForm').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await expect(page).toHaveURL(/\/admin\.html(?:\?.*)?$/); await expect(password).toHaveValue('temporary-e2e-value');
});

test('Patient 360 appointment action bridge resource is available',async({page})=>{
  await resetBrowserSession(page); const r=await page.request.get(`${baseURL}/patient-appointment-actions.js?v=13.0.0`); expect(r.ok()).toBeTruthy(); const s=await r.text();
  expect(s).toContain('/functions/v1/azaad-frontdesk-checkin'); expect(s).toContain('function checkIn'); expect(s).toContain('p360-actions');
});

test('admin-auth API returns a usable Appwrite session before browser login',async({page})=>{
  test.skip(!process.env.AZAAD_TEST_USERNAME||!process.env.AZAAD_TEST_PASSWORD,'Authenticated E2E requires dedicated CI test credentials.');
  const r=await page.request.post(`${baseURL}/api/admin-auth`,{data:{username:process.env.AZAAD_TEST_USERNAME,password:process.env.AZAAD_TEST_PASSWORD}}); const t=await r.text(); let b={}; try{b=t?JSON.parse(t):{};}catch(_){ }
  expect(r.status(),`admin-auth API response bodyBytes=${t.length}`).toBe(200); expect(b).toEqual(expect.objectContaining({provider:'appwrite',session:expect.objectContaining({access_token:expect.any(String)}),staff:expect.objectContaining({id:expect.anything()})}));
});

test('admin authenticated flow is exercised only with dedicated CI credentials',async({page})=>{
  await authenticate(page); const state=await page.evaluate(()=>({loginHidden:document.getElementById('loginPage')?.classList.contains('hidden')===true,adminVisible:document.getElementById('adminPage')?.classList.contains('hidden')!==true,role:document.body.dataset.role||'',session:Boolean(window.AZAAD?.state?.session?.access_token),provider:window.AZAAD?.state?.provider||''}));
  expect(state).toMatchObject({loginHidden:true,adminVisible:true,session:true,provider:'appwrite'}); expect(state.role).not.toBe(''); expect((await page.context().cookies()).some(c=>c.name===AUTH_COOKIE)).toBeTruthy();
});

test('admin session survives a real browser refresh without returning to login',async({page})=>{
  await authenticate(page); const before=await page.evaluate(()=>({role:document.body.dataset.role||'',token:Boolean(window.AZAAD?.state?.session?.access_token)})); expect(before.token).toBeTruthy(); expect(before.role).not.toBe(''); expect((await page.context().cookies()).some(c=>c.name===AUTH_COOKIE)).toBeTruthy();
  const pageErrors=[]; const consoleErrors=[]; page.on('pageerror',e=>pageErrors.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))consoleErrors.push(m.text());});
  await page.reload({waitUntil:'domcontentloaded'}); await expect(page.locator('#adminPage')).toBeVisible({timeout:AUTH_READY_TIMEOUT}); await expect(page.locator('#loginPage')).toBeHidden({timeout:AUTH_READY_TIMEOUT});
  const after=await page.evaluate(()=>({role:document.body.dataset.role||'',token:Boolean(window.AZAAD?.state?.session?.access_token),provider:window.AZAAD?.state?.provider||''})); expect(after.token).toBeTruthy(); expect(after.provider).toBe('appwrite'); expect(after.role).not.toBe('');
  expect((await page.context().cookies()).some(c=>c.name===AUTH_COOKIE)).toBeTruthy(); expect(pageErrors).toEqual([]); expect(consoleErrors).toEqual([]);
});
