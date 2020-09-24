import {
    LocationRule,
    Config,
    Is
} from './types';
import {
    locationCalls,
    re
} from './constants';


const checkType = (args: any[], compare: (a: any) => boolean): boolean => {
    if (args.length > 0) {
        for (let i: number = 0; i < args.length; i++) {
            if (typeof args[i] !== 'undefined' && !compare(args[i])) {
                return false;
            }
        }
    }
    return true && args.length > 0;
}

const get = async (url: string, debug: boolean): Promise < string > => {
    try {
        const res: Response = await fetch(url);
        if (res.status === 200) {
            return res.text();
        }
    } catch(err) {
        logger(debug, 'request exception, likely blocked by client');
    }
    return '';
}

const getLocation = async (debug: boolean): Promise < string > => {
    for (let i: number = 0; i < locationCalls.length; i++) {
        logger(debug, 'fetching client location from \'' + locationCalls[i] + '\'');
        const call: string = await get(locationCalls[i], debug);
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
        return matchLocationRule(json.country.toLowerCase(), locationRule, debug);
    } catch (err) {
        const entries: string[] = response.split('\n');
        for (let i: number = 0; i < entries.length; i++) {
            const [k, v]: string[] = entries[i].split('=');
            if (k.toUpperCase() === 'LOC' && matchLocationRule(v.toLowerCase(), locationRule, debug)) {
                return true;
            }
        }
    }
    return result;
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

export const is: Is = {
    string(...args: any[]): boolean {
        return checkType(args, (a: any): boolean => {
            return typeof a === 'string';
        });
    },
    number(...args: any[]): boolean {
        return checkType(args, (a: any): boolean => {
            return typeof a === 'number' && !isNaN(a);
        });
    },
    array(...args: any[]): boolean {
        return checkType(args, (a: any): boolean => {
            return typeof a === 'object' && Array.isArray(a);
        });
    },
    defined(...args: any[]): boolean {
        return checkType(args, (a: any): boolean => {
            return !(typeof a === 'undefined');
        });
    }
};

export const logger = (debug: boolean, msg: string): void => {
    debug ? console.log('ControlMouseflowDebug: ' + msg) : null;
}

export const isSessionInitiated = (wid: string): boolean => {
    if (is.string(wid)) {
        return new RegExp('mf_' + wid).test(document.cookie);
    }
    return false;
}

export const validateConfig = (config: Config): Config => {
    if (is.defined(config)) {
        // if no optionalRule is set, treat every page as desired
        config.optionalRule = config.optionalRule || {
            pageRules: [],
            rest: {
                recordingRate: 100
            }
        };
        // if no default behavior is set, the default default behavior is to record on exceptions
        config.locationRule.shouldRecordOnError = config.locationRule.shouldRecordOnError || true;
        config.debug = config.debug || false;
        if (!is.defined(config.websiteId) || !(re.wid.test(config.websiteId))) {
            throw Error('invalid websiteId provided');
        }
        if (!is.defined(config.locationRule.include, config.locationRule.countryCodes) || config.locationRule.countryCodes.length <= 0) {
            throw Error('invalid locationRule provided');
        }
        if (is.defined(config.optionalRule) && !is.array(config.optionalRule.pageRules) || !is.number(config.optionalRule.rest.recordingRate)) {
            throw Error('invalid optionalRule provided');
        }
        config.isValid = true;
        return config;
    }
    throw Error('no config provided');
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
    if (is.number(recordingRate)) {
        return Math.floor((Math.random() * 100) + 1) <= recordingRate;
    }
    return false;
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

export const matchPath = (control: string, pathnames: string[]): boolean => {
    if (is.string(control) && is.array(pathnames) && pathnames.length > 0) {
        control = control.toLowerCase();
        for (let i: number = 0; i < pathnames.length; i++) {
            const pathname: string = pathnames[i].toLowerCase();
            // remove extensions if present
            const reg: RegExpExecArray = re.ext.exec(pathname);
            // if the pathname of the rule set is equal to the control,
            // then the client is on a desired page
            if ((reg ? reg[0] === control : pathname === control)) {
                return true;
            }
        }
    } else if (is.string(control) && is.string(pathnames)) {
        //@ts-ignore
        return control === pathnames;
    }
    return false;
}