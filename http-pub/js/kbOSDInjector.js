/*global window, Exception, OpenSeadragon*/

// polyfill forEach
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (fn, context) {
        context = context || window;
        for (var i = 0; i < this.length; i += 1) {
            fn.call(context, this[i], i, this);
        }
    }; 
}

window.KbOSD = (function(window, undefined) {
    // Make and prepare a uidGenerator
    var UIDGen = function (initial) {
        initial = initial || 0;
        this.generate = function () {
            return initial++;
        };
    };
    var uidGen = new UIDGen();

    // Inject script method
    var loadAdditionalJavascript = function (url, callback) {
            var script = document.createElement('script');
            script.async = true;
            script.src = url;
            var entry = document.getElementsByTagName('script')[0];
            entry.parentNode.insertBefore(script, entry);
            script.onload = script.onreadystatechange = function () {
                var rdyState = script.readyState;
                if (!rdyState || /complete|loaded/.test(rdyState)) {
                    if (callback) {
                        callback();
                    }
                    // avoid IE memoryleak http://mng.bz/W8fx
                    script.onload = null;
                }
            };
        };

    // Setup a document.listener for for the event openseadragonloaded
    document.addEventListener('openseadragonloaded', function () {
        if ('undefined' !== window.kbOSDconfig) {
            window.kbOSDconfig.forEach(function (config) {
                new KbOSD(config);
            }, this);
        }
    });

    // initialization
    // add openSeaDragon script
    loadAdditionalJavascript('http://localhost:8001/3rdparty/openseadragon.js', function () {
        document.dispatchEvent(new CustomEvent('openseadragonloaded', {
            detail:{
                OpenSeadragon : window.OpenSeadragon
            }
        }));
    });

    // add kbOSD stylesheet
    var link = document.createElement('link');
    link.href = 'http://localhost:8001/css/kbOSD.css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    document.head.appendChild(link);

    // constructor
    var KbOSD = function (config) {
        if ('undefined' === typeof config || 'undefined' === typeof config.id) {
            throw new Exception('No config object with id property found');
        }
        var that = this;
        this.uid = 'kbOSD-' + uidGen.generate();
        this.config = config;
        if ('undefined' !== typeof this.config.initialPage) {
            this.config.initialPage -= 1; // We have a one based index, while openSeadragon has a zero based index (yeah - yikes!)
        }
        this.outerContainer = document.getElementById(this.config.id);

        this.headerElem = this.outerContainer.firstElementChild;
        this.viewerElem = this.headerElem.nextElementSibling;
        this.contentElem = this.viewerElem.firstElementChild;
        this.footerElem = this.contentElem.nextElementSibling;
        this.headerElem.id = this.uid + '-header';
        this.headerElem.innerHTML = '<h1>' +
                                        '<a href="" class="pull-left icon kbLogo"></a>' +
                                        ('undefined' !== typeof config.kbHeader ? '<span id="' + this.uid + '-title">' + config.kbHeader + '</span>' : '') +
                                    '</h1>';
        this.contentElem.id = this.uid;
        this.footerElem.id = this.uid + '-footer';
        this.footerElem.innerHTML = '<ul>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-home" href="" class="pull-left icon home"></a>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-zoomOut" href="" class="pull-right icon zoomOut"></a>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-zoomIn" href="" class="pull-left icon zoomIn"></a>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-rotate" href="" class="icon rotate"></a>' +
                                        '</li>' +
                                        '<li class="kbPrevNav">' +
                                            '<a id="' + this.uid + '-prev" href="" class="pull-right icon previous"></a>' +
                                        '</li>' +
                                        '<li class="kbFastNav">' +
                                            '<input id="' + this.uid + '-fastNav" class="kbOSDCurrentPage" type="text" pattern="\d*" value="' + ((config.initialPage + 1) || 1) + '">' +
                                            '<span> / </span>' +
                                            //'<span class="kbOSDPageCount">' + (config.tileSources.length + 1) + '</span>' +
                                            '<span class="kbOSDPageCount">' + this.getLastPage() + '</span>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-next" href="" class="pull-left icon next"></a>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-fullscreen" href="" class="pull-right icon maximize"></a>' +
                                        '</li>' +
                                    '</ul>';
        // overriding selected options with kb presets
        OpenSeadragon.extend(true, config, {
            id: this.uid,
            showRotationControl: true,
            toolbar: this.uid + '-footer',
            homeButton: this.uid + '-home',
            zoomOutButton: this.uid + '-zoomOut',
            zoomInButton: this.uid + '-zoomIn',
            rotateRightButton: this.uid + '-rotate',
            previousButton: this.uid + '-prev',
            nextButton: this.uid + '-next',
            fullPageButton: this.uid + '-fullscreen',
        });

        that.openSeadragon = OpenSeadragon(config);
        that.openSeadragon.addHandler('animation', that.paintWatermark, that); // FIXME: Optimization: this might be too excessive - it repaints the watermark on every animation step!)

        // set up listeners for the preview && next to keep the fastNav index updated.
        this.footerElem.querySelector('#' +this.uid + '-prev').addEventListener('click', function () {
            var kbosd = KbOSD.prototype.hash[this.id.split('-')[1]];
            kbosd.fastNav.value = kbosd.getCurrentPage();
        });
        this.footerElem.querySelector('#' + this.uid + '-next').addEventListener('click', function () {
            var kbosd = KbOSD.prototype.hash[this.id.split('-')[1]];
            kbosd.fastNav.value = kbosd.getCurrentPage();
        });

        // setting up listeners for kbFastNav
        this.fastNav = this.footerElem.getElementsByTagName('input')[0];
        this.fastNav.addEventListener('focus', function (e) {
            this.select();
        });
        this.fastNav.addEventListener('keyup', function (e) {
            var page = e.target.value;
                //owner = this.attributes['data-owner'].value;
            if (!/^\s*$/.test(page)) {
                // go to page requested FIXME: We might just wanna do this on change, or maybe with a delay?
                var kbosd = KbOSD.prototype.hash[this.id.split('-')[1]];
                try {
                    e.target.value = kbosd.setCurrentPage(e.target.value);
                } catch (e2) {
                    e.target.value = kbosd.getCurrentPage();
                }
            }
        });

        //that.openSeadragon.addHandler('update-tile', that.paintWatermark, that);
        that.hash.push(that);
    };

    KbOSD.prototype = {
        hash: [],
        logo: new Image(),
        getLastPage: function () {
            if ('undefined' !== typeof this.openSeadragon) {
                return this.openSeadragon.tileSources.length;
            } else {
                return this.config.tileSources.length;
            }
        },
        getCurrentPage: function () {
            return this.openSeadragon.currentPage() + 1; // index is 1 based
        },
        setCurrentPage: function (page) {
            // correct page number
            if (isNaN(page)) {
                throw 'Page is not a number';
            }
            page = parseInt(page, 10);
            page -= 1; // Our viewers index is 1 based, openSeadragon is 0 based
            if (page > this.openSeadragon.tileSources.length) {
                page = this.openSeadragon.tileSources.length - 1;
            } else if (page < 0) {
                page = 0;
            }
            this.openSeadragon.goToPage(page);
            return (page + 1);
        },
        getNextPageNumber : function () {
            var current = this.getCurrentPage();
            if (current >= this.getLastPage()) {
                return current;
            } else {
                return current + 1;
            }
        },
        getPrevPageNumber : function () {
            var current = this.getCurrentPage();
            if (current <= 1) {
                return current;
            } else {
                return current - 1;
            }
        },
        getCanvas: function (returnAll) {
            var canvases = this.openSeadragon.element.getElementsByTagName('canvas');
            if (returnAll) {
                return canvases;
            }
            var i = 0,
                widestCanvas = canvases[i];
            i += 1;
            while (canvases[i]) {
                if (canvases[i].width > widestCanvas.width) {
                    widestCanvas = canvases[i];
                }
                i += 1;
            }
            return widestCanvas;
        },
        paintWatermark: function (conf) {
            var canvas = conf.userData.getCanvas(),
                height = canvas.height;
            //canvas.getContext('2d').drawImage(conf.userData.logo, 8, (height - 40 - 48)); // unoutcomment to test watermark
            canvas.getContext('2d').drawImage(conf.userData.logo, 8, (height - 40));
        }
        //FIXME: We might wanna have a method that digs out the right KbOSD from the hash, given an id (traverses hash and returns element with correct id)
    };

    // setting up logo for watermark
    KbOSD.prototype.logo.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAgCAYAAACcuBHKAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wECDQUXTqkHsAAAAytJREFUWMPNmD9I60Acx68iCailBB8UagZrWpKlHZK0Qp9DfUNRRARBGuHRSSgdHHV2duyS3cUUB9EihlCMUOjiNcLLcqGgIlEivFKkUohL32IgiH9aUl/9LRfufpDPfe/3Jxff1tZWFwzZRgEAYHd3VxwWwPb2dmEEfAPzDCFJUmKoEJIkJTRN472CeIIwTTPkHocCQZLkvXscCoSmaTxFUUjTNN5zin5mj4+P+Pn5OX17exuybRvHcdymafqGZVmIEKJZloWKojCGYUy712dnZ68DgYDtGcIwjB/7+/sLnU7HPzY21mYYxrBtG6vVajyGYXYqlYIQwhhCCA+Hw9c4jjcRQnSlUgnXajV+fX1dpmn6rycIRVF4hmEMTdP4jY2NI5Ik2y/qQEmSUpVKZZ6iKCQIQs3ZtWmaqFgs/mYYxlAUhadpWvYUE5ZlhaLR6B0AADw8PPid+UAgYOfzeRUAAPL5vOqW3fGLRqN3lmWFPAcmQRDNRqMxRVEUUlW1p3qgqmqCoijUaDSmCIJoeoaIx+OGruuxdDqtt1qtyWq1Gv7Iv1qthlut1mQ6ndZ1XY/F43HDM0Qmk0EEQTQVReGTySSUZXneNE3/O8XLL8vyfDKZhIqi8ARBNDOZDBpIigqCcCaK4hqGYTYAAOzt7S3MzMzcvO4fV1dX0y9xNGlZVqhQKBwMrE6QJNnO5XLHl5eX4VgsprvXWJaFzrMbLJfLHTuZNBAIAAB4enrC+qmMTkYNFCISiTSz2exRP/4Dh7Asyw8hpJeWluBHMpum6T88PPw5MTEBeynZfTWw8fFx+/n5GRdFce297wdJkhKiKK45/gNXgiTJ9ubmplyv10PlcvnXzs4Ovby8fMZx3L0zBwAAq6urMsdxfbX2UdCncRx3H4lEDk5PT+OlUmmlXC63O52On2VZuLi4+KfXI/AE4fQNQRAu5ubm0MnJCf9ZnPQK0QUA+D5yrNfroVKptPLWWrFYZF7PZbPZo16Pxa2Ecwl6EyYYDLbdhekzCwaDPSvzVnb89xvZezHhBvE52SEIwsVXXn4+2v2XKzPS48u6/wOiO0wQ33f4NfAPytlrOiwF3qUAAAAASUVORK5CYII=";

    return KbOSD;
}(window));
