'use strict';

/**
 * WebSocket-adapted RandomPlayerAI.
 *
 * Reuses the engine's own decision logic (sim/tools/random-player-ai) instead of
 * reimplementing it. We feed each battle-room protocol line into the AI via
 * `receive()`; the AI parses `|request|` lines and calls `choose()`, which we
 * override to emit a `/choose` command over the websocket connection.
 *
 * Behavior knobs (CLAUDE.md plan): `move` (1.0 = never voluntarily switch,
 * 0.7 = ~30% switch) and `mega` (0 = never random Tera/Mega, 0.6 = often).
 */

const {RandomPlayerAI} = require('../../dist/sim/tools/random-player-ai');

// The base BattlePlayer only touches `stream` in start() (which we never call)
// and choose() (which we override), so a no-op stub satisfies the constructor.
const FAKE_STREAM = {
	write() {},
	writeEnd() {},
	// eslint-disable-next-line require-yield
	async *[Symbol.asyncIterator]() { /* never iterated */ },
};

class WSPlayerAI extends RandomPlayerAI {
	/**
	 * @param {(text: string) => void} sendChoice  called with the full `/choose ...|rqid` command
	 * @param {{move?: number, mega?: number, seed?: any}} options
	 */
	constructor(sendChoice, options = {}) {
		super(FAKE_STREAM, options);
		this.sendChoice = sendChoice;
		this.rqid = 0;
	}

	receiveRequest(request) {
		// Capture the request id so /choose can be guarded against stale requests.
		if (typeof request.rqid === 'number') this.rqid = request.rqid;
		super.receiveRequest(request);
	}

	choose(choice) {
		this.sendChoice(`/choose ${choice}|${this.rqid}`);
	}

	receiveError(error) {
		// The server reports rejected choices as `[Invalid choice]`; the sim uses
		// `[Unavailable choice]`. Swallow both and fall back to `default`, which the
		// server fills with the first legal option for every slot — guarantees progress.
		const msg = error && error.message || '';
		if (msg.startsWith('[Invalid choice]') || msg.startsWith('[Unavailable choice]')) {
			this.sendChoice(`/choose default|${this.rqid}`);
			return;
		}
		throw error;
	}
}

module.exports = {WSPlayerAI};
