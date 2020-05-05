const yn = require("yn");

module.exports = {
    server: {
        graphQLServerURL: process.env.SERVER_URL + '/graphql',
        liveQuery: {
            classNames: ["_User", "PostMessage", "PostMessageSocial"],
            redisURL: 'redis://user:YQU8q92fG6nMhU1GqWmVTE2ds1fin+th7At+ReO4myM=@parseserverwestRedis.redis.cache.windows.net:6379',
            logLevel: 'VERBOSE',
            serverURL: 'ws://' + process.env.SERVER_URL + '/parse'
        },
        maxUploadSize: "500mb",
        allowClientClassCreation: yn(process.env.CLIENT_CLASS_CREATION) || false
    },
    dashboard: {},
    storage: {},
    push: {

            ios: [
                {
                    cert: './apns-prod-cert.pem',
                    key: './Key-Distribution.pem',
                    passphrase: '', // optional password to your p12/PFX
                    bundleId: 'ai.papr',
                    production: true
                },
                {
                    cert: './apns-dev-cert.pem',
                    key: './Key-Development.pem',
                    passphrase: '', // optional password to your p12/PFX
                    bundleId: 'ai.papr.dev',
                    production: false
                }
            ]


    }
}