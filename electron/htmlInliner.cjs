const fs = require('fs');
const path = require('path');

// Helper to fetch resource using global fetch (Node 18+)
async function fetchResource(url) {
    if (!url.startsWith('http')) return null;

    try {
        console.log('Downloading:', url);
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to download ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.error(`Error downloading ${url}:`, e);
        return null; // Return null on failure so we don't break the whole process
    }
}

function getMimeType(url) {
    try {
        const ext = path.extname(new URL(url).pathname).toLowerCase();
        const map = {
            '.woff2': 'font/woff2',
            '.woff': 'font/woff',
            '.ttf': 'font/ttf',
            '.otf': 'font/otf',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp'
        };
        return map[ext] || 'application/octet-stream';
    } catch (e) {
        return 'application/octet-stream';
    }
}

function toBase64(buffer, mime) {
    return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function inlineCss(cssContent, baseUrl) {
    let newCss = cssContent;

    // Find url(...) patterns
    const urlPattern = /url\(['"]?([^'")]+)['"]?\)/g;

    // Convert iterators to array to handle async replacement
    const matches = [...newCss.matchAll(urlPattern)];

    // Process sequentially to avoid race conditions in simple string replacement
    for (const m of matches) {
        const fullMatch = m[0];
        const rawUrl = m[1];

        if (rawUrl.startsWith('data:')) continue;

        try {
            const absoluteUrl = new URL(rawUrl, baseUrl).href;
            const buffer = await fetchResource(absoluteUrl);
            if (buffer) {
                const mime = getMimeType(absoluteUrl);
                const dataUri = toBase64(buffer, mime);

                // Replace globally (careful with collision, but in CSS usually safe)
                // Use split/join for global replacement of the specific string
                newCss = newCss.split(rawUrl).join(dataUri);
                console.log('Inlined CSS resource:', rawUrl);
            }
        } catch (e) {
            console.warn('Failed to inline CSS resource:', rawUrl, e);
        }
    }

    return newCss;
}

async function processHtml(htmlContent) {
    let processedHtml = htmlContent;

    // 1. Google Fonts & CSS Links
    // Match <link rel="stylesheet" href="...">
    const linkPattern = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
    const links = [...processedHtml.matchAll(linkPattern)];

    for (const m of links) {
        const wholeTag = m[0];
        const href = m[1];

        console.log('Processing CSS Link:', href);
        try {
            const buffer = await fetchResource(href);
            if (buffer) {
                let cssText = buffer.toString('utf-8');
                // Inline resources inside the CSS (fonts, images)
                cssText = await inlineCss(cssText, href);

                const styleTag = `<style>\n/* Inlined from ${href} */\n${cssText}\n</style>`;
                processedHtml = processedHtml.replace(wholeTag, styleTag);
            }
        } catch (e) { console.error(e); }
    }

    // 2. Scripts
    // Match <script src="..."></script>
    const scriptPattern = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g;
    const scripts = [...processedHtml.matchAll(scriptPattern)];

    for (const m of scripts) {
        const wholeTag = m[0];
        const src = m[1];

        console.log('Processing Script:', src);
        try {
            const buffer = await fetchResource(src);
            if (buffer) {
                const jsText = buffer.toString('utf-8');
                // Escape simple </script> occurrences in string literals? 
                // Rare for logic, but possible. For now raw import.
                const scriptTag = `<script>\n/* Inlined from ${src} */\n${jsText}\n</script>`;
                processedHtml = processedHtml.replace(wholeTag, scriptTag);
            }
        } catch (e) { console.error(e); }
    }

    // 3. Images
    // Match <img src="...">
    const imgPattern = /<img[^>]*src="([^"]+)"[^>]*>/g;
    const images = [...processedHtml.matchAll(imgPattern)];

    for (const m of images) {
        const wholeTag = m[0];
        const src = m[1];

        if (src.startsWith('data:')) continue;

        console.log('Processing Image:', src);
        try {
            const buffer = await fetchResource(src);
            if (buffer) {
                const mime = getMimeType(src);
                const dataUri = toBase64(buffer, mime);

                // Construct new tag to be safe
                // const newTag = wholeTag.replace(src, dataUri); 
                // replace specifically the src value part
                // We utilize the fact that we matched `src="([^"]+)"`
                // But finding exact substring replacement is safer than reconstructing if attributes are complex
                const srcAttr = `src="${src}"`;
                const newSrcAttr = `src="${dataUri}"`;
                const newTag = wholeTag.replace(srcAttr, newSrcAttr);

                processedHtml = processedHtml.replace(wholeTag, newTag);
            }
        } catch (e) { console.error(e); }
    }

    return processedHtml;
}

module.exports = { processHtml };
