/** Isolated production UI audit. No live Supabase, credentials, orders or payments. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import Module from 'node:module';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const output = path.resolve(process.env.UI_AUDIT_OUTPUT || 'docs/ui-evidence');
fs.mkdirSync(output, { recursive: true });
const appPort = 3200, fixturePort = 4105;
const projectUrl = `http://127.0.0.1:${fixturePort}`;
const appUrl = `http://127.0.0.1:${appPort}`;
const fixtureFile = path.resolve('src/lib/mock-data.ts');
const fixtureModule = new Module(fixtureFile); fixtureModule.filename = fixtureFile; fixtureModule.paths = Module._nodeModulePaths(process.cwd());
fixtureModule._compile(ts.transpileModule(fs.readFileSync(fixtureFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, fixtureFile);
const { MOCK_RESTAURANTS, getMockMenuItems } = fixtureModule.exports;
const uid = index => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const restaurants = MOCK_RESTAURANTS.map((row, index) => ({ ...row, id: uid(index + 1), image_url: null, cover_image_url: null }));
const meals = MOCK_RESTAURANTS.flatMap((row, index) => getMockMenuItems(row.id).map((meal, mealIndex) => ({ ...meal, id: uid((index + 1) * 100 + mealIndex), restaurant_id: uid(index + 1), image_url: null })));
// Brand photograph is used only as a test image, never as a real vendor photograph.
restaurants[0].cover_image_url = '/images/jollof-hero.webp';
meals[0].image_url = '/images/jollof-hero.webp';
let homeState = 'normal';
const requests = [];
const fixture = http.createServer(async (request, response) => {
  const url = new URL(request.url, projectUrl);
  requests.push({ method: request.method, path: url.pathname });
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Access-Control-Allow-Origin', appUrl);
  response.setHeader('Access-Control-Allow-Headers', request.headers['access-control-request-headers'] || 'apikey,authorization,content-type,x-client-info,prefer,accept-profile,content-profile');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (request.method === 'OPTIONS') { response.end('{}'); return; }
  if (url.pathname === '/auth/v1/user') { response.end(JSON.stringify({ id: uid(999), aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {} })); return; }
  if (url.pathname.includes('/rest/v1/profiles')) { response.end(JSON.stringify({ id: uid(999), role: 'customer', full_name: 'Fixture customer' })); return; }
  if (url.pathname.includes('/rest/v1/restaurants_public')) {
    if (!url.searchParams.has('id') && homeState === 'loading') await new Promise(resolve => setTimeout(resolve, 1500));
    if (!url.searchParams.has('id') && homeState === 'error') { response.statusCode = 503; response.end(JSON.stringify({ message: 'Fixture outage' })); return; }
    if (!url.searchParams.has('id') && homeState === 'empty') { response.end('[]'); return; }
    const id = url.searchParams.get('id')?.replace(/^eq\./, '');
    response.end(JSON.stringify(id ? restaurants.find(row => row.id === id) ?? null : restaurants)); return;
  }
  if (url.pathname.includes('/rest/v1/menu_items')) {
    const id = url.searchParams.get('restaurant_id')?.replace(/^eq\./, '');
    response.end(JSON.stringify(id === uid(2) ? [] : meals.filter(meal => meal.restaurant_id === id))); return;
  }
  response.statusCode = 404; response.end('{}');
});
await new Promise(resolve => fixture.listen(fixturePort, '127.0.0.1', resolve));
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: projectUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public-key', NEXT_TELEMETRY_DISABLED: '1' };
let next, browser;
const result = { engine: 'Chromium', fixture: 'Isolated local HTTP fixture; sample content, no live backend', layouts: [], audits: [], interactions: [], errors: [], notVerified: ['Physical iPhone/Android', 'Safari/WebKit and Firefox', 'VoiceOver/NVDA/TalkBack', 'Live Supabase RLS, invitations and payments'] };
const check = (name, ok, details = '') => { result.interactions.push({ name, passed: Boolean(ok), details }); };
async function run(command, args, logFile) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = fs.createWriteStream(path.join(output, logFile));
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}; see ${logFile}`)));
  });
}
async function audit(page, name, screenshot = true) {
  // Audit the settled UI; entrance opacity changes temporarily affect contrast.
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations !== Infinity).map(a=>a.finished.catch(()=>{}))); });
  await page.addScriptTag({ content: fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8') });
  const axe = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
  const geometry = await page.getByRole('dialog').count() ? await page.getByRole('dialog').evaluate(element => { const r=element.getBoundingClientRect(),s=getComputedStyle(element);return {top:r.top,bottom:r.bottom,height:r.height,viewportHeight:innerHeight,cssTop:s.top,cssBottom:s.bottom,transform:s.transform,classes:element.className};}) : undefined;
  result.audits.push({ name, geometry, violations: axe.violations.map(row => ({ id: row.id, impact: row.impact, description: row.description, nodes: row.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary })) })) });
  if (screenshot) await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}
async function layout(page, name, width, height = 900) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(150);
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
    clipped: [...document.querySelectorAll('button,input,select,h1,h2,h3,h4')].filter(element => { const r = element.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1) && !element.closest('.overflow-x-auto'); }).map(element => element.textContent.trim().slice(0,80)) }));
  result.layouts.push({ name, width, ...metrics, passed: metrics.document <= metrics.viewport + 1 && metrics.body <= metrics.viewport + 1 && metrics.clipped.length === 0 });
}
try {
  // Optional for repeated browser checks of an unchanged, already-built fixture.
  if (process.env.UI_AUDIT_SKIP_BUILD !== '1') await run(process.execPath, ['node_modules/next/dist/bin/next', 'build'], 'build.log');
  let ready = false; let serverLog = '';
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(appPort), '--hostname', '127.0.0.1'], { env, stdio: ['ignore','pipe','pipe'] });
  next.stdout.on('data', data => { serverLog += data; if (data.toString().includes('Ready')) ready = true; }); next.stderr.on('data', data => serverLog += data);
  for (let i = 0; i < 150 && !ready; i++) await new Promise(resolve => setTimeout(resolve, 100));
  if (!ready) throw new Error(`Server did not start: ${serverLog.slice(-1000)}`);
  const args = ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage'];
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH, args } : {}) });
  result.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  await page.goto(appUrl); await page.waitForLoadState('networkidle');
  for (const width of [320, 390, 768, 1440]) await layout(page, 'landing', width);
  await audit(page, 'landing-desktop'); await page.setViewportSize({ width:390,height:844 }); await audit(page, 'landing-mobile');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  check('Skip link moves focus into main', await page.evaluate(() => document.activeElement?.tagName === 'MAIN'));
  await page.goto(`${appUrl}/restaurants`); await page.waitForLoadState('networkidle');
  for (const width of [320, 390, 768, 1440]) await layout(page, 'discovery', width);
  await audit(page, 'discovery-desktop'); await page.setViewportSize({width:390,height:844}); await audit(page,'discovery-mobile');
  await page.getByRole('link').filter({has:page.getByRole('heading',{name:restaurants[0].name,exact:true})}).click();
  await page.waitForURL(`${appUrl}/restaurants/${uid(1)}`);
  await page.getByRole('button',{name:`View ${meals[0].name} details`}).waitFor();
  check('Clicking a listed restaurant opens its real menu route',new URL(page.url()).pathname===`/restaurants/${uid(1)}` && await page.getByRole('button',{name:`View ${meals[0].name} details`}).isVisible());
  await page.goto(`${appUrl}/restaurants`); await page.waitForLoadState('networkidle');
  await page.getByRole('radio', {name:'Aba',exact:true}).click();
  check('City filter excludes Umuahia', !(await page.getByRole('heading',{name:restaurants[5].name}).count()));
  const city = page.getByRole('radio',{name:'Aba',exact:true}); await city.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(75);
  check('City arrows move focus', await page.getByRole('radio',{name:'Umuahia',exact:true}).evaluate(element=>element===document.activeElement));
  await page.keyboard.press('Space'); await page.waitForTimeout(75);
  check('City group supports keyboard selection', await page.getByRole('radio',{name:'Umuahia',exact:true}).getAttribute('aria-checked') === 'true');
  await page.getByRole('radio',{name:'All cities'}).click();
  await page.getByRole('searchbox').fill('no-such-meal'); await audit(page,'discovery-empty');
  check('Empty search recovers with Clear filters', await page.getByRole('button',{name:'Clear filters'}).isVisible());
  await page.getByRole('button',{name:'Clear filters'}).click();
  await page.goto(`${appUrl}/home`); await page.getByRole('heading',{name:restaurants[0].name}).waitFor({timeout:10000});
  for (const width of [320,390,768,1440]) await layout(page,'home',width);
  await audit(page,'home-desktop'); await page.setViewportSize({width:390,height:844}); await audit(page,'home-mobile');
  await page.getByRole('navigation',{name:'Customer navigation'}).getByRole('link',{name:'Explore',exact:true}).click();
  await page.getByRole('heading',{name:'Restaurants',exact:true}).waitFor();
  check('Guest Explore navigation reaches the listing',new URL(page.url()).pathname==='/restaurants');
  await page.goto(`${appUrl}/explore?city=umuahia&tag=grills`);
  await page.getByRole('heading',{name:'Restaurants',exact:true}).waitFor();
  check('Explore alias preserves discovery filters',new URL(page.url()).pathname==='/restaurants' && new URL(page.url()).searchParams.get('city')==='umuahia' && new URL(page.url()).searchParams.get('tag')==='grills');
  await page.goto(`${appUrl}/home`); await page.getByRole('heading',{name:restaurants[0].name}).waitFor();
  const cityTrigger = page.getByRole('button',{name:/Find food in/}); await cityTrigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog',{name:'Choose your city'}); await dialog.waitFor(); await audit(page,'city-sheet');
  check('Dialog focuses inside', await dialog.evaluate(element => element.contains(document.activeElement)));
  for(let i=0;i<7;i++) await page.keyboard.press('Tab');
  check('Dialog traps focus', await dialog.evaluate(element => element.contains(document.activeElement)));
  await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
  check('Escape closes and restores trigger focus', !(await dialog.count()) && await cityTrigger.evaluate(element=>element===document.activeElement));
  for (const state of ['loading','empty','error']) {
    homeState = state; await page.goto(`${appUrl}/home`);
    if(state==='loading') { await page.waitForSelector('[aria-busy="true"]'); await audit(page,'home-loading'); }
    else if(state==='empty') { await page.getByRole('heading',{name:/No restaurants in/}).waitFor(); await audit(page,'home-empty'); }
    else { await page.getByRole('heading',{name:'We couldn’t load restaurants'}).waitFor(); await audit(page,'home-error'); homeState='normal'; await page.getByRole('button',{name:'Try again'}).click(); await page.getByRole('heading',{name:restaurants[0].name}).waitFor(); check('Retry recovers from outage',true); }
  }
  homeState='normal';
  await page.goto(`${appUrl}/restaurants/${uid(1)}`); await page.waitForLoadState('networkidle');
  for(const width of [320,390,768,1440]) await layout(page,'menu',width);
  await audit(page,'menu-desktop'); await page.setViewportSize({width:390,height:844}); await audit(page,'menu-mobile');
  const itemTrigger = page.getByRole('button',{name:`View ${meals[0].name} details`}); await itemTrigger.focus(); await page.keyboard.press('Enter');
  await page.getByRole('dialog',{name:meals[0].name}).waitFor(); await audit(page,'food-sheet');
  check('Food sheet has a short spatial entrance',await page.getByRole('dialog').evaluate(el=>{const s=getComputedStyle(el);return s.animationName==='customer-sheet-in' && parseFloat(s.animationDuration)<=.25;}));
  await page.getByRole('dialog').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})));});
  check('Food sheet is anchored to mobile bottom', await page.getByRole('dialog').evaluate(element=>Math.abs(element.getBoundingClientRect().bottom-innerHeight)<2));
  check('Quantity starts at one with decrease disabled',await page.getByRole('button',{name:'Decrease quantity',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Increase quantity',exact:true}).click();
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'hidden'});
  await itemTrigger.click(); await page.getByRole('dialog').waitFor();
  check('Reopening a canceled food sheet discards unsaved quantity',await page.getByRole('button',{name:'Decrease quantity',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Increase quantity',exact:true}).click();
  await page.getByRole('button',{name:/^Add to cart/}).click(); await page.getByRole('dialog').waitFor({state:'hidden'});
  const cart = await page.evaluate(()=>JSON.parse(localStorage.getItem('abiaeats_cart')));
  check('Food sheet adds selected quantity and retains price',cart.items[0]?.quantity === 2 && cart.items[0]?.price === meals[0].price);
  await page.getByRole('button',{name:`Add ${meals[0].name} to cart`}).click();
  check('Inline menu quantity increments immediately',(await page.evaluate(()=>JSON.parse(localStorage.getItem('abiaeats_cart')).items[0].quantity))===3);
  await page.getByRole('button',{name:`Decrease ${meals[0].name} quantity`}).click();
  check('Inline menu quantity decreases without opening a sheet',(await page.evaluate(()=>JSON.parse(localStorage.getItem('abiaeats_cart')).items[0].quantity))===2);
  await page.emulateMedia({reducedMotion:'reduce'});
  await itemTrigger.click(); await page.getByRole('dialog').waitFor();
  check('Reduced motion opens food sheets without movement',await page.getByRole('dialog').evaluate(el=>getComputedStyle(el).animationName==='none'));
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'hidden'});
  check('Food sheet returns focus to its meal after closing',await itemTrigger.evaluate(el=>el===document.activeElement));
  await page.getByRole('button',{name:`Add ${meals[1].name} to cart`}).hover();
  check('Reduced motion removes press transforms',await page.getByRole('button',{name:`Add ${meals[1].name} to cart`}).evaluate(element=>getComputedStyle(element).transform==='none'));
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  const lastMeal=meals.filter(meal=>meal.restaurant_id===uid(1)).at(-1);
  const lastItemBox=await page.getByRole('button',{name:`View ${lastMeal.name} details`}).boundingBox();
  const floatingCartBox=await page.locator('.menu-cart-bar').boundingBox();
  check('Last menu item clears the floating cart action',Boolean(lastItemBox && floatingCartBox && lastItemBox.y+lastItemBox.height<=floatingCartBox.y));
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.setViewportSize({width:320,height:844}); await page.evaluate(()=>document.documentElement.style.fontSize='200%'); await layout(page,'menu-text-resize-200',320);
  check('Menu cart total fits at 200 percent text size',await page.getByRole('link',{name:/View Cart/}).evaluate(element=>{const box=element.getBoundingClientRect();const price=element.querySelector('.tabular-nums').getBoundingClientRect();return price.left>=box.left && price.right<=box.right && price.bottom<=box.bottom;}));
  await audit(page,'menu-text-resize-200'); await page.evaluate(()=>document.documentElement.style.fontSize='');
  await page.goto(`${appUrl}/restaurants/${uid(2)}`); await page.waitForLoadState('networkidle'); await audit(page,'menu-empty');
  check('Empty menu has a browsing recovery action',await page.getByRole('link',{name:'Browse other restaurants'}).isVisible());
  await page.getByRole('navigation',{name:'Customer navigation'}).getByRole('link',{name:/^Cart/}).click();
  await page.getByRole('heading',{name:meals[0].name,exact:true}).waitFor();
  check('Guest Cart navigation keeps selected food',new URL(page.url()).pathname==='/cart');
  await page.getByRole('link',{name:'Continue to checkout'}).click();
  await page.getByRole('heading',{name:'Welcome back'}).waitFor();
  check('Guest checkout requires sign-in and preserves destination',new URL(page.url()).pathname==='/auth/login' && new URL(page.url()).searchParams.get('redirectTo')==='/checkout');
  check('Sign-in redirect preserves the local cart',(await page.evaluate(()=>JSON.parse(localStorage.getItem('abiaeats_cart')).items[0].quantity))===2);
  const authContext = await browser.newContext({viewport:{width:390,height:844}});
  const payload = Buffer.from(JSON.stringify({sub:uid(999),exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})).toString('base64url');
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${payload}.fixture-signature`;
  const session = {access_token:token,refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid(999),email:'fixture@example.test'}};
  await authContext.addCookies([{name:'sb-127-auth-token',value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,domain:'127.0.0.1',path:'/'}]);
  await authContext.addInitScript(({cart,session})=>{localStorage.setItem('abiaeats_cart',JSON.stringify(cart));localStorage.setItem('sb-127-auth-token',JSON.stringify(session));},{cart,session});
  const cartPage=await authContext.newPage(); cartPage.on('pageerror',error=>result.errors.push(error.message));
  await cartPage.goto(`${appUrl}/cart`); await cartPage.waitForLoadState('networkidle');
  check('Authenticated fixture reaches cart through real middleware',new URL(cartPage.url()).pathname === '/cart');
  for(const width of [320,390,768,1440]) await layout(cartPage,'cart',width);
  await cartPage.setViewportSize({width:390,height:844}); await audit(cartPage,'cart-mobile');
  await cartPage.getByRole('button',{name:'Clear cart',exact:true}).click(); await audit(cartPage,'clear-cart-confirmation');
  check('Clear cart requires confirmation',await cartPage.getByRole('dialog',{name:'Clear your cart?'}).isVisible());
  await cartPage.getByRole('button',{name:'Keep cart'}).click(); await cartPage.getByRole('dialog').waitFor({state:'hidden'});
  check('Cancel keeps cart contents',await cartPage.getByRole('heading',{name:meals[0].name}).count()===1);
  await cartPage.getByRole('button',{name:'Clear cart',exact:true}).click(); await cartPage.getByRole('dialog').getByRole('button',{name:'Clear cart',exact:true}).click(); await cartPage.getByRole('dialog').waitFor({state:'hidden'}); await audit(cartPage,'cart-empty');
  check('Confirm clears cart and exposes recovery',await cartPage.getByRole('heading',{name:'Your cart is empty'}).isVisible());
  homeState='empty'; await page.goto(`${appUrl}/restaurants`);
  await page.getByRole('heading',{name:'No restaurants found'}).waitFor();
  check('Empty production catalog has no sample restaurant links',await page.locator('a[href^="/restaurants/"]').count()===0);
  await audit(page,'catalog-empty');
  homeState='normal';
  const missingResponse=await page.goto(`${appUrl}/restaurants/${uid(888)}`);
  check('Unknown restaurant UUID returns a genuine 404',missingResponse.status()===404);
  result.passed = result.layouts.every(row=>row.passed) && result.interactions.every(row=>row.passed) && result.audits.every(row=>row.violations.length===0) && result.errors.length===0;
  fs.writeFileSync(path.join(output,'server.log'),serverLog);
} catch(error) {
  result.fatal = error.message; result.passed=false;
} finally {
  if(browser) await browser.close(); if(next) next.kill('SIGTERM'); fixture.close();
  result.fixtureRequests = requests;
  fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:result.passed,layouts:result.layouts.length,audits:result.audits.length,interactions:result.interactions.length,errors:result.errors,fatal:result.fatal,failures:result.layouts.filter(row=>!row.passed),violations:result.audits.filter(row=>row.violations.length).map(row=>({name:row.name,ids:row.violations.map(v=>v.id)}))}));
  process.exitCode=result.passed?0:1;
}
