/*
    This script uses Playwright to scrape a webpage for information, includes:
        Banner images from a carousel (specifically looking for images within a div with class "slide_img"),
        All h1 headers,
        Phone numbers,
        Addresses,
        Footer copyright information (speciically looking for copyright years).
    All this information is collected and printed in a structured JSON format.
    It can be run from the command line with an optional URL argument.
    If no URL is provided, it defaults to 'https://westernsydney.edu.au'.
    To run this script, use the command: 'node playwright_test.js <url>'
        This was created and tested in the "mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm" Dev Container.
*/

const playwright = require('playwright');

const url = process.argv[2] || 'https://westernsydney.edu.au';


(async () => {
    // Open chromium browser and load the given url
    const browser = await playwright['chromium'].launch();
    const page = await browser.newPage();
    await page.goto(url);

    // Grab all images, specifically in the top carousel
    const imgLocator = page.locator('div.image.slide_img img');
    const imgItems = await imgLocator.all();
    const bannerImages = await Promise.all(
        imgItems.map(async img => {
            const src = await img.getAttribute('src') || await img.getAttribute('data-src');
            if (src && src.trim().length > 0) {
                // Convert relative URLs to absolute URLs
                const absoluteUrl = new URL(src.trim(), url).href;
                return absoluteUrl;
            }
            return null;
        })
    ).then(srcs => srcs.filter(src => src && src.length > 0));

    // Grab h1 headers
    const h1Locator = page.locator('h1');
    const h1Items = await h1Locator.allTextContents();
    const h1Headers = h1Items.map(h1 => h1.trim()).filter(h1 => h1.length > 0);

    // Grab contact
    const contactLocator = page.locator('a[href^="tel:"]');
    const contactItems = await contactLocator.all();
    const contactInfo = await Promise.all(
        contactItems.map(async contact => {
            const href = await contact.getAttribute('href');
            if (href && href.startsWith('tel:')) {
                const phoneNumber = href.replace('tel:', '').trim();
                const normalizedPhone = phoneNumber.replace(/\D/g, '');
                if (normalizedPhone.length >= 8 && normalizedPhone.length <= 12) {
                    return normalizedPhone;
                }
            }
            return null;
        })
    ).then(phones => phones.filter(phone => phone && phone.length > 0));

    // Grab address
    const addressLocator = page.locator('address');
    const addressItems = await addressLocator.allTextContents();
    const addressInfo = addressItems.map(addr => addr.trim().replace(/\s+/g, ' ')).filter(addr => addr.length > 10);

    // Grab footer copyright info
    const footerLocator = page.locator('footer');
    const footerItems = await footerLocator.allTextContents();
    const footerText = footerItems.join(' ').trim();
    const footerInfo = footerText.match(/©\s*(\d{4}(?:\s*[-–—]\s*\d{4})?)|copyright\s*(\d{4}(?:\s*[-–—]\s*\d{4})?)/gi) || [];
    
    // Collect all info into a single object
    const resultInfo = {
        url: url,
        bannerImages: bannerImages,
        h1Headers: h1Headers,
        contactInfo: {
            contact: contactInfo,
            address: addressInfo,
            footer: footerInfo
        }
    };

    console.log(JSON.stringify(resultInfo, null, 2));

    await browser.close();
})();