export const locationCalls = [
    '/cdn-cgi/trace',
    'https://ipapi.co/json/'
];

export const re: {wid: RegExp, ext: RegExp} = {
    wid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    ext: /.+?(?=\.)/
};