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
	IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
	IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
	IS_TOUCH_DEVICE = ('ontouchstart' in window || navigator.maxTouchPoints);
	KEYCODES = {
		BACKSPACE: 8,
		TAB: 9,
		ENTER: 13,
		CTRL: 17,
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
		if (this.IS_FIREFOX) {
			this.KEYCODES.EQUAL = 61;
			this.KEYCODES.DASH = 173;
			this.KEYCODES.SEMI_COLON = 59;
		}

		document.addEventListener('pointermove', this.onDocumentPointerMove.bind(this));
		document.addEventListener('pointerdown', this.onDocumentPointerDown.bind(this));
		document.addEventListener('pointerup', this.onDocumentPointerUp.bind(this));
		document.addEventListener('scroll', this.onDocumentScroll.bind(this));
		window.addEventListener('resize', this.onWindowResize.bind(this));

		this.refreshViewport();
		this.refreshScroll();
	}

	onWindowResize() {
		this.refreshViewport();
	}

	onDocumentScroll() {
		this.refreshScroll();
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
	}

	isPointerPressed = 0;

	onDocumentPointerDown() {
		this.isPointerPressed++;
	}

	onDocumentPointerUp() {
		this.isPointerPressed = Math.min(0, this.isPointerPressed);
	}

	listen(elem: HTMLElement | Window, event: string, handler, options?: Listener.IOptions) {
		return new Listener(elem, event, handler, options);
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

	getScrollbarWidth() {
		if (typeof this._SCROLLBAR_WIDTH === 'undefined') {
			let outer = document.createElement("div");

			outer.style.visibility = "hidden";
			outer.style.width = "100px";
			outer.style.msOverflowStyle = "scrollbar";

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

		return this._SCROLLBAR_WIDTH;
	}

	isCtrl(e): boolean {
		return e.ctrlKey || (e.metaKey && this.IS_MAC);
	}

	getImageSize(url: string): Promise<any> {
		return new Promise((resolve) => {
			let newImg = new Image();

			newImg.onload = () => {
				resolve({
					width: newImg.width,
					height: newImg.height,
				});
			};

			newImg.src = url; // this must be done AFTER setting onload
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

		if (/trident/i.test(M[1])) {
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

	enableFullScreen(elem) {
		if (elem.requestFullScreen) {
			elem.requestFullScreen();
		} else if (elem.mozRequestFullScreen) {
			elem.mozRequestFullScreen();
		} else if (elem.webkitRequestFullScreen) {
			elem.webkitRequestFullScreen();
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
		}
	}

	isFullScreenAvailable() {
		let doc: any = document;

		return doc.documentElement.requestFullScreen || doc.documentElement.mozRequestFullScreen || doc.documentElement.webkitRequestFullScreen;
	}

	isFullScreenEnabled() {
		let doc: any = document;

		return doc.fullscreenEnabled || doc.mozFullscreenEnabled || doc.webkitIsFullScreen;
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

}
