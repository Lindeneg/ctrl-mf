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
    is,
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
        // ensure client is on a desired page
        if (this.onDesiredPage) {
            // if a session cookie is also found
            if (this.sessionInitiated) {
                // inject mouseflow to continue the session
                this.injectMouseflow();
            } else {
                // client is still on the correct page but location is unknown
                (async function () {
                    // fetch the location and match it with the location rule
                    const shouldInject: boolean = await getAndMatchLocation(this.locationRule, this.debug);
                    // inject mouseflow if the match returns true
                    shouldInject ? this.injectMouseflow() : null;
                }).bind(this)();
            }
        }
    }

    isOnDesiredPage(): boolean {
        const currentPage: string = window.document.location.pathname;
        let wasNotMatched: boolean = false;
        if (this.optionalRule.pageRules.length > 0) {
            for (let i: number = 0; i < this.optionalRule.pageRules.length; i++) {
                const pageRule: PageRule = this.optionalRule.pageRules[i];
                // if client is on a desired page
                if (matchPath(currentPage, pageRule.pathnames)) {
                    // match the configured recording rate for that page
                    if (recordingRateMatch(pageRule.recordingRate)) {
                        this.log('page \'' + currentPage + '\' matched in rule set | recordingRate matched');
                        return true;
                    } else {
                        this.log('page \'' + currentPage + '\' matched in rule set | recordingRate not matched');
                        // let the function know that a desired page was matched but its recording rate was not
                        wasNotMatched = true;
                        break;
                    }
                }
            }
        }
        // ignore pages where wasNotMatched is true -> the dice should only be thrown once
        // however, if an unmatched page is at play, the configured recording rate for optionalRule.rest should be used
        if (!wasNotMatched && is.number(this.optionalRule.rest.recordingRate) && recordingRateMatch(this.optionalRule.rest.recordingRate)) {
            this.log('page \'' + currentPage + '\' not matched in rule set | recordingRate matched');
            return true;
        }
        // final case where an unmatched page also fails to match the configured rest recording rate
        !wasNotMatched ? this.log('page \'' + currentPage + '\' not matched in rule set | recordingRate not matched') : null;
        return false;
    }

    injectMouseflow(): void {
        if (!(typeof ( < any > window)._mfq === 'undefined') && !(typeof ( < any > window).mouseflow === 'undefined')) {
            if (( < any > window).mouseflow.websiteId === this.wid) {
                this.debug && !(typeof ( < any > window).mouseflowDebug !== 'undefined') ? ( < any > window).mouseflow.debug() : null;
                if (( < any > window).mouseflow.isRecording()) {
                    this.log('mouseflow already injected and recording');
                } else {
                    this.log('mouseflow already injected, starting recording');
                    ( < any > window).mouseflow.start();
                }
            } else {
                this.log('mouseflow already injected but websiteId does not match the config');
            }
        } else {
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
            // exceptions have been thrown from the validateConfig call
            // so this part will actually never be reached
            return;
        }
    }
}