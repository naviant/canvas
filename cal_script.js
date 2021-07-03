console.log("cal_script loadet");
var _global = typeof window === 'object' && window.window === window
  ? window : typeof self === 'object' && self.self === self
  ? self : typeof global === 'object' && global.global === global
  ? global
  : this

function bom (blob, opts) {
  if (typeof opts === 'undefined') opts = { autoBom: false }
  else if (typeof opts !== 'object') {
    console.warn('Deprecated: Expected third argument to be a object')
    opts = { autoBom: !opts }
  }

  // prepend BOM for UTF-8 XML and text/* types (including HTML)
  // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
  if (opts.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
    return new Blob([String.fromCharCode(0xFEFF), blob], { type: blob.type })
  }
  return blob
}

function download (url, name, opts) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', url)
  xhr.responseType = 'blob'
  xhr.onload = function () {
    saveAs(xhr.response, name, opts)
  }
  xhr.onerror = function () {
    console.error('could not download file')
  }
  xhr.send()
}

function corsEnabled (url) {
  var xhr = new XMLHttpRequest()
  // use sync to avoid popup blocker
  xhr.open('HEAD', url, false)
  try {
    xhr.send()
  } catch (e) {}
  return xhr.status >= 200 && xhr.status <= 299
}

// `a.click()` doesn't work for all browsers (#465)
function click (node) {
  try {
    node.dispatchEvent(new MouseEvent('click'))
  } catch (e) {
    var evt = document.createEvent('MouseEvents')
    evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80,
                          20, false, false, false, false, 0, null)
    node.dispatchEvent(evt)
  }
}

// Detect WebView inside a native macOS app by ruling out all browsers
// We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
// https://www.whatismybrowser.com/guides/the-latest-user-agent/macos
var isMacOSWebView = _global.navigator && /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent)

var saveAs = _global.saveAs || (
  // probably in some web worker
  (typeof window !== 'object' || window !== _global)
    ? function saveAs () { /* noop */ }

  // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView
  : ('download' in HTMLAnchorElement.prototype && !isMacOSWebView)
  ? function saveAs (blob, name, opts) {
    var URL = _global.URL || _global.webkitURL
    var a = document.createElement('a')
    name = name || blob.name || 'download'

    a.download = name
    a.rel = 'noopener' // tabnabbing

    // TODO: detect chrome extensions & packaged apps
    // a.target = '_blank'

    if (typeof blob === 'string') {
      // Support regular links
      a.href = blob
      if (a.origin !== location.origin) {
        corsEnabled(a.href)
          ? download(blob, name, opts)
          : click(a, a.target = '_blank')
      } else {
        click(a)
      }
    } else {
      // Support blobs
      a.href = URL.createObjectURL(blob)
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 4E4) // 40s
      setTimeout(function () { click(a) }, 0)
    }
  }

  // Use msSaveOrOpenBlob as a second approach
  : 'msSaveOrOpenBlob' in navigator
  ? function saveAs (blob, name, opts) {
    name = name || blob.name || 'download'

    if (typeof blob === 'string') {
      if (corsEnabled(blob)) {
        download(blob, name, opts)
      } else {
        var a = document.createElement('a')
        a.href = blob
        a.target = '_blank'
        setTimeout(function () { click(a) })
      }
    } else {
      navigator.msSaveOrOpenBlob(bom(blob, opts), name)
    }
  }

  // Fallback to using FileReader and a popup
  : function saveAs (blob, name, opts, popup) {
    // Open a popup immediately do go around popup blocker
    // Mostly only available on user interaction and the fileReader is async so...
    popup = popup || open('', '_blank')
    if (popup) {
      popup.document.title =
      popup.document.body.innerText = 'downloading...'
    }

    if (typeof blob === 'string') return download(blob, name, opts)

    var force = blob.type === 'application/octet-stream'
    var isSafari = /constructor/i.test(_global.HTMLElement) || _global.safari
    var isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent)

    if ((isChromeIOS || (force && isSafari) || isMacOSWebView) && typeof FileReader !== 'undefined') {
      // Safari doesn't allow downloading of blob URLs
      var reader = new FileReader()
      reader.onloadend = function () {
        var url = reader.result
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, 'data:attachment/file;')
        if (popup) popup.location.href = url
        else location = url
        popup = null // reverse-tabnabbing #460
      }
      reader.readAsDataURL(blob)
    } else {
      var URL = _global.URL || _global.webkitURL
      var url = URL.createObjectURL(blob)
      if (popup) popup.location = url
      else location.href = url
      popup = null // reverse-tabnabbing #460
      setTimeout(function () { URL.revokeObjectURL(url) }, 4E4) // 40s
    }
  }
)

_global.saveAs = saveAs.saveAs = saveAs

