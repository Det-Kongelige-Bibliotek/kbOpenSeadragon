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
        if (window.kbOSDconfig !== undefined) {
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
        if (config === undefined || config.id === undefined) {
            throw new Exception('No config object with id property found');
        }
        var that = this;
        this.uid = 'kbOSD-' + uidGen.generate();
        this.config = config;
        this.outerContainer = document.getElementById(this.config.id);
        this.outerContainer.innerHTML = '<div class="kbOSDViewer"><div class="kbOSDHeader"></div><div id="' + this.uid + '" class="kbOSDContent"></div><div class="kbOSDFooter"></div></div>';
        config.id = this.uid;
        that.openSeadragon = OpenSeadragon(config);
        that.hash.push(that);
    };

    KbOSD.prototype = {
        hash: []
    };

    return KbOSD;
}(window));
