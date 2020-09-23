export interface PageRule {
    pathnames: string[],
    recordingRate: number
}

export interface OptionalRule {
    pageRules: PageRule[],
    rest: {
        recordingRate: number
    }
}

export interface LocationRule {
    include: boolean,
    countryCodes: string[],
    shouldRecordOnError ? : boolean;
}

export interface Config {
    websiteId: string,
    locationRule: LocationRule,
    optionalRule ? : OptionalRule,
    debug ? : boolean,
    isValid ? : boolean
}

export interface Is {
    string: (...args: any[]) => boolean,
    number: (...args: any[]) => boolean,
    array: (...args: any[]) => boolean,
    defined: (...args: any) => boolean
}