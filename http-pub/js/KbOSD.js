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

                if ('undefined' === typeof config.initialPage) {
                    // if no initial page is given, set it here
                    config.initialPage = 1;
                }

                if (fragmentHash[uid] && fragmentHash[uid].page) {
                    config.initialPage = fragmentHash[uid].page; // fragmentidentifier.page allways overrules config.initialPage
                }

                var newKbOSD = new KbOSD(config);
                KbOSD.prototype.instances.push(newKbOSD); // handle to all KbOSD objects in KbOSD.prototype.instances
                newKbOSD.updateArrows(newKbOSD);

                document.dispatchEvent(new CustomEvent('kbosdready', {
                    detail : {
                        kbosd : newKbOSD
                    }
                }));

            }, this);

            KbOSD.prototype.checkMenuWidth();
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
    var headElement = ('undefined' !== typeof document.head) ?  document.head : document.getElementsByTagName('head')[0]; // Lex old IE :-/
    headElement.appendChild(link);

    // +----------------------------+
    // | Object KbPageNumNormalizer |
    // +----------------------------+
    // This object will make it transparent to kbOSD whether this is a rtl or ltr view (arabic vs. western pagenumbers etc.)
    // Constructor
    var KbPageNumNormalizer = function (config) {
        config = config || {};
        if ('undefined' === typeof config.rtl) {
            this.rtl = false;
        } else {
            this.rtl = config.rtl;
        }
        this.osd = config.osd;
        if (this.osd && this.osd.tileSources) {
            this.pageCount = this.osd.tileSources.length;
        } else if (!isNaN(config.pageCount)) {
            this.pageCount = parseInt(config.pageCount, 10);
        } else if ('undefined' !== typeof config.tileSources) {
            this.pageCount = config.tileSources.length;
        } else {
            this.pageCount = 0; // I give up! :)
        }
    };

    KbPageNumNormalizer.prototype = {
        setOsd: function (osd) {
            this.osd = osd;
        },
        getPageCount: function () {
            return this.pageCount; // Todo: this might go wrong if tiles can be added dynamically (but I don't think it can by now)
        },
        getCurrentPage: function () {
            if (this.rtl) {
                return this.pageCount - this.osd.currentPage();
            } else {
                return this.osd.currentPage() + 1;
            }
        },
        setCurrentPage: function (number) {
            number = this.validatedPageNumber(number);
            if (this.rtl) {
                this.osd.goToPage(this.pageCount - number);
            } else {
                this.osd.goToPage(number - 1);
            }
            return number;
        },
        validatedPageNumber: function (pageNumber, zeroBased) {
            if (isNaN(pageNumber)) {
                throw 'Page is not a number';
            }
            pageNumber = parseInt(pageNumber, 10);
            var maxPage = zeroBased ? this.pageCount - 1 : this.pageCount,
                minPage = zeroBased ? 0 : 1;
            if (pageNumber > maxPage) {
                pageNumber = maxPage;
            }
            if (pageNumber < minPage) {
                pageNumber = minPage;
            }
            return pageNumber;
        },
        calculateRealPageNumber: function (normalizedPageNumber) {
            normalizedPageNumber = this.validatedPageNumber(normalizedPageNumber);
            if (this.rtl) {
                return this.pageCount - normalizedPageNumber;
            } else {
                return normalizedPageNumber - 1;
            }
        },
        calculateNormalizedPageNumber: function (realPageNumber) {
            realPageNumber = this.validatedPageNumber(realPageNumber, true);
            if (this.rtl) {
                return this.pageCount - realPageNumber;
            } else {
                return realPageNumber + 1;
            }
        },
        getNextPageNumber: function () {
            if (this.getCurrentPage() < this.pageCount) {
                return this.getCurrentPage() + 1;
            } else {
                return this.getCurrentPage();
            }
        },
        getPrevPageNumber: function () {
            if (this.getCurrentPage() > 1) {
                return this.getCurrentPage() - 1;
            } else {
                return this.getCurrentPage();
            }
        }
    };

    // +--------------+
    // | Object KbOSD |
    // +--------------+
    // Constructor
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

        // get a KbPageNumNormalizer
        this.pageNumNormalizer = new KbPageNumNormalizer({
            rtl: this.config.rtl,
            pageCount: this.config.tileSources && this.config.tileSources.length || this.config.pageCount || 0
        });

        //set initialpage to a real OSD pageNumber
        if ('undefined' !== typeof config.initialPage) {
            config.initialPage = this.pageNumNormalizer.calculateRealPageNumber(config.initialPage);
        }

        this.outerContainer = document.getElementById(this.config.id);
        this.viewerElem = this.outerContainer.getElementsByClassName('kbOSDViewer')[0];
        this.contentElem = this.viewerElem.getElementsByClassName('kbOSDContent')[0];
        this.footerElem = this.viewerElem.getElementsByClassName('kbOSDFooter')[0];
        this.contentElem.id = this.uid;
        this.contentElem.innerHTML = ''; // emptying the openSeaDragon element so there is no content in it besides OpenSeadragon (due to a hack to aviod empty divs which were stripped somewhere in the server flow)
        this.footerElem.id = this.uid + '-footer';
        // assembling footer content
        var tmpFooterElemInnerHTML = '<ul>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-home" href="" class="pull-left icon home"></a>' +
                                        '</li>' +
                                        '<li class="hideWhenSmall">' +
                                            '<a id="' + this.uid + '-zoomOut" href="" class="pull-right icon zoomOut"></a>' +
                                        '</li>' +
                                        '<li class="hideWhenSmall">' +
                                            '<a id="' + this.uid + '-zoomIn" href="" class="pull-left icon zoomIn"></a>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-rotate" href="" class="icon rotate"></a>' +
                                        '</li>';
        if ((this.getPageCount() > 1) && !this.config.hidePageNav) { // only include the page navigation elements if there are more than one image, and config does not ask to hide them.
            tmpFooterElemInnerHTML +=   '<li class="kbPrevNav">' +
                                            '<div id="' + this.uid + '-kbPrev" class="kbButtonOverlay kbRight" data-uid="' + this.uid + '"></div><a id="' + this.uid + '-prev" href="" class="pull-right icon previous"></a>' +
                                        '</li>' +
                                        '<li class="kbFastNav">' +
                                            '<input id="' + this.uid + '-fastNav" class="kbOSDCurrentPage" type="text" pattern="\d*" value="' + (this.pageNumNormalizer.calculateNormalizedPageNumber(config.initialPage)) + '">' +
                                            '<span> / </span>' +
                                            '<span class="kbOSDPageCount">' + this.getPageCount() + '</span>' +
                                        '</li>' +
                                        '<li>' +
                                            '<div id="' + this.uid + '-kbNext" class="kbButtonOverlay kbLeft" data-uid="' + this.uid + '"></div><a id="' + this.uid + '-next" href="" class="pull-left icon next"></a>' +
                                        '</li>';
        } else {
            tmpFooterElemInnerHTML +=   '<li></li><li></li><li></li>';
        }
        tmpFooterElemInnerHTML +=       '<li class="kbFullscreen">' +
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

        that.openSeadragon.addHandler('full-screen', function (e) {
            that.contentElem.dispatchEvent(new CustomEvent('fullScreen', {
                detail : {
                    fullScreen : e.fullScreen
                }
            }));
        });

        // Ugly hack: Since OpenSeadragon have no concept of rtl, we have disabled their prev/next buttons and emulated our own instead, that take normalization into account
        document.getElementById(this.uid + '-prev').style.display='none';
        document.getElementById(this.uid + '-next').style.display='none';

        that.pageNumNormalizer.setOsd(that.openSeadragon);

        // inject index if there is one
        if (('undefined' !== typeof config.indexPage) && config.indexPage.length && config.indexPage.length > 0) {
            that.indexElem = document.createElement('div');
            that.indexElem.className = 'indexPage shown';
            that.indexFan = document.createElement('div');
            that.indexFan.className = 'indexFan';
            that.indexFan.innerHTML = '<span class="glyphicon glyphicons-arrow-left"></span>';
            that.indexElem.appendChild(that.indexFan);
            that.indexContent = document.createElement('div');
            that.indexContent.className = 'indexContent';
            that.indexContent.id = that.uid + '_index';
            // populating indexContent with titles and pages
            var tmpIndexContentStr = '<ul>';
            that.config.indexPage.forEach(function (link) {
                tmpIndexContentStr += '<li><span class="indexLink" data-page="' + link.page + '">' + link.title + '</span></li>'; // TODO: We might wanna wrap the link in an a-tag for graceful degradation, but then we have to ensure that the links also will work on pages with more than one instance of kbOSD (and that is anything but trivial!) FIXME: We also need to work this through with accessability!! :-/
            });
            tmpIndexContentStr += "</ul>";
            that.indexContent.innerHTML = tmpIndexContentStr;

            that.indexElem.appendChild(that.indexContent);
            that.contentElem.appendChild(that.indexElem);

            //set up eventhandlers
            that.indexFan.addEventListener('click', function (e) {
                KbOSD.prototype.getInstanceFromElem(e.target).toggleIndexPage();
            });
            that.indexContent.addEventListener('click', function (e) {
                e.preventDefault();
                if (e.target.className === 'indexLink') {
                    var page = parseInt(e.target.attributes.getNamedItem('data-page').value, 10),
                        kbOSD = KbOSD.prototype.getInstanceFromElem(e.target);
                    kbOSD.setCurrentPage(page);
                    //kbOSD.toggleIndexPage();
                }
            });
        }

        that.openSeadragon.addHandler('animation', that.paintWatermark, that); // FIXME: Optimization: this might be too excessive - it repaints the watermark on every animation step!)

        if (this.footerElem.querySelector('#' +this.uid + '-prev')) {
            // set up listeners for the preview && next to keep the fastNav index updated.
            // NOTE: Notice that the prev/next buttons are swapped if rtl!
            // go to previous page
            this.footerElem.querySelector('#' +this.uid + (this.pageNumNormalizer.rtl ? '-next' : '-prev')).parentElement.firstChild.addEventListener('click', function (e) {
                e.stopPropagation();
                var kbosd = KbOSD.prototype.instances[this.attributes.getNamedItem('data-uid').value.split('-')[1]];
                kbosd.setCurrentPage(kbosd.getPrevPageNumber());
            });
            // go to next page
            this.footerElem.querySelector('#' + this.uid + (this.pageNumNormalizer.rtl ? '-prev' : '-next')).parentElement.firstChild.addEventListener('click', function (e) {
                e.stopPropagation();
                var kbosd = KbOSD.prototype.instances[this.attributes.getNamedItem('data-uid').value.split('-')[1]];
                kbosd.setCurrentPage(kbosd.getNextPageNumber());
            });

            // setting up eventHandlers for kbFastNav
            this.fastNav = this.footerElem.getElementsByTagName('input')[0];
            this.fastNav.addEventListener('focus', function (e) {
                this.select();
            });
            var fastNavChangePage = function (e) {
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
            };

            // Listen to change events from the fastNav inputfield - either change or enter shall envoke a page change.
            this.fastNav.addEventListener('keyup', function (e) {
                if (e.keyCode === 13) {
                    fastNavChangePage.call(e.target, e);
                }
            });
            this.fastNav.addEventListener('change', fastNavChangePage);

            // setup window resize listener that sets menu to narrow, if an OSD instance gets to narrow for the full menu
            window.addEventListener('resize', this.checkMenuWidth);
        }
    };

    KbOSD.prototype = {
        instances: [],
        logo: new Image(),
        getInstance: function (uid) {
            return this.instances.filter(function (instance) {
                return instance.uid === uid;
            })[0];
        },
        getInstanceFromElem: function (elem) {
            if (('undefined' !== typeof elem) && (elem instanceof HTMLElement)) {
                while ((elem.className.indexOf('kbOSDContent') < 0) && (elem !== document.body)) {
                    elem = elem.parentElement;
                }
                if (elem === document.body) {
                    return; // this was not an element on a indexPage container
                }
                return this.getInstance(elem.id);
            } else {
                return;
            }
        },
        getPageCount: function () {
            return this.pageNumNormalizer.getPageCount();
        },
        getCurrentPage: function () {
            return this.pageNumNormalizer.getCurrentPage();
        },
        setCurrentPage: function (page, cb) {
            page = this.pageNumNormalizer.setCurrentPage(page);
            this.updateArrows(this, page);
            this.updateFragmentIdentifier();
            this.updateFastNav();

            this.contentElem.dispatchEvent(new CustomEvent('pagechange', {
                detail : {
                    page : page,
                    kbosd : this
                }
            }));

            if (cb && 'function' === typeof cb) {
                cb(page);
            }
            return page;
        },
        getNextPageNumber: function () {
            return this.pageNumNormalizer.getNextPageNumber();
        },
        getPrevPageNumber: function () {
            return this.pageNumNormalizer.getPrevPageNumber();
        },
        /**
         *  This method is supposed to be called from the prototype. It runs through all OSD instances and meassures if they are too narrow to contain the full menu bar
         *  If they are too narrow, it sets the narrowMenu class so selected buttons disappear and visa versa.
         */
        checkMenuWidth: function () {
            KbOSD.prototype.instances.forEach(function (kbosd) {
                var footerWidth =  parseInt(window.getComputedStyle(kbosd.footerElem).width, 10),
                    menuIsNarrow = kbosd.footerElem.className.indexOf(' narrowMenu') >= 0;
                if (footerWidth < 726) {
                    if (!menuIsNarrow) {
                        kbosd.footerElem.className = kbosd.footerElem.className + ' narrowMenu';
                    }
                } else {
                    if (menuIsNarrow) {
                        kbosd.footerElem.className = kbosd.footerElem.className.replace(/\snarrowMenu/,'');
                    }
                }
            });
        },
        updateArrows: function (kbosd, currentPage) {
            currentPage = currentPage || kbosd.getCurrentPage();
            var buttons = {
                next : document.getElementById(kbosd.uid + '-kbNext'),
                prev : document.getElementById(kbosd.uid + '-kbPrev')
            };
            if (currentPage === 1) {
                buttons[(kbosd.pageNumNormalizer.rtl ? 'next' : 'prev')].style.opacity = '0.2';
            } else {
                buttons[(kbosd.pageNumNormalizer.rtl ? 'next' : 'prev')].style.opacity = '1'; // default/inherited?
            }
            if (currentPage === this.pageNumNormalizer.pageCount) {
                buttons[(kbosd.pageNumNormalizer.rtl ? 'prev' : 'next')].style.opacity = '0.2';
            } else {
                buttons[(kbosd.pageNumNormalizer.rtl ? 'prev' : 'next')].style.opacity = '1';
            }
        },
        updateFastNav: function () {
            this.fastNav.value = this.getCurrentPage();
        },
        updateFragmentIdentifier: function () {
            var fragment = KbOSD.prototype.instances.map(function (kbosd) {
                return kbosd.uid + '=page:' + kbosd.getCurrentPage();
            }).join('&');
            if ('undefined' !== typeof history.replaceState) { // Note: IE9 does not support history.replaceState
                history.replaceState(undefined, undefined, '#' + fragment);
            }
        },
        toggleIndexPage: function () {
            if ('undefined' !== typeof this.indexElem) { // only do if there IS an indexPage
                if (this.indexElem.className.indexOf('shown') > 0) {
                    this.indexElem.className = 'indexPage';
                } else {
                    this.indexElem.className = 'indexPage shown';
                }
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
    };

    // setting up logo for watermark
    KbOSD.prototype.logo.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAgCAYAAACcuBHKAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wECDQUXTqkHsAAAAytJREFUWMPNmD9I60Acx68iCailBB8UagZrWpKlHZK0Qp9DfUNRRARBGuHRSSgdHHV2duyS3cUUB9EihlCMUOjiNcLLcqGgIlEivFKkUohL32IgiH9aUl/9LRfufpDPfe/3Jxff1tZWFwzZRgEAYHd3VxwWwPb2dmEEfAPzDCFJUmKoEJIkJTRN472CeIIwTTPkHocCQZLkvXscCoSmaTxFUUjTNN5zin5mj4+P+Pn5OX17exuybRvHcdymafqGZVmIEKJZloWKojCGYUy712dnZ68DgYDtGcIwjB/7+/sLnU7HPzY21mYYxrBtG6vVajyGYXYqlYIQwhhCCA+Hw9c4jjcRQnSlUgnXajV+fX1dpmn6rycIRVF4hmEMTdP4jY2NI5Ik2y/qQEmSUpVKZZ6iKCQIQs3ZtWmaqFgs/mYYxlAUhadpWvYUE5ZlhaLR6B0AADw8PPid+UAgYOfzeRUAAPL5vOqW3fGLRqN3lmWFPAcmQRDNRqMxRVEUUlW1p3qgqmqCoijUaDSmCIJoeoaIx+OGruuxdDqtt1qtyWq1Gv7Iv1qthlut1mQ6ndZ1XY/F43HDM0Qmk0EEQTQVReGTySSUZXneNE3/O8XLL8vyfDKZhIqi8ARBNDOZDBpIigqCcCaK4hqGYTYAAOzt7S3MzMzcvO4fV1dX0y9xNGlZVqhQKBwMrE6QJNnO5XLHl5eX4VgsprvXWJaFzrMbLJfLHTuZNBAIAAB4enrC+qmMTkYNFCISiTSz2exRP/4Dh7Asyw8hpJeWluBHMpum6T88PPw5MTEBeynZfTWw8fFx+/n5GRdFce297wdJkhKiKK45/gNXgiTJ9ubmplyv10PlcvnXzs4Ovby8fMZx3L0zBwAAq6urMsdxfbX2UdCncRx3H4lEDk5PT+OlUmmlXC63O52On2VZuLi4+KfXI/AE4fQNQRAu5ubm0MnJCf9ZnPQK0QUA+D5yrNfroVKptPLWWrFYZF7PZbPZo16Pxa2Ecwl6EyYYDLbdhekzCwaDPSvzVnb89xvZezHhBvE52SEIwsVXXn4+2v2XKzPS48u6/wOiO0wQ33f4NfAPytlrOiwF3qUAAAAASUVORK5CYII=";

    return KbOSD;
}(window));
