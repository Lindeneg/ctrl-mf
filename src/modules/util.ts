import {
    LocationRule,
    Config
} from './types';
import {
    locationCalls,
    re
} from './constants';


const get = async (url: string): Promise < string > => {
    const res: Response = await fetch(url);
    if (res.status === 200) {
        return res.text();
    } else {
        return '';
    }
}

const getLocation = async (debug: boolean): Promise < string > => {
    for (let i: number = 0; i < locationCalls.length; i++) {
        logger(debug, 'fetching client location from \'' + locationCalls[i] + '\'');
        const call: string = await get(locationCalls[i]);
        // get will return an empty string on a non-20* response
        if (call.length > 0) {
            logger(debug, 'successfully fetched location');
            return call;
        } else {
            logger(debug, 'failed to fetch location');
        }
    }
    return '';
}

const parseResponse = async (response: string, locationRule: LocationRule, debug: boolean): Promise < boolean > => {
    // TODO: this should be redone, more calls needs to be added, find smarter way to parse the response
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
    // match the location of the client with the array of country codes. if any match occurs,
    // return the boolean inclusion rule. if no match is found, return the opposite of the inclusion
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
    if (!(re.wid.test(config.websiteId))) {
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
    // if no default behavior is set, the default default behavior is to record on exceptions
    config.locationRule.shouldRecordOnError = config.locationRule.shouldRecordOnError || true;
    config.debug = config.debug || false;
    config.isValid = true;
    return config;
}

export const recordingRateMatch = (recordingRate: number): boolean => {
    /*
    generate a random number, n, where 0 < n <= 100
    if recordingRate, r, is a number where 0 < r < 100
    then n will be in the range of 0 < n <= r around r% of the time
    thus if r is 25 and the generated n is 0 < n <= 100
    then n will be 0 < n <= 25 around 25% of the time
    if r is 0 or 100 then always return false and true, respectively
    */
    return Math.floor((Math.random() * 100) + 1) <= recordingRate;
}

export const isNumber = (item: any): boolean => {
    return item !== undefined && typeof item === 'number' && !Number.isNaN(item);
}

export const getAndMatchLocation = async (locationRule: LocationRule, debug: boolean): Promise < boolean > => {
    const sroe: boolean = locationRule.shouldRecordOnError;
    const response: string = await getLocation(debug);
    // if all location lookups fail, an empty string will be returned
    if (response.length > 0) {
        return parseResponse(response, locationRule, debug);
    } else {
        logger(debug, 'all location lookups failed. reverting to default behavior: ' + (sroe ? 'record' : 'not record'));
        return sroe;
    }
}

export const matchPath = (pathname: string, control: string): boolean => {
    pathname = pathname.toLowerCase(), control = control.toLowerCase();
    // remove extensions if present
    const reg: RegExpExecArray = re.ext.exec(pathname);
    return reg ? reg[0] === control : pathname === control;
}