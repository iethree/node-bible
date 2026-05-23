/**
 * PM2 ecosystem file.
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs bible
 */
module.exports = {
	apps: [
		{
			name: "bible",
			script: "src/server/index.ts",
			interpreter: "bun",
			cwd: __dirname,
			instances: 1,
			exec_mode: "fork",
			autorestart: true,
			max_memory_restart: "300M",
			watch: false,
			env: {
				NODE_ENV: "production",
				PORT: 3030,
			},
			env_development: {
				NODE_ENV: "development",
				PORT: 3004,
			},
			out_file: "./logs/bible.out.log",
			error_file: "./logs/bible.err.log",
			merge_logs: true,
			time: true,
		},
	],
};
