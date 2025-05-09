const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const { HttpsProxyAgent } = require('https-proxy-agent');

dotenv.config();
const { USERNAME, PASSWORD } = process.env;

const TOKEN_FILE = 'token.txt';
const PROXY_FILE = 'proxies.txt';

const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
};

const logger = {
    info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
    wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
    banner: () => {
        console.log(`${colors.cyan}${colors.bold}`);
        console.log(`---------------------------------------------`);
        console.log(`  DDai Network Auto Bot - Airdrop Insiders `);
        console.log(`---------------------------------------------${colors.reset}\n`);
    },
};

function loadProxies() {
    try {
        if (!fs.existsSync(PROXY_FILE)) {
            logger.error('proxies.txt not found! Please create it with proxy list.');
            return [];
        }
        const proxies = fs.readFileSync(PROXY_FILE, 'utf8').split('\n').map(line => line.trim()).filter(line => line);
        logger.info(`Loaded ${proxies.length} proxies from proxies.txt`);
        return proxies;
    } catch (error) {
        logger.error(`Error loading proxies: ${error.message}`);
        return [];
    }
}

function formatProxy(proxy) {
    let formattedProxy = proxy;
    if (!proxy.startsWith('http://') && !proxy.startsWith('https://')) {
        formattedProxy = `http://${proxy}`;
    }
    return formattedProxy;
}

function createAxiosInstance(proxy = null) {
    const config = {};
    if (proxy) {
        const formattedProxy = formatProxy(proxy);
        logger.step(`Using proxy: ${proxy}`);
        config.httpAgent = new HttpsProxyAgent(formattedProxy);
        config.httpsAgent = new HttpsProxyAgent(formattedProxy);
    }
    return axios.create(config);
}

const getHeaders = (token) => ({
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    'authorization': `Bearer ${token}`,
    'priority': 'u=1, i',
    'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'sec-gpc': '1',
    'Referer': 'https://app.ddai.network/'
});

function readToken() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
        }
        return null;
    } catch (error) {
        logger.error(`Error reading token: ${error.message}`);
        return null;
    }
}

function saveToken(token) {
    try {
        fs.writeFileSync(TOKEN_FILE, token);
        logger.success('Token saved to token.txt');
    } catch (error) {
        logger.error(`Error saving token: ${error.message}`);
    }
}

async function login(axiosInstance) {
    logger.loading('Attempting to login...');
    try {
        const loginPayload = {
            username: USERNAME,
            password: PASSWORD
        };

        const loginHeaders = {
            ...getHeaders(''),
            'content-type': 'application/json',
        };

        const response = await axiosInstance.post('https://auth.ddai.network/login', loginPayload, { headers: loginHeaders });
        if (response.data.status === 'success') {
            const accessToken = response.data.data.accessToken;
            logger.success(`Login successful | Username: ${response.data.data.user.username}`);
            saveToken(accessToken);
            return accessToken;
        } else {
            throw new Error('Login failed: ' + JSON.stringify(response.data.error));
        }
    } catch (error) {
        logger.error(`Error during login: ${error.message}`);
        return null;
    }
}

async function getMissions(axiosInstance, token) {
    logger.loading('Fetching missions...');
    try {
        const response = await axiosInstance.get('https://auth.ddai.network/missions', { headers: getHeaders(token) });
        if (response.data.status === 'success') {
            logger.success(`Found ${response.data.data.missions.length} missions`);
            return response.data.data.missions;
        } else {
            throw new Error('Failed to fetch missions: ' + JSON.stringify(response.data.error));
        }
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logger.warn('Token expired while fetching missions');
            return 'token_expired';
        }
        logger.error(`Error fetching missions: ${error.message}`);
        return null;
    }
}

async function claimMission(axiosInstance, token, missionId) {
    logger.step(`Claiming mission ID: ${missionId}`);
    try {
        const response = await axiosInstance.post(`https://auth.ddai.network/missions/claim/${missionId}`, null, { headers: getHeaders(token) });
        if (response.data.status === 'success') {
            logger.success(`Mission claimed | Reward: ${response.data.data.rewards.requests} requests`);
            return response.data;
        } else {
            throw new Error('Failed to claim mission: ' + JSON.stringify(response.data.error));
        }
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logger.warn('Token expired while claiming mission');
            return 'token_expired';
        }
        logger.error(`Error claiming mission: ${error.message}`);
        return null;
    }
}

