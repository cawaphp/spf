/**
 * @param {string} url
 * @param {string} type
 * @constructor
 */
var SpfOption = function (url, type)
{
    this.url = url;
    this.type = type;
    this.onDone = [];
    this.onError = [];
    this.postData = null;
};

module.exports = SpfOption;

/**
 * @return {string}
 */
SpfOption.prototype.getUrl = function ()
{
    return this.url;
};

/**
 * @param {string} url
 * @return {SpfOption}
 */
SpfOption.prototype.setUrl = function (url)
{
    this.url = url;

    return this;
};

/**
 * @constant
 */
SpfOption.TYPE_NEW_MODAL = 'new-modal';

/**
 * @constant
 */
SpfOption.TYPE_RESTORE_MODAL = 'restore-modal';


/**
 * @constant
 */
SpfOption.TYPE_CURRENT_MODAL = 'current-modal';

/**
 * @constant
 */
SpfOption.TYPE_MAIN_WINDOW = 'main-window';

/**
 * @return {string}
 */
SpfOption.prototype.getType = function ()
{
    return this.type;
};

/**
 * @param {string} type
 * @return {SpfOption}
 */
SpfOption.prototype.setType = function (type)
{
    this.type = type;

    return this;
};

/**
 * @return {array}
 */
SpfOption.prototype.getPostData = function ()
{
    return this.postData;
};

/**
 * @param {array} postData
 * @return {SpfOption}
 */
SpfOption.prototype.setPostData = function (postData)
{
    this.postData = postData;

    return this;
};

/**
 * @return {string}
 */
SpfOption.prototype.getMethod = function ()
{
    return this.postData ? 'POST' : 'GET';
};

/**
 * @return {Array}
 */
SpfOption.prototype.getOnDone = function ()
{
    return this.onDone;
};

/**
 * @param {function} callback
 * @return {SpfOption}
 */
SpfOption.prototype.addOnDone = function (callback)
{
    this.onDone.push(callback);

    return this;
};

/**
 * @return {Array}
 */
SpfOption.prototype.getOnError = function ()
{
    return this.onError;
};

/**
 * @param {function} callback
 * @return {SpfOption}
 */
SpfOption.prototype.addOnError = function (callback)
{
    this.onError.push(callback);

    return this;
};

/**
 * @param {string} absolute
 * @return {string}
 * @static
 */
SpfOption.getRelativeUrl = function(absolute)
{
    if (absolute.indexOf(window.location.pathname) < 0) {
        return absolute;
    }

    return '~' + absolute.substring(window.location.pathname.length);
};

/**
 * @param {string} relative
 * @return {string}
 * @static
 */
SpfOption.getAbsoluteUrl = function(relative)
{
    if (relative.indexOf('~') <0 ) {
        return relative;
    }

    return window.location.pathname + relative.substring(1);
};

/**
 * @return {string}
 * @static
 */
SpfOption.getReferer = function()
{
    var referer;
    if (
        window.location.hash.substr(0, 2) === "#/" ||
        window.location.hash.substr(0, 2) === "#~"
    ) {
        var urls = window.location.hash.split('#');
        referer = SpfOption.getAbsoluteUrl(urls.pop());
    } else {
        referer = window.location.pathname + window.location.search;
    }

    return referer;
};

/**
 * @return {spf.RequestOptions}
 */
SpfOption.prototype.toSpfRequestOptions = function ()
{
    var self = this;

    var options = {
        headers: {
            'x-spf-previous': SpfOption.getReferer(),
            'x-spf-referer': SpfOption.getReferer()
        }
    };

    if (this.postData) {
        options.method = 'POST';
        options.postData = this.postData;
    }

    if (this.onDone.length > 0) {
        /**
         * @param {spf.EventDetail} event
         */
        options.onDone = function(event)
        {
            $.each(self.onDone, function(key, value)
            {
                value(event);
            });
        }
    }


    if (this.onError.length > 0) {
        /**
         * @param {spf.EventDetail} event
         */
        options.onError = function(event)
        {
            $.each(self.onError, function(key, value)
            {
                value(event);
            });
        }
    }

    return options;
};
