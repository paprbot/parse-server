module.exports = {
  server: {},
  liveQuery: {
        classNames: ['PostQuestionMessage'],
        //redisURL: 'redis://paprtest.redis.cache.windows.net:6380,password=LGSn+cOIPeASKKw3QGiOCY5hhH63FckdqtjuuerF6P0=,ssl=True,abortConnect=False'
        redisURL: 'redis://paprtest.redis.cache.windows.net:6379'
    },
  dashboard: {},
  storage: {},
  push: {}
}