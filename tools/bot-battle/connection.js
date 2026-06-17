'use strict';

/**
 * A single headless bot connection to a running Pokémon Showdown server.
 *
 * Speaks the same SockJS endpoint (`/showdown`) the browser client uses, so the
 * server treats the bot as an ordinary player and the full RoomBattle pipeline
 * (validation, analytics interception in room-battle.ts, report generation) runs
 * exactly as in a real playtest.
 *
 * Login: on `|challstr|`, fetch an assertion for the (unregistered) bot name from
 * the public loginserver and send `/trn`. With `noAuth: true` (for a server set
 * to `Config.noguestsecurity = true`) it logs in without an assertion.
 *
 * Fail-fast: connection, login, and assertion errors all reject the `ready`
 * promise immediately (with a descriptive message) instead of silently hanging.
 */

const https = require('https');
const http = require('http');
const SockJS = require('sockjs-client');

function toID(text) {
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** GET url → string with a hard timeout. */
function httpGet(url, timeoutMs = 20000) {
	return new Promise((resolve, reject) => {
		const mod = url.startsWith('https') ? https : http;
		const req = mod.get(url, res => {
			let data = '';
			res.on('data', c => { data += c; });
			res.on('end', () => resolve(data));
			res.on('error', reject);
		});
		req.on('error', reject);
		req.setTimeout(timeoutMs, () => {
			req.destroy();
			reject(new Error(`HTTP request timed out after ${timeoutMs / 1000}s`));
		});
	});
}

class Connection {
	/**
	 * @param {object} opts
	 * @param {string} opts.name        bot display name
	 * @param {string} opts.server      host:port, e.g. "localhost:8000"
	 * @param {boolean} [opts.noAuth]   skip loginserver assertion (dev servers only)
	 * @param {string} [opts.loginServer] base loginserver URL
	 * @param {(roomid: string, line: string) => void} opts.onLine
	 */
	constructor(opts) {
		this.name = opts.name;
		this.id = toID(opts.name);
		this.server = opts.server || 'localhost:8000';
		this.noAuth = !!opts.noAuth;
		this.loginServer = opts.loginServer || 'https://play.pokemonshowdown.com/';
		this.onLine = opts.onLine || (() => {});
		this.sock = null;
		this._connectTimer = null;
		this._readyResolve = null;
		this._readyReject = null;
		this.ready = new Promise((res, rej) => {
			this._readyResolve = res;
			this._readyReject = rej;
		});
	}

	connect() {
		const url = `http://${this.server}/showdown`;
		console.log(`[${this.name}] connecting to ${url} …`);
		this.sock = new SockJS(url, undefined, {transports: ['websocket', 'xhr-polling']});
		this.sock.onmessage = e => this._onMessage(e.data);
		this.sock.onerror = e => {
			const msg = `[${this.name}] socket error — is the server running at ${this.server}? (${(e && e.message) || e})`;
			console.error(msg);
			this._reject(new Error(msg));
		};

		// If the server never sends |challstr| within 30 s it's not listening.
		this._connectTimer = setTimeout(() => {
			const msg = `[${this.name}] no |challstr| from server after 30s — server may not be running at ${this.server}`;
			console.error(msg);
			this._reject(new Error(msg));
		}, 30000);

		return this.ready;
	}

	close() {
		clearTimeout(this._connectTimer);
		try { this.sock && this.sock.close(); } catch { /* ignore */ }
	}

	/** Send `roomid|text` (roomid '' = global/lobby). */
	send(roomid, text) {
		this.sock.send(`${roomid || ''}|${text}`);
	}

	/** Send a global command, e.g. sendGlobal('/challenge Bob, gen9testingstandard'). */
	sendGlobal(text) {
		this.send('', text);
	}

	/** Reject the ready promise once (subsequent calls are no-ops). */
	_reject(err) {
		if (this._readyReject) {
			this._readyReject(err);
			this._readyReject = null;
			this._readyResolve = null;
		}
	}

	_onMessage(data) {
		// One SockJS frame carries one room's block. A leading ">roomid" line names
		// the room; otherwise the block is global/lobby (roomid '').
		let roomid = '';
		let rest = data;
		if (data.charAt(0) === '>') {
			const nl = data.indexOf('\n');
			roomid = data.slice(1, nl === -1 ? undefined : nl);
			rest = nl === -1 ? '' : data.slice(nl + 1);
		}
		for (const line of rest.split('\n')) {
			if (!line) continue;
			this._handleGlobalLine(roomid, line);
			this.onLine(roomid, line);
		}
	}

	async _handleGlobalLine(roomid, line) {
		if (roomid) return; // only global lines drive login
		if (line.startsWith('|challstr|')) {
			clearTimeout(this._connectTimer); // server is alive
			this._connectTimer = null;
			const challstr = line.slice('|challstr|'.length);
			await this._login(challstr);
		} else if (line.startsWith('|updateuser|')) {
			// |updateuser|<name>|<named 0/1>|<avatar>|<settings>
			const parts = line.split('|');
			const named = parts[3] === '1';
			if (named && toID(parts[2]) === this.id) {
				console.log(`[${this.name}] logged in OK.`);
				if (this._readyResolve) {
					this._readyResolve();
					this._readyResolve = null;
					this._readyReject = null;
				}
			}
		}
	}

	async _login(challstr) {
		if (this.noAuth) {
			this.sendGlobal(`/trn ${this.name},0,`);
			return;
		}
		const url = `${this.loginServer.replace(/\/$/, '')}/action.php` +
			`?act=getassertion&userid=${encodeURIComponent(this.id)}&challstr=${encodeURIComponent(challstr)}`;
		console.log(`[${this.name}] fetching login assertion …`);
		let assertion;
		try {
			assertion = (await httpGet(url)).trim();
		} catch (err) {
			const msg = `[${this.name}] loginserver request failed: ${err.message}\n` +
				`  → Check internet access to ${this.loginServer}`;
			console.error(msg);
			this._reject(new Error(msg));
			return;
		}
		if (!assertion || assertion.charAt(0) === ';') {
			const msg = `[${this.name}] loginserver refused the name "${this.name}" — it may be a registered account requiring a password.\n` +
				`  → Choose a different unregistered name (pass --names=A,B) and rerun.`;
			console.error(msg);
			this._reject(new Error(msg));
			return;
		}
		console.log(`[${this.name}] assertion received, logging in …`);
		this.sendGlobal(`/trn ${this.name},0,${assertion}`);
	}
}

module.exports = {Connection, toID};
