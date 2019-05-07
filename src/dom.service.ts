import { Listener } from "./listener";

let toString = Object.prototype.toString;
let docElement = document.documentElement;
let body = document.body;

interface IViewport {
	w: number;
	h: number;
}

interface IScroll {
	x: number;
	y: number;
}

interface IVisible {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
}

export class DOMService {
	public static IDLE_INTERVAL = 10000;

	idleTime = 0;

	IS_TOUCH_DEVICE = ('ontouchstart' in window || navigator.maxTouchPoints);
	IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	IS_WINDOWS = navigator.platform.indexOf('Win') > -1;
	IS_LINUX = navigator.appVersion.indexOf("Linux") > -1;
	IS_IOS = navigator.userAgent && navigator.userAgent.search(/iPad|iPhone|iPod/) !== -1 && !(window as any).MSStream;
	IS_FIREFOX: boolean;
	IS_CHROME: boolean;
	IS_IE: boolean;
	IS_EDGE: boolean;
	IS_SAFARI: boolean;

	KEYCODES = {
		COMMAND: 0, // will be assigned later
		BACKSPACE: 8,
		TAB: 9,
		ENTER: 13,
		SHIFT: 16,
		CTRL: 17,
		ALT: 18,
		ESCAPE: 27,
		SPACE: 32,
		PG_UP: 33,
		PG_DN: 34,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		DEL: 46,
		NUM_0: 48,
		NUM_1: 49,
		A: 65,
		C: 67,
		D: 68,
		E: 69,
		F: 70,
		G: 71,
		L: 76,
		P: 80,
		U: 85,
		V: 86,
		X: 88,
		Z: 90,
		NUMPAD_0: 96,
		NUMPAD_1: 97,
		ADD: 107,
		SUBTRACT: 109,
		F2: 113,
		SEMI_COLON: 186,
		EQUAL: 187,
		COMMA: 188,
		DASH: 189,
	};

	viewport: IViewport = {
		w: 0,
		h: 0
	};

	scroll: IScroll = {
		x: 0,
		y: 0,
	};

	visible: IVisible = {
		x1: 0,
		x2: 0,
		y1: 0,
		y2: 0,
	};

	private _SCROLLBAR_WIDTH: number;

