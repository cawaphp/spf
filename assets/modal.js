require([
    "jquery",
    "spf",
    "./options",
    "bootstrap-dialog",
    "../../../../vendor/cawaphp/cawa/assets/request",
    "async",
    "log",
    "cawaphp/cawa/assets/widget"
], function ($, spf, SpfOption, BootstrapDialog, Request, async, log) {
    log = log.getLogger("Cawa Modal");

    $.widget("cawa.spf-modal", $.cawa.widget, {

        options: {
            initSelector: 'body',
            reloadOnClose: true
        },

        /**
         * @public
         */
        restore: function () {
            var self = this;

            if (
                window.location.hash.substr(0, 2) === "#/" ||
                window.location.hash.substr(0, 2) === "#~"
            ) {
                var urls = window.location.hash.split('#');
                urls.shift();
                var series = [];

                $.each(urls, function (key, url) {
                    series.push(function (callback) {
                        var spfOptions = new SpfOption(SpfOption.getAbsoluteUrl(url), SpfOption.TYPE_RESTORE_MODAL);
                        spfOptions.addOnDone(function () {
                            callback();
                        });
                        self.show(spfOptions);
                    });
                });

                async.series(series);
            }
        },

        /**
         * @param {SpfOption} option
         * @return {*}
         * @private
         */
        _modalOption: function (option) {
            return {
                type: BootstrapDialog.TYPE_PRIMARY,
                animate: true,
                draggable: false,
                closeByBackdrop: true,
                onhidden: $.proxy(this._onHidden, this),
                nl2br: false
            };
        },

        /**
         * @param {BootstrapDialog} dialog
         * @param {string} url
         * @param {spf.SingleResponse} response
         * @param {function=} callback
         * @private
         */
        _process: function (dialog, url, response, callback) {
            if (typeof callback === 'function') {
                callback(dialog, url, response);
            }
        },

        /**
         * @param {SpfOption} option
         * @param {function} callback
         */
        _request: function (option, callback) {
            var self = this;

            var requestCallback = {
                complete: function (event, xhr, spfResponse) {
                    $.each(option.getOnDone(), function (key, value) {
                        // @TODO: not a standard event
                        value(event, xhr, spfResponse);
                    });

                    // redirection to main url
                    if (window.location.pathname + window.location.search === spfResponse.url) {

                        spf.process(spfResponse, function () {
                            $(body)['spf']('processEnd', option.getUrl(), spfResponse);
                        });

                        return true;
                    }

                    // is not a spf response, trigger to document
                    if (typeof spfResponse.url === 'undefined') {
                        $(document).trigger('request.spf', {result: spfResponse,  xhr: xhr});

                        return true;
                    }

                    callback(event, xhr, spfResponse);
                },
                fail: function (event, xhr, errorTxt) {
                    if (xhr.responseJSON && xhr.responseJSON.redirect) {
                        event.preventDefault();
                        event.stopImmediatePropagation();

                        option
                            .setUrl(xhr.responseJSON.redirect)
                            .setPostData(null);self._request(option, callback);

                        return false;
                    }

                    $.each(option.getOnError(), function (key, value) {
                        value(event, xhr, errorTxt);
                    });
                }
            };

            Request.send(option.getUrl(), requestCallback, option.getMethod(), option.getPostData());
        },

        /**
         * @param {SpfOption} option
         */
        show: function (option) {
            var self = this;

            this._request(option, function (event, xhr, spfResponse) {
                var main = $(spfResponse.body[self.options.spfKey]);
                var title = spfResponse.body.title;
                delete spfResponse.body;

                var modalOptions = $.extend(self._modalOption(option), {
                    title: title,
                    message: main
                });

                spf.process(spfResponse, function () {
                    log.info("Open new modal", option.getUrl());

                    modalOptions.onshown = function () {
                        $(body)['spf']('processEnd', option.getUrl(), spfResponse);
                    };

                    var dialog = BootstrapDialog.show(modalOptions);

                    if (option.getType() === SpfOption.TYPE_NEW_MODAL) {
                        spf.history.add(window.location.pathname + window.location.search + (window.location.hash ? window.location.hash + '#' + SpfOption.getRelativeUrl(option.getUrl()) : '#' + SpfOption.getRelativeUrl(option.getUrl())));
                    }

                    self._process(dialog, option.getUrl(), spfResponse);
                })
            });
        },

        /**
         * @param {SpfOption} option
         */
        replace: function (option) {
            var self = this;
            var dialog = this.current();

            this._request(option, function (event, xhr, spfResponse) {
                var main = $(spfResponse.body[self.options.spfKey]);
                var title = spfResponse.body.title;
                delete spfResponse.body;

                dialog.getModalFooter().empty();
                dialog.setMessage('');

                spf.process(spfResponse, function () {
                    // normal behavior, replace current modal
                    dialog.setMessage(main);
                    dialog.setTitle(title);
                    BootstrapDialog.moveFocus();

                    self._process(dialog, option.getUrl(), spfResponse, function () {
                        // replace last # with current url
                        var dialogsUrl = window.location.hash;
                        if (dialogsUrl.indexOf('#') >= 0) {
                            var nextUrl = dialogsUrl.substr(0, dialogsUrl.lastIndexOf('#'));
                        }
                        nextUrl = nextUrl + '#' + SpfOption.getRelativeUrl(option.getUrl());

                        spf.history.add(window.location.pathname + window.location.search + nextUrl);

                        $(body)['spf']('processEnd', option.getUrl(), spfResponse);
                    });
                });
            });
        },

        /**
         * @param {BootstrapDialog} dialog
         * @param {String} type
         */
        _onHidden: function (dialog, type) {
            var dialogsUrl = window.location.hash;
            var nextHash = '';

            if (dialogsUrl.indexOf('#') >= 0) {
                nextHash = dialogsUrl.substr(0, dialogsUrl.lastIndexOf('#'));
            }

            var options;

            if (!nextHash) {
                options = new SpfOption(window.location.pathname + window.location.search)
            } else {
                spf.history.replace(window.location.pathname + window.location.search + nextHash);
                options = new SpfOption(SpfOption.getAbsoluteUrl(nextHash.substring(nextHash.lastIndexOf('#') + 1)));
            }

            if (this.options.reloadOnClose) {
                $(this.element)['spf']('request', options);
            } else {
                spf.history.add(window.location.pathname + window.location.search + nextHash);
            }
        },

        /**
         * @returns {BootstrapDialog}
         */
        current: function () {
            var returnId;
            var returnZindex;

            $.each(BootstrapDialog.dialogs, function (id, dialogInstance) {
                if (!returnZindex || dialogInstance.$modal.css("z-index") > returnZindex) {
                    returnZindex = dialogInstance.$modal.css("z-index");
                    returnId = id;
                }
            });

            if (returnId) {
                return BootstrapDialog.dialogs[returnId];
            }

            return null;
        },

        /**
         * @returns {BootstrapDialog}
         */
        highest: function () {
            var dialog = null;
            $.each(BootstrapDialog.dialogs, function (id, dialogInstance) {
                if (!dialog || dialogInstance.$modal.css("z-index") > dialog.$modal.css("z-index")) {
                    dialog = dialogInstance;
                }
            });

            return dialog ;
        },

        /**
         * @param {string} id
         */
        close: function (id) {
            $.each(BootstrapDialog.dialogs, function (dialogId, dialogInstance) {
                if (typeof id !== "undefined" && dialogId !== id) {
                    return true;
                }

                log.debug("Close modal '" + dialogId + "'");
                dialogInstance.options.onhidden = null;
                dialogInstance.close();
            });
        },

        /**
         * @return {boolean}
         */
        closeHighest: function () {
            var dialog = this.highest();

            if (dialog) {
                this.close(dialog.getId());
                return true;
            }

            return false;
        },

        /**
         * @return {number}
         */
        count: function () {
            var count = 0;
            $.each(BootstrapDialog.dialogs, function () {
                count++;
            });

            return count;
        }

    });
});