async function completeMissions(axiosInstance, token) {
    let currentToken = token;
    let missions = await getMissions(axiosInstance, currentToken);

    if (missions === 'token_expired') {
        currentToken = await login(axiosInstance);
        if (!currentToken) {
            logger.error('Failed to obtain new token for missions');
            return null;
        }
        missions = await getMissions(axiosInstance, currentToken);
    }

    if (!missions) {
        logger.error('Failed to fetch missions, skipping...');
        return currentToken;
    }

    for (const mission of missions) {
        if (mission.status === 'PENDING') {
            logger.step(`Processing mission: ${mission.title}`);
            const result = await claimMission(axiosInstance, currentToken, mission._id);
            if (result === 'token_expired') {
                currentToken = await login(axiosInstance);
                if (!currentToken) {
                    logger.error('Failed to obtain new token for mission claim');
                    return null;
                }
                await claimMission(axiosInstance, currentToken, mission._id);
            }
            await delay(2000); 
        } else {
            logger.info(`Mission already completed: ${mission.title}`);
        }
    }
    logger.success('All missions processed');
    return currentToken;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function modelResponse(axiosInstance, token) {
    logger.loading('Sending Model Response request...');
    try {
        const response = await axiosInstance.get('https://auth.ddai.network/modelResponse', { headers: getHeaders(token) });
        logger.success(`Model Response | Throughput: ${response.data.data.throughput}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logger.warn('Token expired during Model Response');
            return 'token_expired';
        }
        logger.error(`Error in Model Response: ${error.message}`);
        return null;
    }
}

async function onchainTrigger(axiosInstance, token) {
    logger.loading('Sending Onchain Trigger request...');
    try {
        const response = await axiosInstance.post('https://auth.ddai.network/onchainTrigger', null, { headers: getHeaders(token) });
        logger.success(`Onchain Trigger | Requests Total: ${colors.yellow}${response.data.data.requestsTotal}${colors.reset}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logger.warn('Token expired during Onchain Trigger');
            return 'token_expired';
        }
        logger.error(`Error in Onchain Trigger: ${error.message}`);
        return null;
    }
}

async function main() {
    logger.banner();
    logger.info('Starting DDai Network Auto Bot...');

    const proxies = loadProxies();
    const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
    const axiosInstance = createAxiosInstance(proxy);

    let requestCount = 0;
    let token = readToken();

    if (!token) {
        logger.warn('No token found, attempting to login...');
        token = await login(axiosInstance);
        if (!token) {
            logger.error('Failed to start bot: Unable to obtain token');
            return;
        }
    }

    logger.step('Starting mission completion process...');
    token = await completeMissions(axiosInstance, token);
    if (!token) {
        logger.error('Failed to complete missions, exiting...');
        return;
    }

    logger.step('Starting request loop...');
    while (true) {
        try {
            let result = await modelResponse(axiosInstance, token);
            if (result === 'token_expired') {
                token = await login(axiosInstance);
                if (!token) throw new Error('Unable to obtain new token');
                result = await modelResponse(axiosInstance, token);
            }

            result = await onchainTrigger(axiosInstance, token);
            if (result === 'token_expired') {
                token = await login(axiosInstance);
                if (!token) throw new Error('Unable to obtain new token');
                result = await onchainTrigger(axiosInstance, token);
            }
            if (result) {
                requestCount++;
                logger.info(`Total Requests Sent: ${requestCount}`);
            }

            result = await modelResponse(axiosInstance, token);
            if (result === 'token_expired') {
                token = await login(axiosInstance);
                if (!token) throw new Error('Unable to obtain new token');
                result = await modelResponse(axiosInstance, token);
            }

            result = await modelResponse(axiosInstance, token);
            if (result === 'token_expired') {
                token = await login(axiosInstance);
                if (!token) throw new Error('Unable to obtain new token');
                result = await modelResponse(axiosInstance, token);
            }

            logger.loading('Waiting for 30 seconds...');
            await delay(30000);

        } catch (error) {
            logger.error(`Error in main loop: ${error.message}`);
            await delay(30000);
        }
    }
}

main().catch(err => logger.error(`Bot crashed: ${err.message}`));