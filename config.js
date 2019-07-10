const yn = require("yn");

module.exports = {
    server: {
        liveQuery: {
            classNames: ["_User", "PostChatMessage", "PostQuestionMessage"],
            redisURL: 'redis://user:YQU8q92fG6nMhU1GqWmVTE2ds1fin+th7At+ReO4myM=@parseserverwestRedis.redis.cache.windows.net:6379',
            logLevel: 'VERBOSE',
            serverURL: 'ws://parseserverwest.azurewebsites.net/parse'
        },
        maxUploadSize: '50mb',
        allowClientClassCreation: yn(process.env.CLIENT_CLASS_CREATION) || false
    },
    dashboard: {},
    storage: {},
    push: {}
}