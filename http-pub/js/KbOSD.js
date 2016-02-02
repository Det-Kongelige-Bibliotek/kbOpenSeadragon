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

    // Local helper method Extract FragmentIdentifier // NOTE: This isn't your default trivial fragmentidentifier, since we can have more than one kbOSD on each page.
    /**
     * Turns a fragmentIdentifier of the form #id0=attrib0Key:attrib0Value;attrib1Key:attrib1Value&id1=attrib0Key:attrib0Value;attrib1Key:attrib1Value;attrib2Key:attrib2Value
     * into this structure:
     * instances[id0]
               [attrib0Key]:attrib0Value
               [attrib1Key]:attrib1Value
           [id1]
               [attrib0Key]:attrib0Value
               [attrib1Key]:attrib1Value
               [attrib2Key]:attrib2Value

       So after running through this function, the result can be asked as follows:
       var myHash = extractFragmentIdentifier();
       myHash[id0][attrib1Key]; // = attrib1Value
       as in: that.setCurrentPage(myHash[that.uid].page);
     */
    var extractFragmentIdentifier = function () {
        try {
            var fragmentIdentifier = window.location.hash.substr(1).split('&');
            for (var i = 0; i < fragmentIdentifier.length; i += 1) {
                fragmentIdentifier[i] = fragmentIdentifier[i].split('=');
                fragmentIdentifier[i][1] = fragmentIdentifier[i][1].split(';');
                for (var j = 0; j < fragmentIdentifier[i][1].length; j += 1) {
                    fragmentIdentifier[i][1][j] = fragmentIdentifier[i][1][j].split(':');
                }
            };
            var fragmentHash = [];
            fragmentIdentifier.forEach(function (fragIdent) {
                var params = [];
                for (var j = 0; j < fragIdent[1].length; j += 1) {
                    params[fragIdent[1][j][0]] = fragIdent[1][j][1];
                }
                fragmentHash[fragIdent[0]] = params;
            });
            return fragmentHash;
        } catch (e) {
            //something went sour, just returning null (as if there is no fragment identifier to parse)
            return [];
        }
    };

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

    // initialization
    // add history polyfill
    loadAdditionalJavascript('http://localhost:8002/3rdparty/native.history.js');
    // add openSeaDragon script
    loadAdditionalJavascript('http://localhost:8002/3rdparty/openseadragon.js', function () {
        // This is run when openseadragon has loaded
        if ('undefined' !== window.kbOSDconfig) {
            var fragmentHash = extractFragmentIdentifier();
            window.kbOSDconfig.forEach(function (config) {
                // prefetch the comming uid, in order to look for it in the fragment identifier (the uid is a unique indentifier for each KbOSD object on the page)
                var uid = config.uid = config.uid || 'kbOSD-' + uidGen.generate();

                if (fragmentHash[uid] && fragmentHash[uid].page) {
                    config.initialPage = fragmentHash[uid].page; // fragmentidentifier.page allways overrules config.initialPage
                    if (config.rtl) {
                        config.initialPage = config.tileSources.length - config.initialPage;
                    } else {
                        config.initialPage = config.initialPage - 1; // OSD initial page is zero based - kbOSD is one based :-/
                    }
                } else { // no page selected in the fragmentidentifier
                    if (config.rtl) {
                        config.initialPage = config.initialPage || config.tileSources.length - 1;
                    } else {
                        config.initialPage = ('undefined' !== typeof config.initialPage) ? config.initialPage - 1 : 0;
                    }
                }

                KbOSD.prototype.instances.push(new KbOSD(config)); // handle to all KbOSD objects in KbOSD.prototype.instances

            }, this);
        } else {
            if ('undefined' !== typeof window.console) {
                console.error('No kbOSDconfig found - aborting.');
            }
        }
    });

    // add kbOSD stylesheet
    var link = document.createElement('link');
    link.href = 'http://localhost:8002/css/kbOSD.css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    document.head.appendChild(link);

    // constructor
    var KbOSD = function (config) {
        if ('undefined' === typeof config || 'undefined' === typeof config.id) {
            throw new Exception('No config object with id property found');
        }
        var that = this;
        this.uid = config.uid || 'kbOSD-' + uidGen.generate();
        this.config = config;
        if ('undefined' === typeof this.config.hidePageNav) { // default hidePageNav to false
            this.config.hidePageNav = false;
        }
        this.outerContainer = document.getElementById(this.config.id);

        this.viewerElem = this.outerContainer.firstElementChild;
        this.contentElem = this.viewerElem.firstElementChild;
        this.footerElem = this.contentElem.nextElementSibling;
        this.contentElem.id = this.uid;
        this.contentElem.innerHTML = ''; // emptying the openSeaDragon element so there is no content in it besides OpenSeadragon (due to a hack to aviod empty divs which were stripped somewhere in the server flow)
        this.footerElem.id = this.uid + '-footer';
        // assembling footer content
        var tmpFooterElemInnerHTML = '<ul>' +
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
                                        '</li>';
        if ((this.getPageCount() > 1) && !this.config.hidePageNav) { // only include the page navigation elements if there are more than one image, and config does not ask to hide them.
            tmpFooterElemInnerHTML +=   '<li class="kbPrevNav">' +
                                            '<a id="' + this.uid + '-prev" href="" class="pull-right icon previous"></a>' +
                                        '</li>' +
                                        '<li class="kbFastNav">' +
                                            '<input id="' + this.uid + '-fastNav" class="kbOSDCurrentPage" type="text" pattern="\d*" value="' + (config.rtl ? config.tileSources.length - config.initialPage : (config.initialPage + 1) || 1) + '">' +
                                            '<span> / </span>' +
                                            '<span class="kbOSDPageCount">' + this.getPageCount() + '</span>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-next" href="" class="pull-left icon next"></a>' +
                                        '</li>';
        } else {
            tmpFooterElemInnerHTML +=   '<li></li><li></li><li></li>';
        }
        tmpFooterElemInnerHTML +=       '<li>' +
                                            '<a id="' + this.uid + '-fullscreen" href="" class="pull-right icon maximize"></a>' +
                                        '</li>' +
                                    '</ul>';
        this.footerElem.innerHTML = tmpFooterElemInnerHTML;
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
            var kbosd = KbOSD.prototype.instances[this.id.split('-')[1]];
            kbosd.updateFastNav();
            kbosd.updateFragmentIdentifier();
        });
        this.footerElem.querySelector('#' + this.uid + '-next').addEventListener('click', function () {
            var kbosd = KbOSD.prototype.instances[this.id.split('-')[1]];
            kbosd.updateFastNav();
            kbosd.updateFragmentIdentifier();
        });

        // setting up eventHandlers for kbFastNav
        this.fastNav = this.footerElem.getElementsByTagName('input')[0];
        this.fastNav.addEventListener('focus', function (e) {
            this.select();
        });
        this.fastNav.addEventListener('keyup', function (e) {
            var page = e.target.value;
                //owner = this.attributes['data-owner'].value;
            if (!/^\s*$/.test(page)) {
                // go to page requested FIXME: We might just wanna do this on change, or maybe with a delay?
                var kbosd = KbOSD.prototype.instances[this.id.split('-')[1]];
                try {
                    e.target.value = kbosd.setCurrentPage(e.target.value);
                } catch (e2) {
                    e.target.value = kbosd.getCurrentPage();
                }
            }
        });
    };

    KbOSD.prototype = {
        instances: [],
        logo: new Image(),
        normalizePageNumber: function (page) {
            if (this.config.rtl) {
                return this.getPageCount() - page;
            } else {
                return page + 1;
            }
        },
        getPageCount: function () {
            if ('undefined' !== typeof this.openSeadragon) {
                return this.openSeadragon.tileSources.length;
            } else {
                return this.config.tileSources.length;
            }
        },
        getCurrentPage: function () {
            return this.normalizePageNumber(this.openSeadragon.currentPage());
        },
        setCurrentPage: function (page) {
            // correct page number
            if (isNaN(page)) {
                throw 'Page is not a number';
            }
            page = parseInt(page, 10);
            if (page > this.getPageCount()) {
                page = this.getPageCount();
            } else if (page < 0) {
                page = 0;
            }
            this.openSeadragon.goToPage(page - 1); // used to be without the " - 1" part
            this.updateFragmentIdentifier();
            this.updateFastNav();
            return page; // used to be this.normalizePageNumber(page)
        },
        getNextPageNumber : function () {
            var current = this.getCurrentPage();
            if (current >= this.getPageCount()) {
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
        updateFastNav: function () {
            this.fastNav.value = this.getCurrentPage();
        },
        updateFragmentIdentifier: function () {
            var fragment = KbOSD.prototype.instances.map(function (kbosd) {
                return kbosd.uid + '=page:' + kbosd.getCurrentPage();
            }).join('&');
            history.replaceState(undefined, undefined, '#' + fragment);
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
