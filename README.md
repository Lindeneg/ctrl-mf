# work-in-progress
______________________________________
### Control Mouseflow Injection
______________________________________
- Include/Exclude countries
- Include/Exclude pages
- Set recording rates for multiple pages
______________________________________
### Usage
\--- ./dist/bundle.js exposes **ControlMouseflowInit(config)**

\--- config is of the following format:

```typescript
{
    websiteId: string,                // mouseflow website id
    locationRule: {
        include: boolean,             // false if countryCodes should be excluded else true
        countryCodes: string[]        // array of ISO 3166-1 alpha-2 country code strings
        shouldRecordOnError?: boolean // false if no record on failed location lookup
    },                                // default: true
    optionalRule?: {
        pageRules: {                  // array of optional page rules
            pathnames: string[],      // array of pathnames to respect the pageRule
            recordingRate: number     // recording rate of the pageRule (0 < rate <= 100)
        }[],
        rest: {
            recordingRate: number     // recording rate for all other pages not specified
        }                             // default: {pageRules: [], rest: {recordingRate: 100}}
    }                                 
    debug?: boolean                   // true if dump debug messages
}                                     // default: false
```

\--- **Examples:**
```javascript
/*
Include clients from Denmark, Sweden, Norway and Germany

Exclude client on failed location lookup

Exclude all other clients

Record all available pages
*/
window.ControlMouseflowInit({
    websiteId: '{website-id-from-mouseflow-account}',
    locationRule: {
        include: true,
        countryCodes: [
          'DK',
          'SE',
          'no',
          'de'
        ],
        shouldRecordOnError: false
    }
});


/*
Exclude clients from Denmark and Sweden

Include client on failed location lookup

Include all other clients

Record all available pages
*/
window.ControlMouseflowInit({
    websiteId: '{website-id-from-mouseflow-account}',
    locationRule: {
        include: false,
        countryCodes: [
          'DK',
          'SE'
        ]
    }
});

/*
Exclude clients from Denmark and Sweden

Include client on failed location lookup

Include all other clients

Record 70% of eligible clients on:
    - '/'
    - '/blog'

Record 30% of eligible clients on:
    - '/contact'

Record 100% of eligible clients on all other pages
*/
window.ControlMouseflowInit({
    websiteId: '{website-id-from-mouseflow-account}',
    locationRule: {
        include: false,
        countryCodes: [
          'DK',
          'SE'
        ]
    },
    optionalRule: {
        pageRules: [
          {
            pathnames: ['/', '/blog'],
            recordingRate: 70
          },
          {
            pathnames: ['/contact'],
            recordingRate: 30
          }
        ],
        rest: {
            recordingRate: 100
        }
    }
});
```

### Todo
- Implement more location lookup for fallback calls
- Allow regular expressions for pathnames in pageRules
- Implement unit tests