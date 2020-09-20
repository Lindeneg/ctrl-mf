import {
    LocationRule,
    Config
} from './types';


const get = async (url: string): Promise < string > => {
    const res: Response = await fetch(url);
    if (res.status === 200) {
        return res.text();
    } else {
        return '';
    }
}

const getLocationFromCloudflare = (debug: boolean): Promise < string > => {
    logger(debug, 'fetching client location from cloudflare');
    return get('/cdn-cgi/trace');
}

const getLocationFromIPAPI = (debug: boolean): Promise < string > => {
    logger(debug, 'fetching client location from ipapi.co');
    return get('https://ipapi.co/json/');
}

const parseResponse = async (response: string, locationRule: LocationRule, debug: boolean): Promise < boolean > => {
    let result: boolean = false;
    try {
        const json: {
            country: string
        } = JSON.parse(response);
        result = parseIPAPIResponse(json, locationRule, debug);
    } catch (err) {
        result = parseCloudflareResponse(response, locationRule, debug);
    }
    return result;
}

const parseCloudflareResponse = (res: string, locationRule: LocationRule, debug: boolean): boolean => {
    const entries: string[] = res.split('\n');
    for (let i: number = 0; i < entries.length; i++) {
        const [k, v]: string[] = entries[i].split('=');
        if (k.toUpperCase() === 'LOC' && matchLocationRule(v.toLowerCase(), locationRule, debug)) {
            return true;
        }
    }
    return false;
}

const parseIPAPIResponse = (json: {
    country: string
}, locationRule: LocationRule, debug: boolean): boolean => {
    return matchLocationRule(json.country.toLowerCase(), locationRule, debug);
}

const matchLocationRule = (country: string, locationRule: LocationRule, debug: boolean): boolean => {
    if (locationRule.countryCodes.length > 0) {
        for (let i: number = 0; i < locationRule.countryCodes.length; i++) {
            if (locationRule.countryCodes[i].toLowerCase() === country) {
                logger(debug, 'matched country: ' + country + ' include: ' + locationRule.include);
                return locationRule.include;
            }
        }
    }
    logger(debug, 'not matched country: ' + country + ' include: ' + !locationRule.include);
    return !locationRule.include;
}

export const logger = (debug: boolean, msg: string): void => {
    debug ? console.log('ControlMouseflowDebug: ' + msg) : null;
}

export const isSessionInitiated = (wid: string): boolean => {
    return new RegExp('mf_' + wid).test(document.cookie);
}

export const validateConfig = (config: Config): Config => {
    if (!(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(config.websiteId))) {
        throw Error('invalid websiteId provided');
    }
    if (config.locationRule.include === undefined || config.locationRule.countryCodes === undefined || (config.locationRule.countryCodes !== undefined && config.locationRule.countryCodes.length <= 0)) {
        throw Error('invalid locationRule provided');
    }
    config.optionalRule = config.optionalRule || {
        pageRules: [],
        rest: {
            recordingRate: 100
        }
    };
    config.debug = config.debug || false;
    config.isValid = true;
    return config;
}

export const recordingRateMatch = (recordingRate: number): boolean => {
    return Math.floor((Math.random() * 100) + 1) <= recordingRate;
}

export const isNumber = (item: any): boolean => {
    return item !== undefined && typeof item === 'number' && !Number.isNaN(item);
}

export const getAndMatchLocation = async (locationRule: LocationRule, debug: boolean): Promise < boolean > => {
    const response = await getLocationFromCloudflare(debug) || await getLocationFromIPAPI(debug);
    return parseResponse(response, locationRule, debug);
}

export const matchPath = (pathname: string, control: string): boolean => {
    pathname = pathname.toLowerCase(), control = control.toLowerCase();
    let result: boolean;
    if (pathname.indexOf('.') > -1) {
        const reg: RegExpExecArray = /.+?(?=\.)/.exec(pathname);
        result = reg ? reg[0] === control : pathname === control;
    } else {
        result = pathname === control;
    }
    return result;
}