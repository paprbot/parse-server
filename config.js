const yn = require("yn");

module.exports = {
    server: {
        /*liveQuery: {
         classNames: ['PostQuestionMessage'],
         redisURL: 'redis://user:LGSn+cOIPeASKKw3QGiOCY5hhH63FckdqtjuuerF6P0=@paprtest.redis.cache.windows.net:6379',
         logLevel: 'VERBOSE'
         }, */
        maxUploadSize: '50mb',
        allowClientClassCreation: yn(process.env.CLIENT_CLASS_CREATION) || false
    },
    dashboard: {},
    storage: {},
    push: {}
}