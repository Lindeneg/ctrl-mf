export interface PageRule {
    pathname: string,
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
    countryCodes: string[]
}

export interface Config {
    websiteId: string,
    locationRule: LocationRule,
    optionalRule?: OptionalRule,
    debug?: boolean,
    isValid?: boolean
}