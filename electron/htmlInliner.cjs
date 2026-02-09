const cheerio = require('cheerio');
const path = require('path');
const fetch = require('node-fetch');

// Headers to mimic a real browser (Crucial for Google Fonts)
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

// Helper: Fetch resource with headers
async function fetchResource(url) {
    if (!url.startsWith('http')) return null;

    try {
        console.log('Downloading:', url);
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) {
            console.warn(`Failed to download ${url}: ${response.status}`);
            return null;
        }
        return Buffer.from(await response.arrayBuffer());
    } catch (e) {
        console.error(`Error downloading ${url}:`, e.message);
        return null; // Fail gracefully
    }
}

function getMimeType(url) {
    try {
        const ext = path.extname(new URL(url).pathname).toLowerCase();
        const map = {
            '.woff2': 'font/woff2',
            '.woff': 'font/woff',
            '.ttf': 'font/ttf',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp'
        };
        return map[ext] || 'application/octet-stream';
    } catch (e) { return 'application/octet-stream'; }
}

function toBase64(buffer, mime) {
    return `data:${mime};base64,${buffer.toString('base64')}`;
}

// Inline resources inside CSS (fonts, images)
async function inlineCss(cssContent, baseUrl) {
    let newCss = cssContent;
    const urlPattern = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;

    // Find all unique URLs
    const matches = [...newCss.matchAll(urlPattern)];
    const uniqueUrls = [...new Set(matches.map(m => m[1]))];

    for (const rawUrl of uniqueUrls) {
        if (rawUrl.startsWith('data:') || rawUrl.startsWith('#')) continue;

        try {
            // Resolve relative URLs
            const absoluteUrl = new URL(rawUrl, baseUrl).href;

            const buffer = await fetchResource(absoluteUrl);
            if (buffer) {
                const mime = getMimeType(absoluteUrl);
                const dataUri = toBase64(buffer, mime);

                // Replace all occurrences of this URL in the CSS
                const escapedUrl = rawUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const replaceRegex = new RegExp(escapedUrl, 'g');
                newCss = newCss.replace(replaceRegex, dataUri);

                console.log('  ✓ Inlined CSS resource:', path.basename(absoluteUrl));
            }
        } catch (e) {
            console.warn('  ⚠ Failed to inline CSS asset:', rawUrl);
        }
    }
    return newCss;
}

async function processHtml(htmlContent) {
    // Load HTML into Cheerio (like BeautifulSoup)
    const $ = cheerio.load(htmlContent);
    const baseUrl = 'http://localhost'; // Fallback base

    console.log('--- STARTING ROBUST INLINING (Cheerio) ---');

    const links = $('link[rel="stylesheet"]').toArray();
    for (const link of links) {
        const $link = $(link);
        const href = $link.attr('href');
        if (href && !href.startsWith('data:')) {
            console.log('📦 Processing CSS:', href);
            const buffer = await fetchResource(href);
            if (buffer) {
                let cssText = buffer.toString('utf-8');
                cssText = await inlineCss(cssText, href);
                // Replace <link> with <style>
                const $style = $('<style>').text(`/* Inlined from ${href} */\n${cssText}`);
                $link.replaceWith($style);
            }
        }
    }

    const scripts = $('script[src]').toArray();
    for (const script of scripts) {
        const $script = $(script);
        const src = $script.attr('src');
        if (src && !src.startsWith('data:')) {
            console.log('📦 Processing Script:', src);
            const buffer = await fetchResource(src);
            if (buffer) {
                const jsText = buffer.toString('utf-8');
                $script.removeAttr('src');
                $script.text(`/* Inlined from ${src} */\n${jsText}`);
            }
        }
    }

    const images = $('img[src]').toArray();
    for (const img of images) {
        const $img = $(img);
        const src = $img.attr('src');
        if (src && !src.startsWith('data:')) {
            console.log('📦 Processing Image:', src);
            const buffer = await fetchResource(src);
            if (buffer) {
                const mime = getMimeType(src);
                const dataUri = toBase64(buffer, mime);
                $img.attr('src', dataUri);
            }
        }
    }

    // Process inline style blocks
    const styles = $('style').toArray();
    for (const style of styles) {
        const $style = $(style);
        let cssText = $style.html();
        if (cssText && cssText.includes('url(')) {
            console.log('📦 Processing Inline Style Block');
            const newCss = await inlineCss(cssText, 'http://localhost');
            $style.text(newCss);
        }
    }

    return $.html();
}

module.exports = { processHtml };
