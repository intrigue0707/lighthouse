const fs = require('fs');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js');

const waitTillHTMLRendered = async (page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while(checkCounts++ <= maxChecks){
    let html = await page.content();
    let currentHTMLSize = html.length; 

    let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

    //console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
      countStableSizeIterations++;
    else 
      countStableSizeIterations = 0; //reset the counter

    if(countStableSizeIterations >= minStableSizeIterations) {
      console.log("Fully Rendered Page: " + page.url());
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
  }  
};

async function captureReport(){
	//const browser = await puppeteer.launch({args: ['--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true']});
	const browser = await puppeteer.launch({"headless": false, args: ['--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true']});
	const page = await browser.newPage();
	const baseURL = "http://localhost/";
	
	await page.setViewport({"width":920,"height":800});
	await page.setDefaultTimeout(30000);
	
	const navigationPromise = page.waitForNavigation({timeout: 30000, waitUntil: ['domcontentloaded']});
	await page.goto(baseURL);
    await navigationPromise;
		
	const flow = await lighthouse.startFlow(page, {
		name: 'shophizer',
		configContext: {
		  settingsOverrides: {
			throttling: {
			  rttMs: 40,
			  throughputKbps: 10240,
			  cpuSlowdownMultiplier: 1,
			  requestLatencyMs: 0,
			  downloadThroughputKbps: 0,
			  uploadThroughputKbps: 0
			},
			throttlingMethod: "simulate",
			screenEmulation: {
			  mobile: false,
			  width: 1920,
			  height: 1080,
			  deviceScaleFactor: 1,
			  disabled: false,
			},
			formFactor: "desktop",
			onlyCategories: ['performance'],
		  },
		},
	});
	//================================SELECTORS================================
	const tablePage     = ".main-menu [href='\/category\/tables']";
	const tableCart 	= "#root > div.shop-area.pt-95.pb-100 > div > div > div.col-lg-9.order-1.order-lg-2 > div.shop-bottom-area.mt-35 > div > div > div.product-wrap.mb-25 > div.product-img > a";
	const addToCart		= "#root > div.shop-area.pt-100.pb-100 > div > div > div:nth-child(2) > div > div.pro-details-quality > div.pro-details-cart.btn-hover > button";
	const addToCartBtn  = ".pro-details-cart > button"
	const openCart   	= ".d-lg-block [class='pe-7s-shopbag']";
	const viewCart	    = ".shopping-cart-btn.text-center > a:nth-of-type(1)";
	const proceed       = ".cart-total-box.grand-totall > a";
	

  	//================================NAVIGATE================================
    await flow.navigate(baseURL, {
		stepName: 'open home page'
		});
	await waitTillHTMLRendered(page);
  	console.log('home page is opened');
	
	//================================PAGE_ACTIONS================================
	await flow.startTimespan({ stepName: 'open table page' });
		await page.waitForSelector(tablePage);
	await page.click(tablePage);
	await waitTillHTMLRendered(page);
    await flow.endTimespan();
    console.log('table page is opened');

	
	await flow.startTimespan({ stepName: 'open table cart' });
	await page.click(tableCart);
	await waitTillHTMLRendered(page);
    await flow.endTimespan();
	console.log('table cart is open')
	
    await page.evaluate((addToCartBtn) =>{
		document.querySelector(addToCartBtn).click();
	}, addToCartBtn);
	await page.click(addToCartBtn);
	await page.click(openCart);
	await page.waitForSelector(".shopping-cart-content")
	await flow.startTimespan({ stepName: 'view cart' });
	
		await page.evaluate((viewCart) =>{
			document.querySelector(viewCart).click();
		}, viewCart);
		await waitTillHTMLRendered(page);
		await page.waitForSelector(proceed);
	await flow.endTimespan();
	console.log('cart page is opened');
	
	await flow.startTimespan({ stepName: 'checkout page' });
	await page.click(proceed);
	await waitTillHTMLRendered(page);
    await flow.endTimespan();
	console.log('checkout page is opened')

	//================================REPORTING================================
	const reportPath = __dirname + '/user-flow.report.html';
	//const reportPathJson = __dirname + '/user-flow.report.json';

	const report = await flow.generateReport();
	//const reportJson = JSON.stringify(flow.getFlowResult()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
	
	fs.writeFileSync(reportPath, report);
	//fs.writeFileSync(reportPathJson, reportJson);
    await browser.close();
}
captureReport();