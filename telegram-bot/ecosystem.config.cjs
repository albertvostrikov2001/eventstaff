module.exports = {
  apps: [{
    name: 'unity-telegram',
    cwd: '/opt/unity',
    script: 'telegram-bot/index.mjs',
    node_args: '--env-file=telegram-bot/.env',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '256M',
    kill_timeout: 60000,
    restart_delay: 5000,
    env: { NODE_ENV: 'production' },
  }],
};
