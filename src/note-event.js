import {Constants} from './constants';
import {NoteOnEvent} from './note-on-event';
import {NoteOffEvent} from './note-off-event';
import {Utils} from './utils';

/**
 * Wrapper for noteOnEvent/noteOffEvent objects that builds both events.
 * @param {object} fields - {pitch: '[C4]', duration: '4', wait: '4', velocity: 1-100}
 * @return {NoteEvent}
 */
class NoteEvent {
	constructor(fields) {
		this.data 		= [];
		this.type 		= 'note';
		this.pitch 		= Utils.toArray(fields.pitch);
		this.wait 		= fields.wait || 0;
		this.duration 	= fields.duration;
		this.sequential = fields.sequential || false;
		this.velocity 	= fields.velocity || 50;
		this.channel 	= fields.channel || 1;
		this.repeat 	= fields.repeat || 1;
		this.grace		= fields.grace;
		this.startTick	= fields.startTick;
		this.tickDuration = Utils.getTickDuration(this.duration);
		this.restDuration = Utils.getTickDuration(this.wait);

		this.events 	= []; // Hold actual NoteOn/NoteOff events
		//this.buildData();
	}

	/**
	 * Builds int array for this event.
	 * @return {NoteEvent}
	 */
	buildData() {
		// Reset data array
		this.data = [];

		var tickDuration = this.tickDuration;
		var restDuration = this.restDuration;

		// Apply grace note(s) and subtract ticks (currently 1 tick per grace note) from tickDuration so net value is the same
		if (this.grace) {
			let graceDuration = 1;
			this.grace = Utils.toArray(this.grace);
			this.grace.forEach((pitch) => {
				let noteEvent = new NoteEvent({pitch:this.grace, duration:'T' + graceDuration});
				this.data = this.data.concat(noteEvent.data)

				tickDuration -= graceDuration;
			});
		}

		// fields.pitch could be an array of pitches.
		// If so create note events for each and apply the same duration.
		var noteOn, noteOff;
		// By default this is a chord if it's an array of notes that requires one NoteOnEvent.
		// If this.sequential === true then it's a sequential string of notes that requires separate NoteOnEvents.
		if ( ! this.sequential) {
			// Handle repeat
			for (var j = 0; j < this.repeat; j++) {
				// Note on
				this.pitch.forEach((p, i) => {
					if (i == 0) {
						//noteOn = new NoteOnEvent({data: Utils.numberToVariableLength(restDuration).concat(this.getNoteOnStatus(), Utils.getPitch(p), Utils.convertVelocity(this.velocity))});
						var noteOnNew = new NoteOnEvent({
													wait: this.wait,
													velocity: this.velocity,
													pitch: p
						});

					} else {
						// Running status (can ommit the note on status)
						//noteOn = new NoteOnEvent({data: [0, Utils.getPitch(p), Utils.convertVelocity(this.velocity)]});
						var noteOnNew = new NoteOnEvent({
													wait: 0,
													velocity: this.velocity,
													pitch: p
						});
					}

					this.events.push(noteOnNew);
					//this.data = this.data.concat(noteOn.data);
				});

				// Note off
				this.pitch.forEach((p, i) => {
					if (i == 0) {
						//noteOff = new NoteOffEvent({data: Utils.numberToVariableLength(tickDuration).concat(this.getNoteOffStatus(), Utils.getPitch(p), Utils.convertVelocity(this.velocity))});
						var noteOffNew = new NoteOffEvent({
													duration: this.duration,
													velocity: this.velocity,
													pitch: p
						});

					} else {
						// Running status (can ommit the note off status)
						//noteOff = new NoteOffEvent({data: [0, Utils.getPitch(p), Utils.convertVelocity(this.velocity)]});
						var noteOffNew = new NoteOffEvent({
													duration: 0,
													velocity: this.velocity,
													pitch: p
						});
					}

					this.events.push(noteOffNew);
					//this.data = this.data.concat(noteOff.data);
				});
			}

		} else {
			// Handle repeat
			for (var j = 0; j < this.repeat; j++) {
				this.pitch.forEach((p, i) => {
					// restDuration only applies to first note
					if (i > 0) {
						restDuration = 0;
					}

					// If duration is 8th triplets we need to make sure that the total ticks == quarter note.
					// So, the last one will need to be the remainder
					if (this.duration === '8t' && i == this.pitch.length - 1) {
						let quarterTicks = Utils.numberFromBytes(Constants.HEADER_CHUNK_DIVISION);
						tickDuration = quarterTicks - (tickDuration * 2);
					}

					//noteOn = new NoteOnEvent({data: Utils.numberToVariableLength(restDuration).concat([this.getNoteOnStatus(), Utils.getPitch(p), Utils.convertVelocity(this.velocity)])});
					//noteOff = new NoteOffEvent({data: Utils.numberToVariableLength(tickDuration).concat([this.getNoteOffStatus(), Utils.getPitch(p), Utils.convertVelocity(this.velocity)])});

					var noteOnNew = new NoteOnEvent({
													wait: (i > 0 ? 0 : this.wait), // wait only applies to first note in repetition
													velocity: this.velocity,
													pitch: p
					});

					var noteOffNew = new NoteOffEvent({
													duration: this.duration,
													velocity: this.velocity,
													pitch: p
					});

					this.events.push(noteOnNew, noteOffNew);
					//this.data = this.data.concat(noteOn.data, noteOff.data);
				});
			}
		}

		return this;
	};

	/**
	 * Gets the note on status code based on the selected channel. 0x9{0-F}
	 * Note on at channel 0 is 0x90 (144)
	 * 0 = Ch 1
	 * @return {number}
	 */
	getNoteOnStatus() {return 144 + this.channel - 1}

	/**
	 * Gets the note off status code based on the selected channel. 0x8{0-F}
	 * Note off at channel 0 is 0x80 (128)
	 * 0 = Ch 1
	 * @return {number}
	 */
	getNoteOffStatus() {return 128 + this.channel - 1}
}

export {NoteEvent};
