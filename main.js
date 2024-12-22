const puppeteer = require('puppeteer');
const chalk = require('chalk');
const fs = require('fs');
const { Table } = require('table');

// Load the config file
const config = JSON.parse(fs.readFileSync('./config.json'));

// Sources
const sources = ['https://webminer.pages.dev/'];

// Function to clear the console
function clearConsole() {
    // Clear console command for Unix-based systems
    console.clear();
}

// Randomly select a source URL
function randomSource() {
    return sources[Math.floor(Math.random() * sources.length)];
}

// Function to print the progress
async function printProgress(msg) {
    clearConsole();
    
    const tableData = [];
    for (const [algo, stats] of Object.entries(msg)) {
        tableData.push([algo, stats.Hashrate, stats.Shared]);
    }

    console.log(chalk.green('* Versions:   browserless-node-1.0.0'));
    console.log(chalk.green('* Author:     malphite-code'));
    console.log(chalk.green('* Donation:   BTC: bc1qzqtkcf28ufrr6dh3822vcz6ru8ggmvgj3uz903'));
    console.log(chalk.green('              RVN: RVZD5AjUBXoNnsBg9B2AzTTdEeBNLfqs65'));
    console.log(chalk.green('              LTC: ltc1q8krf9g60n4q6dvnwg3lg30lp5e7yfvm2da5ty5'));
    console.log(' ');

    const configTable = new Table({
        head: ['Algorithm', 'Hashrate', 'Shared'],
        rows: tableData
    });
    console.log(configTable.toString());
}

// Main async function
async function main() {
    let retries = 50;
    while (retries > 0) {
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--window-position=0,0',
                    '--disable-dev-shm-usage'
                ]
            });

            const pages = {};
            const source = randomSource();

            // Iterate over config and launch browser pages
            for (let index = 0; index < config.length; index++) {
                const params = config[index];
                const query = new URLSearchParams(params).toString();
                const url = `${source}?${query}`;
                console.log(`Browser Restart: ${url}`);
                const page = await browser.newPage();
                await page.goto(url);
                pages[`${params.algorithm}_${index}`] = page;
            }

            // Main loop to scrape data
            while (true) {
                const msg = {};

                for (const [algo, page] of Object.entries(pages)) {
                    try {
                        const hashrate = await page.$eval('#hashrate', el => el.innerText);
                        const shared = await page.$eval('#shared', el => el.innerText);

                        msg[algo] = {
                            Hasrate: hashrate || '0 H/s',
                            Shared: parseInt(shared) || 0
                        };
                    } catch (e) {
                        console.error(`[${retries}] Miner Restart: ${e.message}`);
                        retries -= 1;
                        break;
                    }
                }

                await printProgress(msg);
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
        } catch (e) {
            console.error(`[${retries}] Miner Restart: ${e.message}`);
            retries -= 1;
        }
    }
}

main();
