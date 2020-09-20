import {
    LocationRule,
    PageRule,
    OptionalRule,
    Config
} from './types';
import {
    isSessionInitiated,
    recordingRateMatch,
    validateConfig,
    getAndMatchLocation,
    matchPath,
    isNumber,
    logger
} from './util';


export class ControlMouseflow {

    wid: string;
    locationRule: LocationRule;
    optionalRule: OptionalRule;
    debug: boolean;
    sessionInitiated: boolean;
    onDesiredPage: boolean;

    constructor(wid: string, locationRule: LocationRule, optionalRule: OptionalRule, debug: boolean) {
        this.wid = wid;
        this.locationRule = locationRule;
        this.optionalRule = optionalRule;
        this.debug = debug;
        this.log('starting module');
        this.sessionInitiated = isSessionInitiated(this.wid);
        this.sessionInitiated ? this.log('mouseflow session cookie found') : this.log('mouseflow session cookie not found');
        this.onDesiredPage = this.isOnDesiredPage();
    }

    log(msg: string): void {
        logger(this.debug, msg);
    }

    init(): void {
        if (this.onDesiredPage) {
            if (this.sessionInitiated) {
                this.injectMouseflow();
            } else {
                (async function (instance: ControlMouseflow) {
                    const shouldInject = await instance.isFromDesiredCountry();
                    shouldInject ? instance.injectMouseflow() : null;
                })(this);
            }
        }
    }

    isOnDesiredPage(): boolean {
        const currentPage = window.document.location.pathname;
        let wasNotMatched: boolean = false;
        let result: boolean = false;
        if (this.optionalRule.pageRules.length > 0) {
            for (let i: number = 0; i < this.optionalRule.pageRules.length; i++) {
                const pageRule: PageRule = this.optionalRule.pageRules[i];
                if (matchPath(pageRule.pathname, currentPage)) {
                    if (recordingRateMatch(pageRule.recordingRate)) {
                        this.log('page \'' + currentPage + '\' matched in rule set | recordingRate matched');
                        return true;
                    } else {
                        wasNotMatched = true;
                    }
                }
            }
        }
        if (!wasNotMatched && !result && isNumber(this.optionalRule.rest.recordingRate) && recordingRateMatch(this.optionalRule.rest.recordingRate)) {
            this.log('page \'' + currentPage + '\' not matched in rule set | recordingRate matched');
            return true;
        }
        this.log('page \'' + currentPage + '\' not matched in rule set | recordingRate not matched');
        return false;
    }

    async isFromDesiredCountry(): Promise < boolean > {
        return await getAndMatchLocation(this.locationRule, this.debug);
    }

    injectMouseflow(): void {
        this.log('injecting mouseflow');
        ( < any > window)._mfq = ( < any > window)._mfq || [];
        (function (wid: string) {
            const mf = document.createElement("script");
            mf.type = "text/javascript";
            mf.defer = true;
            mf.src = "//cdn.mouseflow.com/projects/" + wid + ".js";
            document.getElementsByTagName("head")[0].appendChild(mf);
        })(this.wid);
    }

    static start(config: Config) {
        const validatedConfig: Config = validateConfig(config);
        if (validatedConfig.isValid) {
            new ControlMouseflow(
                validatedConfig.websiteId,
                validatedConfig.locationRule,
                validatedConfig.optionalRule,
                validatedConfig.debug
            ).init();
        } else {
            return;
        }
    }
}