if (typeof module !== 'undefined') {
  module.exports = saveAs;
}
     
 
    (function() {
  const out$ = typeof exports != 'undefined' && exports || typeof define != 'undefined' && {} || this || window;
  if (typeof define !== 'undefined') define('save-svg-as-png', [], () => out$);
  out$.default = out$;

  const xmlNs = 'http://www.w3.org/2000/xmlns/';
  const xhtmlNs = 'http://www.w3.org/1999/xhtml';
  const svgNs = 'http://www.w3.org/2000/svg';
  const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
  const urlRegex = /url\(["']?(.+?)["']?\)/;
  const fontFormats = {
    woff2: 'font/woff2',
    woff: 'font/woff',
    otf: 'application/x-font-opentype',
    ttf: 'application/x-font-ttf',
    eot: 'application/vnd.ms-fontobject',
    sfnt: 'application/font-sfnt',
    svg: 'image/svg+xml'
  };

  const isElement = obj => obj instanceof HTMLElement || obj instanceof SVGElement;
  const requireDomNode = el => {
    if (!isElement(el)) throw new Error(`an HTMLElement or SVGElement is required; got ${el}`);
  };
  const requireDomNodePromise = el =>
    new Promise((resolve, reject) => {
      if (isElement(el)) resolve(el)
      else reject(new Error(`an HTMLElement or SVGElement is required; got ${el}`));
    })
  const isExternal = url => url && url.lastIndexOf('http',0) === 0 && url.lastIndexOf(window.location.host) === -1;

  const getFontMimeTypeFromUrl = fontUrl => {
    const formats = Object.keys(fontFormats)
      .filter(extension => fontUrl.indexOf(`.${extension}`) > 0)
      .map(extension => fontFormats[extension]);
    if (formats) return formats[0];
    console.error(`Unknown font format for ${fontUrl}. Fonts may not be working correctly.`);
    return 'application/octet-stream';
  };

  const arrayBufferToBase64 = buffer => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  const getDimension = (el, clone, dim) => {
    const v =
      (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
      (clone.getAttribute(dim) !== null && !clone.getAttribute(dim).match(/%$/) && parseInt(clone.getAttribute(dim))) ||
      el.getBoundingClientRect()[dim] ||
      parseInt(clone.style[dim]) ||
      parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return typeof v === 'undefined' || v === null || isNaN(parseFloat(v)) ? 0 : v;
  };

  const getDimensions = (el, clone, width, height) => {
    if (el.tagName === 'svg') return {
      width: width || getDimension(el, clone, 'width'),
      height: height || getDimension(el, clone, 'height')
    };
    else if (el.getBBox) {
      const {x, y, width, height} = el.getBBox();
      return {
        width: x + width,
        height: y + height
      };
    }
  };

  const reEncode = data =>
    decodeURIComponent(
      encodeURIComponent(data)
        .replace(/%([0-9A-F]{2})/g, (match, p1) => {
          const c = String.fromCharCode(`0x${p1}`);
          return c === '%' ? '%25' : c;
        })
    );

  const uriToBlob = uri => {
    const byteString = window.atob(uri.split(',')[1]);
    const mimeString = uri.split(',')[0].split(':')[1].split(';')[0]
    const buffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([buffer], {type: mimeString});
  };

  const query = (el, selector) => {
    if (!selector) return;
    try {
      return el.querySelector(selector) || el.parentNode && el.parentNode.querySelector(selector);
    } catch(err) {
      console.warn(`Invalid CSS selector "${selector}"`, err);
    }
  };

  const detectCssFont = (rule, href) => {
    // Match CSS font-face rules to external links.
    // @font-face {
    //   src: local('Abel'), url(https://fonts.gstatic.com/s/abel/v6/UzN-iejR1VoXU2Oc-7LsbvesZW2xOQ-xsNqO47m55DA.woff2);
    // }
    const match = rule.cssText.match(urlRegex);
    const url = (match && match[1]) || '';
    if (!url || url.match(/^data:/) || url === 'about:blank') return;
    const fullUrl =
      url.startsWith('../') ? `${href}/../${url}`
      : url.startsWith('./') ? `${href}/.${url}`
      : url;
    return {
      text: rule.cssText,
      format: getFontMimeTypeFromUrl(fullUrl),
      url: fullUrl
    };
  };

  const inlineImages = el => Promise.all(
    Array.from(el.querySelectorAll('image')).map(image => {
      let href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || image.getAttribute('href');
      if (!href) return Promise.resolve(null);
      if (isExternal(href)) {
        href += (href.indexOf('?') === -1 ? '?' : '&') + 't=' + new Date().valueOf();
      }
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = href;
        img.onerror = () => reject(new Error(`Could not load ${href}`));
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL('image/png'));
          resolve(true);
        };
      });
    })
  );

  const cachedFonts = {};
  const inlineFonts = fonts => Promise.all(
    fonts.map(font =>
      new Promise((resolve, reject) => {
        if (cachedFonts[font.url]) return resolve(cachedFonts[font.url]);

        const req = new XMLHttpRequest();
        req.addEventListener('load', () => {
          // TODO: it may also be worth it to wait until fonts are fully loaded before
          // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
          const fontInBase64 = arrayBufferToBase64(req.response);
          const fontUri = font.text.replace(urlRegex, `url("data:${font.format};base64,${fontInBase64}")`)+'\n';
          cachedFonts[font.url] = fontUri;
          resolve(fontUri);
        });
        req.addEventListener('error', e => {
          console.warn(`Failed to load font from: ${font.url}`, e);
          cachedFonts[font.url] = null;
          resolve(null);
        });
        req.addEventListener('abort', e => {
          console.warn(`Aborted loading font from: ${font.url}`, e);
          resolve(null);
        });
        req.open('GET', font.url);
        req.responseType = 'arraybuffer';
        req.send();
      })
    )
  ).then(fontCss => fontCss.filter(x => x).join(''));

  let cachedRules = null;
  const styleSheetRules = () => {
    if (cachedRules) return cachedRules;
    return cachedRules = Array.from(document.styleSheets).map(sheet => {
      try {
        return {rules: sheet.cssRules, href: sheet.href};
      } catch (e) {
        console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
        return {};
      }
    });
  };

  const inlineCss = (el, options) => {
    const {
      selectorRemap,
      modifyStyle,
      modifyCss,
      fonts,
      excludeUnusedCss
    } = options || {};
    const generateCss = modifyCss || ((selector, properties) => {
      const sel = selectorRemap ? selectorRemap(selector) : selector;
      const props = modifyStyle ? modifyStyle(properties) : properties;
      return `${sel}{${props}}\n`;
    });
    const css = [];
    const detectFonts = typeof fonts === 'undefined';
    const fontList = fonts || [];
    styleSheetRules().forEach(({rules, href}) => {
      if (!rules) return;
      Array.from(rules).forEach(rule => {
        if (typeof rule.style != 'undefined') {
          if (query(el, rule.selectorText)) css.push(generateCss(rule.selectorText, rule.style.cssText));
          else if (detectFonts && rule.cssText.match(/^@font-face/)) {
            const font = detectCssFont(rule, href);
            if (font) fontList.push(font);
          } else if (!excludeUnusedCss) {
            css.push(rule.cssText);
          }
        }
      });
    });

    return inlineFonts(fontList).then(fontCss => css.join('\n') + fontCss);
  };

  const downloadOptions = () => {
    if (!navigator.msSaveOrOpenBlob && !('download' in document.createElement('a'))) {
      return {popup: window.open()};
    }
  };

  out$.prepareSvg = (el, options, done) => {
    requireDomNode(el);
    const {
      left = 0,
      top = 0,
      width: w,
      height: h,
      scale = 1,
      responsive = false,
      excludeCss = false,
    } = options || {};

    return inlineImages(el).then(() => {
      let clone = el.cloneNode(true);
      clone.style.backgroundColor = (options || {}).backgroundColor || el.style.backgroundColor;
      const {width, height} = getDimensions(el, clone, w, h);

      if (el.tagName !== 'svg') {
        if (el.getBBox) {
          if (clone.getAttribute('transform') != null) {
            clone.setAttribute('transform', clone.getAttribute('transform').replace(/translate\(.*?\)/, ''));
          }
          const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
          svg.appendChild(clone);
          clone = svg;
        } else {
          console.error('Attempted to render non-SVG element', el);
          return;
        }
      }

      clone.setAttribute('version', '1.1');
      clone.setAttribute('viewBox', [left, top, width, height].join(' '));
      if (!clone.getAttribute('xmlns')) clone.setAttributeNS(xmlNs, 'xmlns', svgNs);
      if (!clone.getAttribute('xmlns:xlink')) clone.setAttributeNS(xmlNs, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

      if (responsive) {
        clone.removeAttribute('width');
        clone.removeAttribute('height');
        clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      } else {
        clone.setAttribute('width', width * scale);
        clone.setAttribute('height', height * scale);
      }

      Array.from(clone.querySelectorAll('foreignObject > *')).forEach(foreignObject => {
        foreignObject.setAttributeNS(xmlNs, 'xmlns', foreignObject.tagName === 'svg' ? svgNs : xhtmlNs);
      });

      if (excludeCss) {
        const outer = document.createElement('div');
        outer.appendChild(clone);
        const src = outer.innerHTML;
        if (typeof done === 'function') done(src, width, height);
        else return {src, width, height};
      } else {
        return inlineCss(el, options).then(css => {
          const style = document.createElement('style');
          style.setAttribute('type', 'text/css');
          style.innerHTML = `<![CDATA[\n${css}\n]]>`;

          const defs = document.createElement('defs');
          defs.appendChild(style);
          clone.insertBefore(defs, clone.firstChild);

          const outer = document.createElement('div');
          outer.appendChild(clone);
          const src = outer.innerHTML.replace(/NS\d+:href/gi, 'xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href');

          if (typeof done === 'function') done(src, width, height);
          else return {src, width, height};
        });
      }
    });
  };

  out$.svgAsDataUri = (el, options, done) => {
    requireDomNode(el);
    return out$.prepareSvg(el, options)
      .then(({src, width, height}) => {
          const svgXml = `data:image/svg+xml;base64,${window.btoa(reEncode(doctype+src))}`;
          if (typeof done === 'function') {
              done(svgXml, width, height);
          }
          return svgXml;
      });
  };

  out$.svgAsPngUri = (el, options, done) => {
    requireDomNode(el);
    const {
      encoderType = 'image/png',
      encoderOptions = 0.8,
      canvg
    } = options || {};

    const convertToPng = ({src, width, height}) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (canvg) canvg(canvas, src);
      else context.drawImage(src, 0, 0);

      let png;
      try {
        png = canvas.toDataURL(encoderType, encoderOptions);
      } catch (e) {
        if ((typeof SecurityError !== 'undefined' && e instanceof SecurityError) || e.name === 'SecurityError') {
          console.error('Rendered SVG images cannot be downloaded in this browser.');
          return;
        } else throw e;
      }
      if (typeof done === 'function') done(png, canvas.width, canvas.height);
      return Promise.resolve(png);
    }

    if (canvg) return out$.prepareSvg(el, options).then(convertToPng);
    else return out$.svgAsDataUri(el, options).then(uri => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(convertToPng({
          src: image,
          width: image.width,
          height: image.height
        }));
        image.onerror = () => {
          reject(`There was an error loading the data URI as an image on the following SVG\n${window.atob(uri.slice(26))}Open the following link to see browser's diagnosis\n${uri}`);
        }
        image.src = uri;
      })
    });
  };

  out$.download = (name, uri, options) => {
    if (navigator.msSaveOrOpenBlob) navigator.msSaveOrOpenBlob(uriToBlob(uri), name);
    else {
      const saveLink = document.createElement('a');
      if ('download' in saveLink) {
        saveLink.download = name;
        saveLink.style.display = 'none';
        document.body.appendChild(saveLink);
        try {
          const blob = uriToBlob(uri);
          const url = URL.createObjectURL(blob);
          saveLink.href = url;
          saveLink.onclick = () => requestAnimationFrame(() => URL.revokeObjectURL(url));
        } catch (e) {
          console.error(e);
          console.warn('Error while getting object URL. Falling back to string URL.');
          saveLink.href = uri;
        }
        saveLink.click();
        document.body.removeChild(saveLink);
      } else if (options && options.popup) {
        options.popup.document.title = name;
        options.popup.location.replace(uri);
      }
    }
  };

  out$.saveSvg = (el, name, options) => {
    const downloadOpts = downloadOptions(); // don't inline, can't be async
    return requireDomNodePromise(el)
      .then(el => out$.svgAsDataUri(el, options || {}))
      .then(uri => out$.download(name, uri, downloadOpts));
  };

  out$.saveSvgAsPng = (el, name, options) => {
    const downloadOpts = downloadOptions(); // don't inline, can't be async
    return requireDomNodePromise(el)
      .then(el => out$.svgAsPngUri(el, options || {}))
      .then(uri => out$.download(name, uri, downloadOpts));
  };
})();
     
 
    let inputSegments=document.getElementById('inputSegments');
    let outputSegments=document.getElementById('outputSegments');
    let inputOutRad=document.getElementById('inputOutRad');
    let outputOutRad=document.getElementById('outputOutRad');
    let inputRingWidth=document.getElementById('inputRingWidth');
    let outputRingWidth=document.getElementById('outputRingWidth');
    let inputMarginInner=document.getElementById('inputMarginInner');
    let otputMarginInner=document.getElementById('outputMarginInner');
    let inputMarginOuter=document.getElementById('inputMarginOuter');
    let outputMarginOuter=document.getElementById('outputMarginOuter');
    let button=document.getElementById('button');
    let rwm=document.getElementById('rwm');
    let mim=document.getElementById('mim');
    let check1=document.getElementById('check1');
    check1.addEventListener('change',()=>choise(1));
    let check2=document.getElementById('check2');
    check2.addEventListener('change',()=>choise(2));
    let check3=document.getElementById('check3');
    check3.addEventListener('change',()=>choise(3));
    outputSegments.value=inputSegments.value;
    outputOutRad.value=inputOutRad.value;
    outputRingWidth.value=inputRingWidth.value;
    outputMarginInner.value=inputMarginInner.value;
    outputMarginOuter.value=inputMarginOuter.value;
    let maxMarInn=Number(inputOutRad.value)-Number(inputRingWidth.value);
    inputMarginInner.setAttribute('max',String(maxMarInn));
    outputMarginInner.setAttribute('max',String(maxMarInn))
    mim.textContent=String(maxMarInn);
    inputSegments.addEventListener('input',()=>f(1));
    outputSegments.addEventListener('change',()=>f(11));
    inputOutRad.addEventListener('input',()=>f(2));
    outputOutRad.addEventListener('change',()=>f(22));
    inputRingWidth.addEventListener('input',()=>f(3));
    outputRingWidth.addEventListener('change',()=>f(33));
    inputMarginInner.addEventListener('input',()=>f(4));
    otputMarginInner.addEventListener('change',()=>f(44));
    inputMarginOuter.addEventListener('input',()=>f(5));
    outputMarginOuter.addEventListener('change',()=>f(55));
    button.addEventListener('pointerdown',save);
    let svg=document.querySelector('svg');
    let svg2=document.getElementById('svg2');   
    let circ=document.createElementNS("http://www.w3.org/2000/svg", "circle");
    let circ2=document.createElementNS("http://www.w3.org/2000/svg", "circle");
    let circ3=document.createElementNS("http://www.w3.org/2000/svg", "circle");
    let sizeLine1=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let sizeLine2=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let sizeLine3=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let sizeLine4=document.createElementNS("http://www.w3.org/2000/svg", "path"); 
    let sizeLineV=document.createElementNS("http://www.w3.org/2000/svg", "path"); 
    let sizeLineH=document.createElementNS("http://www.w3.org/2000/svg", "path"); 
    let offline1=document.createElementNS("http://www.w3.org/2000/svg", "path"); 
    let point0=document.createElementNS("http://www.w3.org/2000/svg", "circle"); 
    let point1=document.createElementNS("http://www.w3.org/2000/svg", "circle"); 
    let point2=document.createElementNS("http://www.w3.org/2000/svg", "circle"); 
    let point3=document.createElementNS("http://www.w3.org/2000/svg", "circle"); 
    let point4=document.createElementNS("http://www.w3.org/2000/svg", "circle");
    let point5=document.createElementNS("http://www.w3.org/2000/svg", "circle");   
    let point6=document.createElementNS("http://www.w3.org/2000/svg", "circle"); 
    let point7=document.createElementNS("http://www.w3.org/2000/svg", "circle"); 
    let fillPoly=document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    let seg=document.createElementNS("http://www.w3.org/2000/svg", "polygon"); 
    let svg2arc=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let svg2arc2=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let offline2=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let svg1sizeText1=document.createElementNS("http://www.w3.org/2000/svg", "text");
    let svg1sizeText2=document.createElementNS("http://www.w3.org/2000/svg", "text");
    let svg2sizeText1=document.createElementNS("http://www.w3.org/2000/svg", "text");
    let svg2sizeText2=document.createElementNS("http://www.w3.org/2000/svg", "text");
    let svg2sizeText3=document.createElementNS("http://www.w3.org/2000/svg", "text");
    let svg2sizeText4=document.createElementNS("http://www.w3.org/2000/svg", "text");
    let svg2sizeText5=document.createElementNS("http://www.w3.org/2000/svg", "text");   
    let svg2sizeLine1=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let svg2sizeLine2=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let svg2sizeLine3=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let svg2sizeLine4=document.createElementNS("http://www.w3.org/2000/svg", "path");
    let svg2sizeLine5=document.createElementNS("http://www.w3.org/2000/svg", "path"); 
    let svgGroup=document.createElementNS("http://www.w3.org/2000/svg", "g"); 
    let group=document.createElementNS("http://www.w3.org/2000/svg", "g"); 
    fillPoly.setAttribute('id','fillPoly');
    svgGroup.setAttribute('transform','translate(0,-30)');
    svg.append(svgGroup);    
    svgGroup.append(fillPoly);    
    svgGroup.append(group);
    svgGroup.append(circ);
    svgGroup.append(circ2);
    svgGroup.append(circ3);
    svgGroup.append(sizeLine1);
    svgGroup.append(sizeLine2);
    svgGroup.append(sizeLine3);
    svgGroup.append(sizeLine4);
    svgGroup.append(sizeLineV);
    svgGroup.append(sizeLineH);    
    svgGroup.append(svg1sizeText1);
    svgGroup.append(svg1sizeText2);
    svgGroup.append(offline1);
    svgGroup.append(point1);
    svgGroup.append(point2);
    svgGroup.append(point3);
    svgGroup.append(point4);
    svgGroup.append(point5);
    svgGroup.append(point0);  
    svgGroup.append(point6);  
    svgGroup.append(point7);
    svg2.append(seg);
    svg2.append(svg2arc);
    svg2.append(svg2arc2);
    svg2.append(offline2);
    svg2.append(svg2sizeText1);
    svg2.append(svg2sizeText2);
    svg2.append(svg2sizeText3);
    svg2.append(svg2sizeText4);
    svg2.append(svg2sizeText5);
    svg2.append(svg2sizeLine1);
    svg2.append(svg2sizeLine2);
    svg2.append(svg2sizeLine3);
    svg2.append(svg2sizeLine4);
    svg2.append(svg2sizeLine5);
    //*************************************************
    let choiseFlag=1;
    let choiseList=[check1,check2,check3];
    function choise(n){
        choiseList[choiseFlag-1].checked=false;
        if(n==1){
            choiseFlag=1;
            check1.checked=true;
        }else if(n==2){
            choiseFlag=2;
            check2.checked=true;
        }else{
            choiseFlag=3;
            check3.checked=true;
        }
    }
    function save(){
        if(check1.checked){
            let pic=document.createElementNS("http://www.w3.org/2000/svg",'svg');
            let outR=Number(inputOutRad.value);
            let ringW=Number(inputRingWidth.value);
            let width=forSave1x1[0];
            let height=forSave1x1[1];
            let angle=360/nSeg*Math.PI/180;
            let path=document.createElementNS("http://www.w3.org/2000/svg",'path');
            let yoffset=(height-ringW)/2;
            let x1=round(width/2-Math.sin(angle/2)*(outR-ringW));
            let x2=round(width/2-Math.sin(angle/2)*(outR));
            let x3=round(width/2+Math.sin(angle/2)*(outR-ringW));
            let x4=round(width/2+Math.sin(angle/2)*(outR));
            let y1=round(Math.cos(angle/2)*(outR-ringW));
            let y2=round(Math.cos(angle/2)*(outR))-y1;
            let arc1=myArc(width/2,yoffset-y1,outR-ringW,angle);
            let arc2=myArc(width/2,yoffset-y1,outR,angle);
            let lines='M'+x1+' '+yoffset+' L'+x2+' '+(yoffset+y2)+' M'+x3+' '+yoffset+' L'+x4+' '+(yoffset+y2);
            path.setAttribute('d',(arc1+arc2+lines));
            path.setAttribute('style','fill:none');
            path.setAttribute('stroke','black');
            pic.append(path);
            let svgDoc = '<svg width=\''+width+'mm\' height=\''+height+'mm\' viewBox="0 0 '+width+' '+height+'" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" >'+pic.innerHTML+'</svg>'
            let file = new File([svgDoc], (fileName+'.svg'), {type: "image/svg+xml"});
            saveAs(file);
        }else if(check2.checked){
            let outR=Number(inputOutRad.value);
            let ringW=Number(inputRingWidth.value);
            let newImg=document.createElementNS("http://www.w3.org/2000/svg",'svg');
            newImg.setAttribute('width',(877/window.devicePixelRatio+'px'));
            newImg.setAttribute('height',(620/window.devicePixelRatio+'px'));
            let scaleK=round(877/(window.devicePixelRatio*svgL*2));
            let backGround=document.createElementNS("http://www.w3.org/2000/svg",'rect');
            backGround.setAttribute('style','fill:white');
            backGround.setAttribute('x','0');
            backGround.setAttribute('y','0');
            backGround.setAttribute('width','877');
            backGround.setAttribute('height','620');
            newImg.append(backGround);
            let svg2Group=document.createElementNS("http://www.w3.org/2000/svg",'g');
//            svg2Group.innerHTML=svg2.innerHTML.replace('url(#img1)','transparent');
            svg2Group.setAttribute('transform','translate('+svgL+','+svgL/4+')');
            let container=document.createElementNS("http://www.w3.org/2000/svg",'g');
            let scaleContainer=document.createElementNS("http://www.w3.org/2000/svg",'g');
            container.setAttribute('transform','translate('+(438/window.devicePixelRatio-svgL*scaleK)+','+(310/window.devicePixelRatio-svgL*scaleK/2)+')');
            let newPoly=fillPoly.cloneNode();
            newPoly.setAttribute('fill','transparent');
            newPoly.setAttribute('id','newPoly');            
            newImg.append(scaleContainer);
            container.append(newPoly);
            container.append(sizeLineH.cloneNode());
            container.append(sizeLineV.cloneNode());
            container.append(svg1sizeText1.cloneNode(true));
            container.append(svg1sizeText2.cloneNode(true));
            container.append(offline1.cloneNode());
            container.append(circ.cloneNode());
            container.append(circ2.cloneNode());
            container.append(circ3.cloneNode());            
            console.log('scaleK=',scaleK);
            console.log('svgL=',svgL);
            for(let i=1;i<nSeg;i++){
                        let newUse=document.createElementNS("http://www.w3.org/2000/svg", "use");
                        newUse.setAttribute('href','#newPoly');
                        newUse.setAttribute('transform-origin',svgCenter);
                        newUse.setAttribute('transform','rotate('+(360/nSeg*i)+')');
                        container.append(newUse);
                    }
            container.append(svg2Group);
            scaleContainer.append(container);
            scaleContainer.setAttribute('transform','scale('+scaleK+')');
            saveSvgAsPng(newImg,('A4_'+fileName+'.png'));
        }else{
            let pic=document.createElementNS("http://www.w3.org/2000/svg",'svg');
            let k=3.78/window.devicePixelRatio;
            let width=round(forSave1x1[0]*k);
            let height=round(forSave1x1[1]*k);
            
            pic.setAttribute('width',(width+'px'));
            pic.setAttribute('height',(height+'px'));
            console.log('width'+pic.getAttribute('width'));
            console.log('height'+pic.getAttribute('height'));
            pic.setAttribute('viewBox',('0 0 '+width+' '+height));
            
            let outR=Number(inputOutRad.value)*k;
            let ringW=Number(inputRingWidth.value)*k;
            let marginOut=Number(inputMarginOuter.value)*k;
            let angle=360/nSeg*Math.PI/180;
            let path=document.createElementNS("http://www.w3.org/2000/svg",'path');
            let rect=document.createElementNS("http://www.w3.org/2000/svg",'rect');
            rect.setAttribute('width',width);
            rect.setAttribute('height',height);
            rect.setAttribute('style','fill:white');
            let x1=round(width/2-forSave1x1[2]*k/2);
            let x2=round(width/2-forSave1x1[0]*k/2);
            let x3=round(width/2+forSave1x1[2]*k/2);
            let x4=round(width/2+forSave1x1[0]*k/2);
            let x5=round(width/2-Math.sin(angle/2)*(outR-ringW));
            let x6=round(width/2-Math.sin(angle/2)*(outR));
            let x7=round(width/2+Math.sin(angle/2)*(outR-ringW));
            let x8=round(width/2+Math.sin(angle/2)*(outR));
            let y2=height;
            let yoffset=outR+marginOut-height;
            
                
            let arc1=myArc(width/2,-yoffset,outR-ringW,angle);
            let arc2=myArc(width/2,-yoffset,outR,angle);
            
            let lines='M'+x1+' 0 L'+x2+' '+y2+' L'+x4+' '+y2+' L'+x3+' 0L'+x1+' 0';
            path.setAttribute('d',(arc1+arc2+lines));
            path.setAttribute('style','fill:none');
            path.setAttribute('stroke','black');
            pic.append(rect);
            pic.append(path);
            saveSvgAsPng(pic,(fileName+'.png'),{width:width,height:height});
        }
    }    
    function size(sizeLineEl,point,point2,value,x1,y1,x2,y2,angle,svgCenter){ 
        x1=String(x1);
        y1=String(y1);
        x2=String(x2);
        y2=String(y2);        
        sizeLineEl.setAttribute('d',('M'+x1+' '+y1+' L'+x2+
' '+y2));
        sizeLineEl.setAttribute('stroke',value);
        sizeLineEl.setAttribute('stroke-width','4');
        sizeLineEl.setAttribute('transform-origin',svgCenter);
        sizeLineEl.setAttribute('transform','rotate('+angle+')');
        if(point!=0){
        point.setAttribute('cx',x1);
        point.setAttribute('cy',y1);
        point.setAttribute('r','4');
        point.setAttribute('fill',value);
        point.setAttribute('stroke','white');
        point.setAttribute('transform-origin',svgCenter);
        point.setAttribute('transform','rotate('+angle+')');}
        if(point2!=0){
        point2.setAttribute('cx',x2);
        point2.setAttribute('cy',y2);
        point2.setAttribute('r','4');
        point2.setAttribute('fill',value);
        point2.setAttribute('stroke','white');
        point2.setAttribute('transform-origin',svgCenter);
        point2.setAttribute('transform','rotate('+angle+')');}
    }
    function size2(sizeLineEl,textEl,value,x1,y1,x2,y2,k){
        //   sizeLineEl,textEl - svg эл-ты path и text;
        if(value==0){
            textEl.textContent='';
            sizeLineEl.setAttribute('d','');
            return;
        }
        let angle=Math.atan((y2-y1)/(x2-x1));
        let angle1=angle+10*Math.PI/180;
        let angle2=angle-10*Math.PI/180;
        if(value==-1){
            value=x2-x1;
        }
        if(value==-2){
            value=y2-y1;
        }
        if (value<20){
            let nx=x1;
            let ny=y1;
            x1=x2;x2=nx;y1=y2;y2=ny;
        }
        if(k!=0){value/=k}
        let x3=8*Math.cos(angle1)+x1;
        let y3=8*Math.sin(angle1)+y1;
        let x4=8*Math.cos(angle2)+x1;
        let y4=8*Math.sin(angle2)+y1;
        let x5=x2-8*Math.cos(angle1);
        let y5=y2-8*Math.sin(angle1);
        let x6=x2-8*Math.cos(angle2);
        let y6=y2-8*Math.sin(angle2);        
        value=round(value,p=10);
        textEl.textContent=value;
        textEl.setAttribute('text-anchor','middle');
        textEl.setAttribute('x',String((x1+x2)/2));
        textEl.setAttribute('y',String((y1+y2)/2)-3);
        if(round(angle*100)==157){
            textEl.setAttribute('y',String((y1+y2)/2+3));
        }
        textEl.setAttribute('transform-origin',String((x1+x2)/2+5)+'px '+String((y1+y2)/2+3)+'px');
        textEl.setAttribute('transform','rotate('+String(angle/Math.PI*180)+')');
        textEl.setAttribute('font-size','14');
        sizeLineEl.setAttribute('d',('M'+x1+' '+y1+' L'+x3+' '+y3+' L'+x4+' '+y4+' Z L'+x2+' '+y2+'M'+x2+' '+y2+' L'+x5+' '+y5+' L'+x6+' '+y6+'Z'));
        sizeLineEl.setAttribute('stroke','black');
    }
    function myArc(xc,yc,r,angle){
//возвращает строку для отрисовки дуги в svg path;            
        let xstart=round(xc+Math.sin(angle/2)*r);
        let ystart=round(yc+Math.cos(angle/2)*r);
        let xend=round(xc-Math.sin(angle/2)*r);
        let yend=ystart;
        return ('M'+xstart+' '+ystart+' A '+r+' '+r+' 0 0 1 '+xend+' '+yend+' ');
        }
    
    let deviceK=round(Math.sqrt(window.devicePixelRatio));
    function svgSize(svg,fl=1){
        let w=Number(svg.getAttribute('width').slice(0,-2));
        if((w*(deviceK))>(window.innerWidth/2)){
            w=round((window.innerWidth/2));
        }else{
            w=round(w*(deviceK));
        }
        svg.setAttribute('width',(w+'px'));
        if(fl){svg.setAttribute('height',(w+'px'))}
        else{svg.setAttribute('height',(w*0.7+'px'))}
        
    }
    svgSize(svg);
    svgSize(svg2,0);
 
    let svgL=Number(svg.getAttribute('width').slice(0,-2));
    let x=svgL/2;
    let r=x-40;
    let outRmax=Number(inputOutRad.getAttribute('max'));
    let marginOutMax=Number(inputMarginOuter.getAttribute('max'));
    let nSeg=Number(inputSegments.value);
    let angle=360/nSeg*Math.PI/180;    
    let kMin=(r*Math.cos(1.57/2))/(outRmax+marginOutMax);
    let imgSizeMin=round(2*r/1.41);
    let forSave1x1;
    let k;
    let svgCenter;
    let fileName;
    function Draw(){
        let x=svgL/2;
        let y=x;
        group.innerHTML='';        
        nSeg=Number(inputSegments.value);
        let outR=Number(inputOutRad.value);
        let ringW=Number(inputRingWidth.value);
        fileName=(String(nSeg)+'seg_'+outR+'outR_'+ringW+'width');
        let marginInn=Number(inputMarginInner.value);
        let marginOut=Number(inputMarginOuter.value);           
        let angle=360/nSeg*Math.PI/180;
        k=(r*Math.cos(angle/2))/(outR+marginOut);     
        let innR=outR-ringW;
        let r2=innR-marginInn;
        let H;
        let V=(outR+marginOut)*2;
        let x1l1;
        let y1l1;
        let x2l1;
        let y2l1;
        let x1l2;
        let x11l2;
        let y1l2;
        let x2l2;
        let y2l2;
        if(nSeg%2==0){
            if(nSeg%4==0){
                H=(outR+marginOut)*2;
                y1l1=round(y+Math.tan(angle/2)*(outR+marginOut)*k);
                y2l1=round(V*k/2)+25+y;
            }else{
                H=(outR+marginOut)/Math.cos(angle/2)*2;
                y1l1=y;
                y2l1=round(V*k/2)+25+y;
            }
            x1l2=round(x+Math.tan(angle/2)*(outR+marginOut)*k);
            x11l2=x1l2;
            y2l2=y+round((outR+marginOut)*k)
        }else{
            H=Math.sin(Math.trunc(nSeg/2)*angle/2)*2*(outR+marginOut)/Math.cos(angle/2);
            V=outR+marginOut+(outR+marginOut)/Math.cos(angle/2);
            if((nSeg-1)%4==0){
                y1l1=round(y+Math.sin((Math.PI-angle*Math.trunc(nSeg/2))/2)*(outR+marginOut)/Math.cos(angle/2)*k);
                y2l1=round(y+(outR+marginOut)/Math.cos(angle/2)*k+25);
            }else{
                y1l1=round(y-Math.sin((Math.PI-angle*Math.trunc(nSeg/2))/2)*(outR+marginOut)/Math.cos(angle/2)*k);
                y2l1=round(y+(outR+marginOut)/Math.cos(angle/2)*k+25);
            }
            x1l2=round(x+Math.tan(angle/2)*(outR+marginOut)*k);
            x11l2=x;
            y2l2=y+(outR+marginOut)/Math.cos(angle/2)*k;
        }
        H=round(H);
        V=round(V);
        x1l1=round(x-k*H/2);
        x2l1=round(x+k*H/2);
        y1l2=y-round((outR+marginOut)*k);
        x2l2=round(x+H/2*k)+13;
        let p=`M${x1l1} ${y1l1} V${y2l1}M${x2l1} ${y1l1} V${y2l1} M${x1l2} ${y1l2} H${x2l2}M${x11l2} ${y2l2} H${x2l2}`;
        offline1.setAttribute('d',p);
        offline1.setAttribute('stroke','#8c8c8c');
        size2(sizeLineH,svg1sizeText1,H,x1l1,y2l1-3,x2l1,y2l1-3,0);
        size2(sizeLineV,svg1sizeText2,V,x2l2-3,y1l2,x2l2-3,y2l2,0);
//*************************svg2*******************
        let a=(outR+marginOut)/(Math.cos(angle/2))-outR+marginInn+ringW;
        let b=Math.tan(angle/2)*(outR+marginOut)*2;
        let l=Math.sin(angle/2)*a;
        let c=b-2*l;
        let h=Math.cos(angle/2)*a;
        forSave1x1=[round(b),round(h),round(c)];
        a*=k;
        b*=k;
        c*=k;
        l*=k;
        h*=k;
//************************************************
        outR*=k;
        innR*=k;
        marginOut*=k;
        ringW*=k;
        marginInn*=k;
        r2*=k;
        let imgSize=round(imgSizeMin*Math.sqrt(k/kMin));
//        document.getElementById('img').setAttribute('width',String(imgSize));
//        document.getElementById('img').setAttribute('height',String(imgSize));
        let cs=[x-b/2,y-outR-marginOut,x+b/2,y-outR-marginOut,x+c/2,y-outR-marginOut+h,x-c/2,y-outR-marginOut+h];
        let coors='';
        for(let i=0;i<4;i++){
            coors+=cs[i*2];
            coors+=' ';
            coors+=cs[i*2+1];
            coors+=',';
        }
        svgCenter=svgL/2+'px '+svgL/2+'px';
        coors=coors.slice(0,-1);
        fillPoly.setAttribute('points',coors);
        fillPoly.setAttribute('fill','lightgray');
        fillPoly.setAttribute('stroke','black');
        for(let i=1;i<nSeg;i++){
            let use=document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.setAttribute('href','#fillPoly');
            use.setAttribute('transform-origin',svgCenter);
            use.setAttribute('transform','rotate('+(360/nSeg*i)+')');
            group.append(use);
        }
        let s='';
        let s2='';
        let sectorPoints='';
        for(let i=0;i<nSeg;i++){
            let xp=x+r*Math.cos(angle+2*Math.PI*i/nSeg);
            let yp=y+r*Math.sin(angle+2*Math.PI*i/nSeg);
            s+=`${xp} ${yp},`;
            let xp2=x+r2*Math.cos(angle+2*Math.PI*i/nSeg);
            let yp2=y+r2*Math.sin(angle+2*Math.PI*i/nSeg);
            s2+=`${xp2} ${yp2},`;
            sectorPoints+=`M${xp} ${yp} L ${xp2} ${yp2}`;
        }
        s=s.slice(0,-1);
        s2=s2.slice(0,-1);
        circ3.setAttribute('cx',String(x));
        circ3.setAttribute('cy',String(y));
        circ3.setAttribute('r',String(outR-ringW/2));
        circ3.setAttribute('stroke','rgba(0, 0, 0, 0.2)');
        circ3.setAttribute('stroke-width',String(ringW));
        circ3.setAttribute('fill','transparent');
        circ.setAttribute('cx',String(x));
        circ.setAttribute('cy',String(y));
        circ.setAttribute('r',String(outR));
        circ.setAttribute('stroke','black');
        circ.setAttribute('fill','none');
        circ.setAttribute('stroke-width','1');
        circ2.setAttribute('cx',String(x));
        circ2.setAttribute('cy',String(y));
        circ2.setAttribute('r',String(innR));
        circ2.setAttribute('stroke','black');
        circ2.setAttribute('fill','none');
        circ2.setAttribute('stroke-width','1');
        size(sizeLine1,point0,point1,'#ff3300',x,y,x+outR,y,-150,svgCenter);//центр-внешний радиус
        size(sizeLine2,point2,point3,'#00e600',x-outR,y,x-outR+ringW,y,10,svgCenter);
        size(sizeLine3,point4,point5,'#0099ff',x-outR+ringW,y,x-outR+ringW+marginInn,y,90+360/nSeg/2,svgCenter);
        size(sizeLine4,point6,point7,'#cc6600',x,y-outR,x,y-outR-marginOut,360/nSeg,svgCenter);
//*************************svg2*******************
        
        x=Number(svg2.getAttribute('width').slice(0,-2))/2;//(svg2L/2);
        y=x*0.7;
        if(nSeg<6){x=x-10}
        cs=[x-b/2,y+h/2,x-c/2,y-h/2,x+c/2,y-h/2,x+b/2,y+h/2];
        coors='';
        for(let i=0;i<4;i++){
            coors+=cs[i*2];
            coors+=' ';
            coors+=cs[i*2+1];
            coors+=',';
        }
        let xoffset=0;
        coors=coors.slice(0,-1);
        seg.setAttribute('points',coors);
        seg.setAttribute('fill','lightgray');
        seg.setAttribute('stroke','black');
        let yoffset=h/2-b/2/Math.tan(angle/2);
        svg2arc.setAttribute('d',myArc(x,y+yoffset,outR,angle)+myArc(x,y+yoffset,outR-ringW,angle));
        svg2arc.setAttribute('stroke','black');
        svg2arc.setAttribute('fill','transparent');
        svg2arc2.setAttribute('d',myArc(x,y+yoffset,outR-ringW/2,angle));
        svg2arc2.setAttribute('stroke','rgba(0, 0, 0, 0.2)');
        svg2arc2.setAttribute('stroke-width',String(ringW));
        svg2arc2.setAttribute('fill','transparent');
        let offcoors=myArc(x,y+yoffset,outR-ringW,angle).slice(1).split(' ');
        
        let iw='';
        if(c<0.1){
            size2(svg2sizeLine1,svg2sizeText1,0,0,0,0,0,k);
        }else{
            iw='M '+(x-c/2)+' '+(y-h/2)+' v -15 M '+(x+c/2)+' '+(y-h/2)+' v -15';
        size2(svg2sizeLine1,svg2sizeText1,-1,x-c/2-xoffset,y-h/2-15+3,x+c/2-xoffset,y-h/2-15+3,k);
        }
                
        let yoffset2=-35-Math.cos(angle/2)*marginInn;
        
        let iraw='';
        if (marginInn<0.1){
            size2(svg2sizeLine2,svg2sizeText2,0,0,0,0,0,k);
        }else{
            iraw=' M '+offcoors[0]+' '+offcoors[1]+' v '+yoffset2+' M '+offcoors[8]+' '+offcoors[9]+' v '+yoffset2;
            size2(svg2sizeLine2,svg2sizeText2,-1,Number(offcoors[8])-xoffset,Number(offcoors[1])+yoffset2+3,Number(offcoors[0])-xoffset,Number(offcoors[9])+yoffset2+3,k);
        }
        
        let segh=' M '+(x+c/2)+' '+(y-h/2)+' h '+(b/2-c/2+18)+' M '+(x+b/2)+' '+(y+h/2)+' h '+18;
        size2(svg2sizeLine3,svg2sizeText3,-2,-xoffset+15+x+b/2,y-h/2,-xoffset+15+x+b/2,y+h/2,k);
        offcoors=myArc(x,y+yoffset,outR,angle).slice(1).split(' ');
        yoffset=23+((outR+marginOut)/Math.cos(angle/2)-outR)*Math.cos(angle/2);
        let oraw=' M '+offcoors[0]+' '+offcoors[1]+' v '+(yoffset)+' M '+offcoors[8]+' '+offcoors[9]+' v '+(yoffset);
        size2(svg2sizeLine4,svg2sizeText4,-1,-xoffset+Number(offcoors[8]),yoffset+Number(offcoors[9])-3,-xoffset+Number(offcoors[0]),yoffset+Number(offcoors[1])-3,k);        
        let ow=' M '+(x-b/2)+' '+(y+h/2)+' v '+45+' M '+(x+b/2)+' '+(y+h/2)+' v '+45;
         offline2.setAttribute('d',iw+iraw+segh+oraw+ow);
        offline2.setAttribute('stroke','#8c8c8c');
        offline2.setAttribute('transform','translate(-'+xoffset+',0)');
        size2(svg2sizeLine5,svg2sizeText5,-1,-xoffset+x-b/2,y+h/2+45-3,x+b/2-xoffset,y+h/2+45-3,k);
    }
    Draw();
