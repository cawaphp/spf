require([
    "jquery",
    "spf",
    "./options",
    "nprogress",
    "log",
    "cawaphp/cawa/assets/widget"
], function($, spf, SpfOption, nprogress, log)
{
    log = log.getLogger("Cawa Spf");

    $.widget("cawa.spf", $.cawa.widget, {

        options: {
            initSelector: 'body.cawa-spf'
        },

        /**
         * @var {string}
         */
        _currentUrl: document.location.pathname + document.location.search + document.location.hash,

        /**
         * @var {Object}
         */
        _positions: {},

        /**
         * @private
         */
        _create: function()
        {
            this._initErrorHandler();
            this._initSpf();
            this._initLoadingMask();
            this._captureLink();

            $(this.element)['spf-modal']("restore");
        },

        /**
         * @private
         */
        _initErrorHandler: function()
        {
            var self = this;

            // Window Error
            $(window).on('error', function(event)
            {
                var message = event.originalEvent.error ? event.originalEvent.error.message : event.originalEvent.message;
                var stack = event.originalEvent.error ? event.originalEvent.error.stack : null;

                self._errorHandler(message, stack);
            });

            // Promise Error
            $(window).on('unhandledrejection', function(event)
            {
                self._errorHandler(event.originalEvent.reason);
            });

            // jQuery
            $(document).bind("ajaxError", function (event, xhr, setting, errString)
            {
                if (event.isDefaultPrevented()) {
                    return true;
                }

                if (errString === "abort" || errString === "Temporary Redirect") {
                    return true;
                }

                $(body).trigger('end.spf');
                self._errorDisplay(xhr.responseText);
            });
        },

        /**
         * @param {string} url
         * @return {string}
         * @private
         */
        _normalizeUrl: function(url)
        {
            if (url.indexOf(window.location.origin) === 0) {
                return url.substring(window.location.origin.length);
            } else if (url.indexOf('/') === 0) {
                return url;
            } else {
                throw new Error("Invalid url '" + url + "'");
            }
        },

        /**
         * @private
         */
        _initSpf: function()
        {
            var self = this;

            spf.init({
                'url-identifier': '',
                'cache-max': 0,
                'navigate-limit': Number.MAX_SAFE_INTEGER,
                'experimental-html-handler': function (html, element, callback)
                {
                    $(element).empty();
                    element.innerHTML = html;
                    callback();
                }
            });

            /**
             * @param event {Event|jQuery.Event|spf.Event}
             */
            $(document).on('spferror', function(event)
            {
                self._errorDisplay(event.originalEvent.detail.responseText || event.originalEvent.detail.xhr.responseText);
                self._errorHandler(event.originalEvent.detail.err.message, event.originalEvent.detail.err.stack);

                spf.history.replace(self._currentUrl);

                return false;
            });

            /**
             * @param event {Event|jQuery.Event|spf.Event}
             */
            $(document).on('spfhistory', function (event)
            {
                var previous = self._normalizeUrl(event.originalEvent.detail.previous);
                var current = self._normalizeUrl(event.originalEvent.detail.url);

                // main window close all window
                if (previous.indexOf('#') > 0 && current.indexOf('#') < 0) {
                    $(self.element)['spf-modal']("close");
                }

                if (
                    current.indexOf('#') &&
                    previous.indexOf(current) >= 0 &&
                    previous.length > current.length
                ) {
                    $(self.element)['spf-modal']("closeHighest");
                }

                // restore a modal
                if (
                    current.indexOf(previous) >= 0 &&
                    current.length > previous.length
                ) {
                    var modalUrl = current.substring(previous.length);
                    if (
                        modalUrl.indexOf('#/') === 0 ||
                        modalUrl.indexOf('#~') === 0
                    ) {
                        var spfOptions = new SpfOption(
                            SpfOption.getAbsoluteUrl(modalUrl.substring(1)),
                            SpfOption.TYPE_RESTORE_MODAL
                        );
                        self.request(spfOptions);
                    }
                }
            });

            /**
             * @param event {Event|jQuery.Event|spf.Event}
             */
            $(document).on('spfrequest', function (event)
            {
                self.element.trigger("start.spf" , event);
            });

            /**
             * @param event {Event|jQuery.Event|spf.Event}
             */
            $(document).on('spfprocess', function (event)
            {

            });

            /**
             * @param event {Event|jQuery.Event|spf.Event}
             */
            $(document).on('spfdone', function (event)
            {
                self.element.trigger("end.spf", event);
                self.processEnd(event.originalEvent.detail.url, event.originalEvent.detail.response);
            });

            // Request
            $(document).on("before.request", function(event, xhr)
            {
                xhr.setRequestHeader("x-spf-previous", SpfOption.getReferer());
                xhr.setRequestHeader("x-spf-referer", SpfOption.getReferer());
            });
        },

        /**
         * @private
         */
        _initLoadingMask: function()
        {
            var self = this;

            // Internal Request
            this.element.on('start.spf', $.proxy(this._onStartLoading, this));
            this.element.on('progress.spf', $.proxy(this._onProgressLoading, this));
            this.element.on('end.spf', $.proxy(this._onEndLoading, this));

            // Ajax
            $(document).bind("ajaxSend", function (event, xhr, options)
            {
                if (!options.queryType || options.queryType !== 'autocomplete') {
                    self.element.trigger("start.spf", event);
                }
            });

            $(document).bind("ajaxComplete", function (event, xhr, options)
            {
                if (!options.queryType || options.queryType !== 'autocomplete') {
                    self.element.trigger("end.spf", event);
                }
            });

            // Request
            $(document).bind("progress.request", function (event, progressEvent)
            {
                nprogress.set((progressEvent.loaded / progressEvent.total)-0.10);
            });
        },

        /**
         * @param {Event|jQuery.Event} event
         * @private
         */
        _onStartLoading : function(event)
        {
            this._getErrorContainer().find(".ajax-error").remove();

            nprogress.start();
        },

        /**
         * @param {Event|jQuery.Event} event
         * @private
         */
        _onProgressLoading : function(event)
        {
            nprogress.inc();
        },

        /**
         * @param {Event|jQuery.Event} event
         * @private
         */
        _onEndLoading : function(event)
        {
            nprogress.done();
        },

        /**
         * @var {jQuery|HTMLElement} base
         */
        _captureLink: function(base)
        {
            var self = this;

            var links = $(typeof base === 'undefined' ? document : base).find("a[href]");
            if (typeof base !== 'undefined') {
                links = links.add(base);
            }

            links = links.not("[data-app-spf]");
            links = links.add($(typeof base === 'undefined' ? document : base).find("[data-app-spf='force']"));


            links.each(function (key, link)
            {
                link = $(link);
                var url = link.attr('href');

                if (
                    link.not("[data-app-spf='force']").length &&
                    (
                        link.closest('[data-app-spf="false"]').length > 0 ||
                        !url ||
                        url.indexOf("#") === 0 ||
                        url.indexOf("http") === 0 ||
                        url.indexOf(":") > 0 ||
                        link.attr('target')
                    )
                ) {
                    return true;
                }

                link
                    .attr("data-app-spf", "true")
                    .on("click", $.proxy(self._linkClick, self))
            });
        },

        /**
         * @param {Event|jQuery.Event} event
         * @return {boolean}
         * @private
         */
        _linkClick : function(event)
        {
            // middle click
            if (event.which === 2) {
                return true;
            }

            event.preventDefault();

            var element = $(event.currentTarget);

            var option = new SpfOption(
                element.attr('href'),
                element.attr("data-app-target")
            );

            this.request(option)
        },


        /**
         * @param {string} url
         * @param {string} target
         * @param {array} postData
         */
        navigate: function (url, target, postData)
        {
            var option = new SpfOption(
                url,
                target
            );

            if (postData) {
                option.setPostData(postData);
            }

            this.request(option)
        },

        /**
         * @param {SpfOption} spfOptions
         */
        request: function(spfOptions)
        {
            // save current scroll in case of redirect
            this._positions[this._currentUrl] = [window.pageXOffset, window.pageYOffset];

            // no type defined & modal, we replace the content
            var dialog = $(this.element)['spf-modal']("current");
            if (dialog && !spfOptions.getType()) {
                spfOptions.setType(SpfOption.TYPE_CURRENT_MODAL);
            }

            log.info("New request", spfOptions);

            switch (spfOptions.getType())
            {
                case SpfOption.TYPE_NEW_MODAL:
                case SpfOption.TYPE_RESTORE_MODAL:
                    $(this.element)['spf-modal']("show", spfOptions);
                    break;

                case SpfOption.TYPE_CURRENT_MODAL:
                    $(this.element)['spf-modal']("replace", spfOptions);
                    break;

                default:
                    spf.navigate(spfOptions.getUrl(), spfOptions.toSpfRequestOptions());
                    break;
            }
        },

        /**
         * @param {string} url
         * @param {spf.SingleResponse} response
         */
        processEnd: function(url, response)
        {
            // same url (certainly redirection), keep scroll position
            if (response.url === this._currentUrl && this._positions[this._currentUrl]) {
                window.scroll.apply(null, this._positions[this._currentUrl]);
            }

            // current main url, close all modal
            if (response.url === document.location.pathname + document.location.search && document.location.hash) {
                $(this.element)['spf-modal']("close");

                spf.history.add(window.location.pathname + window.location.search);
            }

            // modals
            if ($(this.element)['spf-modal']("count")) {
                $(this.element).addClass('modal-open');
            } else {
                $(this.element).removeClass('modal-open');
            }

            // widget
            $(this.element).trigger('end.spf');
            $(document).trigger("cw.refresh");

            // save state
            this._currentUrl = document.location.pathname + document.location.search + document.location.hash;

            // capture link
            this._captureLink();
        },

        /**
         * @return {jQuery|HTMLElement}
         * @private
         */
        _getErrorContainer: function()
        {
            var dialog = $(this.element)['spf-modal']('highest');

            if (dialog) {
                return dialog.getModalBody();
            } else {
                return self.element;
            }
        },

        /**
         * @param {string} text
         * @return {boolean}
         * @private
         */
        _errorDisplay: function(text)
        {
            if (!$(this.element).hasClass('cawa-error')) {
                return true;
            }

            var alert = $('<div class="ajax-error alert alert-danger" role="alert"></div>');
            alert.html('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span' +
                ' aria-hidden="true">&times;</span></button>' + text)
                .css('z-index', '99998')
                .css('position', 'relative');

            this._getErrorContainer().prepend(alert);
        },

        /**
         * @param {string} message
         * @param {string} stack
         * @private
         */
        _errorHandler: function(message, stack)
        {
            // google analytics
            if (window.ga) {
                window.ga('send', 'exception', {
                   'exDescription': message,
                   'exFatal': false
                 });
            }

            // display error
            var errorTxt = "<strong>" + message + "</strong><br />";
            if (stack) {
                errorTxt += "<br />" +
                    stack
                        .replace(/ /g, '&nbsp;')
                        .replace(/\n/g, '<br />');
            }

            $(this.element).trigger('end.spf');
            this._errorDisplay(errorTxt);
        }
    });
});