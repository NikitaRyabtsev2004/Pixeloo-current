module.exports = {
  apps: [
    {
      name: "static-site",
      script: "npm",
      args: "run start:site",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "node-server",
      script: "node",         
      cwd: './server',      
      args: "server.cjs",     
      max_memory_restart: "2000M",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
