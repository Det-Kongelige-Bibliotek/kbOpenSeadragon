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

if ('undefined' === typeof window.kbTriggerEvent) {
    window.kbTriggerEvent = function (el, eventName, data) {
        var event;
        if (typeof window.CustomEvent === 'function') {
            event = new CustomEvent(eventName, { detail : data });
        } else if (document.createEvent) {
            event = document.createEvent('HTMLEvents');
            event.initEvent(eventName,true,true);
            event.eventType = eventName;
            event.detail = data;
        }else if(document.createEventObject){// IE < 9
            event = document.createEventObject();
            event.eventType = eventName;
            event.data = { detail : data };
        }
        event.eventName = eventName;
        if(el.dispatchEvent){
            el.dispatchEvent(event);
        }else if(el.fireEvent && htmlEvents['on'+eventName]){// IE < 9
            el.fireEvent('on'+event.eventType,event);// can trigger only a real event (e.g. 'click')
        }else if(el[eventName]){
            el[eventName]();
        }else if(el['on'+eventName]){
            el['on'+eventName]();
        }
    };
}

window.KbOSD = (function(window, undefined) {
    var rootURI = 'http://localhost:8002/';

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
            if (window.location.hash.length < 2) {
                return [];
            }
            var fragmentIdentifier = window.location.hash.substr(1).split('&');
            for (var i = 0; i < fragmentIdentifier.length; i += 1) {
                fragmentIdentifier[i] = fragmentIdentifier[i].split('=');
                fragmentIdentifier[i][1] = fragmentIdentifier[i][1].split(';');
                for (var j = 0; j < fragmentIdentifier[i][1].length; j += 1) {
                    fragmentIdentifier[i][1][j] = fragmentIdentifier[i][1][j].split(':');
                }
            }
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
    // delete History if it is already loaded (endlösung workaround for a 4 year old bug in History :-/ https://github.com/browserstate/history.js/issues/189 )
    delete History;
    // add history polyfill
    loadAdditionalJavascript(rootURI + '3rdparty/native.history.js');
    // add openSeaDragon script
    loadAdditionalJavascript(rootURI + '3rdparty/openseadragon.js', function () {
        // This is run when openseadragon has loaded
        if ('undefined' !== typeof OpenSeadragon) {
            KbOSD.version.openSeadragon = OpenSeadragon.version; // Flashing OpenSeadragon version in KbOSD.version
        }

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
                newKbOSD.pageCount = newKbOSD.pageNumNormalizer.pageCount;
                if (newKbOSD.pageCount > 1) { // only update arrows if more than one page
                    newKbOSD.updateArrows(newKbOSD);
                }

                kbTriggerEvent(document, 'kbosdready', { kbosd : newKbOSD });
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
    link.href = rootURI + 'css/kbOSD.css';
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
        this.toolbarElem = this.viewerElem.getElementsByClassName('kbOSDToolbar')[0];
        this.contentElem.id = this.uid;
        this.contentElem.innerHTML = ''; // emptying the openSeaDragon element so there is no content in it besides OpenSeadragon (due to a hack to aviod empty divs which were stripped somewhere in the server flow)
        this.toolbarElem.id = this.uid + '-toolbar';
        // assembling toolbar content
        var tmpToolbarElemInnerHTML = '<ul>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-home" href="" class="pull-left icon homex"><i class="fa fa-home fa-lg"></i></a>' +
                                        '</li>' +
                                        '<li class="hideWhenSmall">' +
                                            '<a id="' + this.uid + '-zoomOut" href="" class="pull-right icon zoomOutx"><i class="fa fa-search-minus fa-lg"></i></a>' +
                                        '</li>' +
                                        '<li class="hideWhenSmall">' +
                                            '<a id="' + this.uid + '-zoomIn" href="" class="pull-left icon zoomInx"><i class="fa fa-search-plus fa-lg"></i></a>' +
                                        '</li>' +
                                        '<li>' +
                                            '<a id="' + this.uid + '-rotateLeft" href="" class="icon rotateLeftx"><i class="fa fa-undo fa-lg"></i></a>' +
                                        '</li>'+
                                        '<li>' +
                                         '<a id="' + this.uid + '-rotateRight" href="" class="icon rotateRightx"><i class="fa fa-repeat fa-lg"></i></a>' +
                                        '</li>';
        if ((this.getPageCount() > 1) && !this.config.hidePageNav) { // only include the page navigation elements if there are more than one image, and config does not ask to hide them.
            tmpToolbarElemInnerHTML +=   '<li class="kbPrevNav">' +
                                            '<div id="' + this.uid + '-kbPrev" class="kbButtonOverlay kbRightx" data-uid="' + this.uid + '"><a><i class="fa fa-arrow-left fa-lg"></i></a></div><a id="' + this.uid + '-prev" href="" class="pull-right icon previous"></a>' +
                                        '</li>' +
                                        '<li class="kbFastNav">' +
                                            '<input id="' + this.uid + '-fastNav" class="kbOSDCurrentPage" type="text" pattern="\d*" value="' + (this.pageNumNormalizer.calculateNormalizedPageNumber(config.initialPage)) + '">' +
                                            '<span> / </span>' +
                                            '<span class="kbOSDPageCount">' + this.getPageCount() + '</span>' +
                                        '</li>' +
                                        '<li>' +
                                            '<div id="' + this.uid + '-kbNext" class="kbButtonOverlay kbLeftx" data-uid="' + this.uid + '"><a><i class="fa fa-arrow-right fa-lg"></i></a></div><a id="' + this.uid + '-next" href="" class="pull-left icon next"></a>' +
                                        '</li>';
        } else {
            tmpToolbarElemInnerHTML +=   '<li></li><li></li><li></li>';
        }
        tmpToolbarElemInnerHTML +=       '<li class="kbFullscreen">' +
                                            '<a id="' + this.uid + '-fullscreen" href="" class="pull-right icon maximizex"><i id="full-screen_expand" class="fa fa-expand fa-lg"></i><i id="full-screen_compress" class="fa fa-compress fa-lg"></i></a>' +
                                        '</li>' +
                                    '</ul>';
        this.toolbarElem.innerHTML = tmpToolbarElemInnerHTML;
        // overriding selected options with kb presets
        OpenSeadragon.extend(true, config, {
            id: this.uid,
            showRotationControl: true,
            toolbar: this.uid + '-toolbar',
            homeButton: this.uid + '-home',
            zoomOutButton: this.uid + '-zoomOut',
            zoomInButton: this.uid + '-zoomIn',
            rotateRightButton: this.uid + '-rotateRight',
            rotateLeftButton: this.uid + '-rotateLeft',
            previousButton: this.uid + '-prev',
            nextButton: this.uid + '-next',
            fullPageButton: this.uid + '-fullscreen'
        });

        that.openSeadragon = OpenSeadragon(config);

        that.openSeadragon.addHandler('full-screen', function (e) {
            kbTriggerEvent(that.contentElem, 'fullScreen', {fullScreen : e.fullScreen });
            //change the fullscreen icon from expand to compress
            if (e.fullScreen){
                document.getElementById('full-screen_expand').style.display='none';
                document.getElementById('full-screen_compress').style.display=' inline-block';
            }else{
                document.getElementById('full-screen_expand').style.display='inline-block';
                document.getElementById('full-screen_compress').style.display='none';
            }
        });

        // Ugly hack: Since OpenSeadragon have no concept of rtl, we have disabled their prev/next buttons and emulated our own instead, that take normalization into account
        if (that.pageNumNormalizer.pageCount > 1) { // only mess with prev/next if there is more than one page - otherwise they won't be in the DOM
            document.getElementById(this.uid + '-prev').style.display='none';
            document.getElementById(this.uid + '-next').style.display='none';
        }

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

        if (this.toolbarElem.querySelector('#' +this.uid + '-prev')) {
            // set up listeners for the preview && next to keep the fastNav index updated.
            // NOTE: Notice that the prev/next buttons are swapped if rtl!
            // go to previous page
            this.toolbarElem.querySelector('#' +this.uid + (this.pageNumNormalizer.rtl ? '-next' : '-prev')).parentElement.firstChild.addEventListener('click', function (e) {
                e.stopPropagation();
                var kbosd = KbOSD.prototype.instances[this.attributes.getNamedItem('data-uid').value.split('-')[1]];
                kbosd.setCurrentPage(kbosd.getPrevPageNumber());
            });
            // go to next page
            this.toolbarElem.querySelector('#' + this.uid + (this.pageNumNormalizer.rtl ? '-prev' : '-next')).parentElement.firstChild.addEventListener('click', function (e) {
                e.stopPropagation();
                var kbosd = KbOSD.prototype.instances[this.attributes.getNamedItem('data-uid').value.split('-')[1]];
                kbosd.setCurrentPage(kbosd.getNextPageNumber());
            });

            // setting up eventHandlers for kbFastNav
            this.fastNav = this.toolbarElem.getElementsByTagName('input')[0];
            this.fastNav.addEventListener('focus', function () {
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
                return null;
            }
        },
        getPageCount: function () {
            return this.pageNumNormalizer.getPageCount();
        },
        getCurrentPage: function () {
            return this.pageNumNormalizer.getCurrentPage();
        },
        setCurrentPage: function (page, cb) {
            if (this.pageCount > 1) {
                page = this.pageNumNormalizer.setCurrentPage(page);
                this.updateArrows(this, page);
                this.updateFragmentIdentifier();
                this.updateFastNav();

                kbTriggerEvent(this.contentElem, 'pagechange', { page : page, kbosd : this });

                if (cb && 'function' === typeof cb) {
                    cb(page);
                }
                return page;
            }
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
                var toolbarWidth =  parseInt(window.getComputedStyle(kbosd.toolbarElem).width, 10),
                    menuIsNarrow = kbosd.toolbarElem.className.indexOf(' narrowMenu') >= 0;
                if (toolbarWidth < 726) {
                    if (!menuIsNarrow) {
                        kbosd.toolbarElem.className = kbosd.toolbarElem.className + ' narrowMenu';
                    }
                } else {
                    if (menuIsNarrow) {
                        kbosd.toolbarElem.className = kbosd.toolbarElem.className.replace(/\snarrowMenu/,'');
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
        }
    };


    // setting up version
    KbOSD.version = {
        versionStr : '1.1.7',
        major: 1,
        minor: 1,
        revision: 7
    };

    return KbOSD;
}(window));
