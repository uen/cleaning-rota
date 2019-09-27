module.exports = {
    apps : [{
      name      : 'cleaning-rota',
      script    : 'index.js',
      autorestart: true,
      max_restarts: 10,
      append_env_to_name: true,
      env_production : {
        NODE_ENV: 'production'
      }
    }],
    deploy : {
      production : {
        user : 'maninet',
        host : '45.76.140.97',
        ref  : 'origin/master',
        repo : 'git@github.com:vrondakis/cleaning-rota.git',
        path : '/home/maninet/cleaning-rota/production',
        'post-deploy' : 'git submodule update --init --recursive; cp ~/cleaning-rota/production.config.js config.js; npm install && pm2 startOrRestart ecosystem.config.js --env production'
      }
    }
}
