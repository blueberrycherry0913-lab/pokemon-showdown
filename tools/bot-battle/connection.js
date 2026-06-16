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
 */

const https = require('https');
const http = require('http');
const SockJS = require('sockjs-client');

function toID(text) {
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** GET the request body as a string. */
function httpGet(url) {
	return new Promise((resolve, reject) => {
		const mod = url.startsWith('https') ? https : http;
		mod.get(url, res => {
			let data = '';
			res.on('data', c => { data += c; });
			res.on('end', () => resolve(data));
		}).on('error', reject);
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
		this._readyResolve = null;
		this.ready = new Promise(res => { this._readyResolve = res; });
	}

	connect() {
		const url = `http://${this.server}/showdown`;
		this.sock = new SockJS(url, undefined, {transports: ['websocket', 'xhr-polling']});
		this.sock.onmessage = e => this._onMessage(e.data);
		this.sock.onerror = e => console.error(`[${this.name}] socket error`, e && e.message || e);
		return this.ready;
	}

	close() {
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
			const challstr = line.slice('|challstr|'.length);
			await this._login(challstr);
		} else if (line.startsWith('|updateuser|')) {
			// |updateuser|<name>|<named 0/1>|<avatar>|<settings>
			const parts = line.split('|');
			const named = parts[3] === '1';
			if (named && toID(parts[2]) === this.id) {
				this._readyResolve && this._readyResolve();
				this._readyResolve = null;
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
		let assertion;
		try {
			assertion = (await httpGet(url)).trim();
		} catch (err) {
			console.error(`[${this.name}] assertion request failed (is there internet access to the loginserver?):`, err.message);
			console.error(`[${this.name}] If your server has Config.noguestsecurity = true, rerun with --noauth.`);
			return;
		}
		if (!assertion || assertion.charAt(0) === ';') {
			console.error(`[${this.name}] loginserver refused the name "${this.name}" ` +
				`(it may be a registered account requiring a password). Pick an unregistered bot name or use --noauth. Response: ${assertion.slice(0, 80)}`);
			return;
		}
		this.sendGlobal(`/trn ${this.name},0,${assertion}`);
	}
}

module.exports = {Connection, toID};