//*************************************************
    function check(outEl){
        let val=Number(outEl.value);
        let outMax=Number(outEl.getAttribute('max'));
        let outMin=Number(outEl.getAttribute('min'));
           if(val>outMax){
            outEl.value=outMax;
        }else if(val<outMin){
                    outEl.value=outMin;}
    }
    function round(val,p=100){
        return Math.round(val*p)/p;
    }
    function f(num){
        if(num<10){
            if(num==1){
            outputSegments.value=inputSegments.value;
            Draw();
        }else if(num==2){
            outputOutRad.value=inputOutRad.value;
            inputRingWidth.setAttribute('max',inputOutRad.value);
            outputRingWidth.setAttribute('max',inputOutRad.value);
            rwm.textContent=inputOutRad.value;
            if(Number(inputOutRad.value)<Number(outputRingWidth.value)){
                outputRingWidth.value=inputOutRad.value;
                inputRingWidth.value=inputOutRad.value;
                console.log('R<W');
            }
            let maxMarInn=Number(inputOutRad.value)-Number(inputRingWidth.value);
            inputMarginInner.setAttribute('max',String(maxMarInn));
            outputMarginInner.setAttribute('max',String(maxMarInn))
            mim.textContent=String(maxMarInn);
            if(Number(inputMarginInner.value)==maxMarInn){
                outputMarginInner.value=String(maxMarInn);
            }
            Draw();
        }else if(num==3){
            outputRingWidth.value=inputRingWidth.value;
            let maxMarInn=Number(inputOutRad.value)-Number(inputRingWidth.value);
            outputMarginInner.setAttribute('max',String(maxMarInn))
            inputMarginInner.setAttribute('max',String(maxMarInn));
            mim.textContent=String(maxMarInn);
            if(Number(inputMarginInner.value)==maxMarInn){
                outputMarginInner.value=maxMarInn;
            }
            Draw();
        }else if(num==4){
            outputMarginInner.value=inputMarginInner.value;
            Draw();
        }else{
            outputMarginOuter.value=inputMarginOuter.value;
            Draw();
        }
        }else{
            if(num==11){
            check(outputSegments);
            inputSegments.value=outputSegments.value;
            Draw();
            }else if(num==22){
                check(outputOutRad);
                inputOutRad.value=outputOutRad.value;
                inputRingWidth.setAttribute('max',inputOutRad.value);
            outputRingWidth.setAttribute('max',inputOutRad.value);
            rwm.textContent=inputOutRad.value;
            if(Number(inputOutRad.value)<Number(outputRingWidth.value)){
                outputRingWidth.value=inputOutRad.value;
                inputRingWidth.value=inputOutRad.value;
                console.log('R<W');
            }
            let maxMarInn=Number(inputOutRad.value)-Number(inputRingWidth.value);
            inputMarginInner.setAttribute('max',String(maxMarInn));
            outputMarginInner.setAttribute('max',String(maxMarInn))
            mim.textContent=String(maxMarInn);
            if(Number(inputMarginInner.value)==maxMarInn){
                outputMarginInner.value=String(maxMarInn);
            }
                Draw()
            }else if(num==33){
                check(outputRingWidth);
                inputRingWidth.value=outputRingWidth.value;
                let maxMarInn=Number(inputOutRad.value)-Number(inputRingWidth.value);
                outputMarginInner.setAttribute('max',String(maxMarInn))
                inputMarginInner.setAttribute('max',String(maxMarInn));
                mim.textContent=String(maxMarInn);
                if(Number(inputMarginInner.value)==maxMarInn){
                outputMarginInner.value=maxMarInn;
                }
                Draw();
            }else if(num==44){
                check(outputMarginInner);
                inputMarginInner.value=outputMarginInner.value;
                Draw(); 
            }else{
                check(outputMarginOuter);
               inputMarginOuter.value=outputMarginOuter.value;
            Draw(); 
            }
        }
        
    }
  