	constructor() {
		if (!!(window as any).chrome && !!(window as any).chrome.webstore) {
			this.IS_CHROME = true;
		} else if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
			this.IS_FIREFOX = true;
		} else if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/))) {
			this.IS_IE = true;
		} else if (navigator.userAgent.indexOf('Edge/') > -1) {
			this.IS_EDGE = true;
		} else if (!!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)) {
			this.IS_SAFARI = true;
		}

		if (this.IS_FIREFOX) {
			this.KEYCODES.EQUAL = 61;
			this.KEYCODES.DASH = 173;
			this.KEYCODES.SEMI_COLON = 59;
		}

		document.addEventListener('keydown', this.onDocumentKeyDown.bind(this));
		document.addEventListener('keyup', this.onDocumentKeyUp.bind(this));
		document.addEventListener('pointermove', this.onDocumentPointerMove.bind(this));
		document.addEventListener('pointerdown', this.onDocumentPointerDown.bind(this));
		document.addEventListener('pointerup', this.onDocumentPointerUp.bind(this));
		document.addEventListener('scroll', this.onDocumentScroll.bind(this));
		window.addEventListener('resize', this.onWindowResize.bind(this));
		window.addEventListener('blur', this.onWindowBlur.bind(this));

		setInterval(() => {
			this.idleTime += DOMService.IDLE_INTERVAL;
		}, DOMService.IDLE_INTERVAL);

		this.refreshViewport();
		this.refreshScroll();
	}
	
	onWindowBlur() {
		this.pressedKeys.clear();
	}

	pressedKeys = new Set();

	onDocumentKeyDown(e) {
		this.pressedKeys.add(e.keyCode);

		this.idleTime = 0;
	}

	onDocumentKeyUp(e) {
		this.pressedKeys.delete(e.keyCode);
	}

	isKeyPressed(keyCode) {
		return this.pressedKeys.has(keyCode);
	}

	onWindowResize() {
		this.refreshViewport();

		this.idleTime = 0;
	}

	onDocumentScroll() {
		this.refreshScroll();

		this.idleTime = 0;
	}

	refreshViewport() {
		// window size including scrollbar size
		this.viewport.w = Math.max(docElement.clientWidth, window.innerWidth || 0);
		this.viewport.h = Math.max(docElement.clientHeight, window.innerHeight || 0);

		this.refreshVisible();
	}

	refreshScroll() {
		this.scroll.x = window.pageXOffset || docElement.scrollLeft || body.scrollLeft;
		this.scroll.y = window.pageYOffset || docElement.scrollTop || body.scrollTop;

		this.refreshVisible();
	}

	refreshVisible() {
		this.visible.x1 = this.scroll.x;
		this.visible.x2 = this.scroll.x + this.viewport.w;

		this.visible.y1 = this.scroll.y;
		this.visible.y2 = this.scroll.y + this.viewport.h;
	}

	lastPointerMoveEvent: MouseEvent;
	pointerCoords = {
		x: 0,
		y: 0
	};

	onDocumentPointerMove(e) {
		this.lastPointerMoveEvent = e;

		this.pointerCoords.x = e.clientX;
		this.pointerCoords.y = e.clientY;

		this.idleTime = 0;
	}

	isPointerPressed = 0;
	lastPointerDownEvent: MouseEvent;

	fixEventTarget(e) {
		let originalEvent = e.srcEvent /* hammerjs */ ? e.srcEvent : e;

		if (originalEvent.composed) { // event came fro shadow dom
			let target = originalEvent.composedPath()[0];

			// https://stackoverflow.com/a/49122553/5385623
			Object.defineProperty(e, 'target', {writable: false, value: target});
		}
	}

	onDocumentPointerDown(e) {
		this.fixEventTarget(e);

		this.lastPointerDownEvent = e;

		this.isPointerPressed++;

		this.idleTime = 0;
	}

	onDocumentPointerUp(e) {
		this.isPointerPressed = Math.min(0, this.isPointerPressed);
	}

	listen(elem: HTMLElement | Window, type: keyof HTMLElementEventMap, handler, options?: Listener.IOptions) {
		return new Listener(elem, type, handler, options);
	}

	getOffset(el) {
		const rect = el.getBoundingClientRect();

		return {
			top: rect.top + this.scroll.y,
			left: rect.left + this.scroll.x
		};
	}

	getOffsetFromVisible(elem, params: { width?: number, height?: number } = {}) {
		const rect = elem.getBoundingClientRect();
		const { width = elem.offsetWidth, height = elem.offsetHeight } = params;

		return {
			left: rect.left,
			top: rect.top,
			right: this.viewport.w - rect.left - width,
			bottom: this.viewport.h - rect.top - height,
		}
	}

	createSVGElem(nodeName: string) {
		return document.createElementNS("http://www.w3.org/2000/svg", nodeName);
	}

	refreshScrollbarWidth() {
		let outer = document.createElement("div");

		outer.style.visibility = "hidden";
		outer.style.width = "100px";
		outer.style.msOverflowStyle = "scrollbar";

		outer.classList.add('scroll');

		body.appendChild(outer);

		let widthNoScroll = outer.offsetWidth;

		outer.style.overflow = "scroll";

		let inner = document.createElement("div");

		inner.style.width = "100%";
		outer.appendChild(inner);

		let widthWithScroll = inner.offsetWidth;

		outer.parentNode.removeChild(outer);

		this._SCROLLBAR_WIDTH = widthNoScroll - widthWithScroll;
	}

	getScrollbarWidth() {
		if (typeof this._SCROLLBAR_WIDTH === 'undefined') {
			this.refreshScrollbarWidth();
		}

		return this._SCROLLBAR_WIDTH;
	}

	isCtrl(e): boolean {
		e = this.getSourceEvent(e);

		return this.IS_MAC ? e.metaKey : e.ctrlKey;
	}

	isShift(e): boolean {
		return this.getSourceEvent(e).shiftKey;
	}

	getSourceEvent(e) {
		return e.srcEvent /** hammerjs event **/ ? e.srcEvent : e;
	}

	preloadImage(url: string): Promise<any> {
		return new Promise((resolve) => {
			let image = new Image();

			image.onload = () => {
				resolve(image);
			};

			image.src = url; // this must be done AFTER setting onload
		});
	}

	getImageSize(url: string): Promise<any> {
		return this.preloadImage(url).then(image => {
			return {
				width: image.width,
				height: image.height,
			};
		});
	}

	forceLayout(element = body) { // dirty hack for forcing layout
		element.offsetWidth;
	}

	getSelectedTextElement() {
		let node;

		try {
			let anchorNode = window.getSelection().anchorNode;

			if (anchorNode) {
				node = anchorNode.parentNode;
			}
		} catch (e) {
			// IE8-
			node = (document as any).selection.createRange().parentElement();
		}

		return node;
	}

	applyFileReader(input, callback) {
		let file = input.files[0];
		let reader = new FileReader();

		reader.onload = (event) => {
			callback(event);
		};

		reader.onerror = (event: any) => {
			console.error(event.target.error);
		};

		reader.readAsDataURL(file);
	}


	getBrowserInfo() {
		let ua = navigator.userAgent, tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

		if (M[1] && M[1].search(/trident/i) !== -1) {
			tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
			return {name: 'IE', version: (tem[1] || '')};
		}

		if (M[1] === 'Chrome') {
			tem = ua.match(/\bOPR\/(\d+)/);

			if (tem != null) {
				return {name: 'Opera', version: tem[1]};
			}
		}

		M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];

		if ((tem = ua.match(/version\/(\d+)/i)) != null) {
			M.splice(1, 1, tem[1]);
		}

		return {
			name: M[0],
			version: M[1]
		};
	}

	getCSSRuleValue(cls: string, prop: string) {
		let elem = document.createElement('DIV');
		let result;

		elem.className = `hide ${cls}`;

		body.appendChild(elem);

		result = parseFloat(getComputedStyle(elem)[prop]);

		body.removeChild(elem);

		return result;
	}

	enableFullScreen() {
		let doc: any = document.documentElement;

		if (doc.requestFullScreen) {
			doc.requestFullScreen();
		} else if (doc.mozRequestFullScreen) {
			doc.mozRequestFullScreen();
		} else if (doc.webkitRequestFullScreen) {
			doc.webkitRequestFullScreen();
		} else if (doc.msRequestFullscreen) {
			doc.msRequestFullscreen();
		}
	}

	disableFullScreen() {
		let doc: any = document;

		if (doc.cancelFullScreen) {
			doc.cancelFullScreen();
		} else if (doc.mozCancelFullScreen) {
			doc.mozCancelFullScreen();
		} else if (doc.webkitCancelFullScreen) {
			doc.webkitCancelFullScreen();
		}else if (doc.msExitFullscreen) {
			doc.msExitFullscreen();
		}
	}

	isFullScreenAvailable() {
		let doc: any = document;

		return doc.documentElement.requestFullScreen || doc.documentElement.mozRequestFullScreen || doc.documentElement.webkitRequestFullScreen || doc.documentElement.msRequestFullScreen;
	}

	isFullScreenEnabled() {
		let doc: any = document;

		return doc.fullscreenEnabled || doc.mozFullscreenEnabled || doc.webkitIsFullScreen || doc.msIsFullScreen;
	}

	isFile(obj) {
		return toString.call(obj) === '[object File]';
	}

	isObject(value) {
		let type = typeof value;

		return value != null && (type == 'object' || type == 'function');
	}

	convertToFormData(data) {
		// this function can't convert deep objects
		// you can use JSON.stringify for them

		let fd = new FormData();

		for (let key in data) {
			let val = data[key];
			let type = typeof val;

			if (type === 'string' || type === 'number' || (type === 'boolean' && val) || this.isFile(val)) {
				fd.append(key, val);
			} else if (Array.isArray(val)) {
				val.forEach(function (innerVal: any, innerKey) {
					fd.append(key + '[]', innerVal);
				});
			} else if (this.isObject(val)) {
				for (let innerKey in val) {
					let innerVal = val[innerKey];

					fd.append(key + '[' + innerKey + ']', innerVal);
				}
			}
		}
		return fd;
	}

	isRightMouseButtonEvent(event) {
		return event.which === 3;
	}

	matches(el, selector) {
		return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector);
	}

	isRetinaDisplay() {
		if (window.matchMedia) {
			let  mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");

			return (mq && mq.matches || (window.devicePixelRatio > 1));
		}
	}

	// https://stackoverflow.com/a/979995/5385623
	parseQueryString(query): any {
		let vars = query.split("&");
		let query_string = {};

		for (let i = 0; i < vars.length; i++) {
			let pair = vars[i].split("=");
			let key = decodeURIComponent(pair[0]);
			let value = decodeURIComponent(pair[1]);
			// If first entry with this name
			if (typeof query_string[key] === "undefined") {
				query_string[key] = decodeURIComponent(value);
				// If second entry with this name
			} else if (typeof query_string[key] === "string") {
				let arr = [query_string[key], decodeURIComponent(value)];
				query_string[key] = arr;
				// If third or later entry with this name
			} else {
				query_string[key].push(decodeURIComponent(value));
			}
		}

		return query_string;
	}
}
