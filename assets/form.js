require([
    "jquery",
    "spf",
    "./options",
    "cawaphp/cawa/assets/widget"
], function($, spf, SpfOption)
{
    $.widget("cawa.spf-form", $.cawa.form, {
        _submitRequest: function ()
        {
            var element = $(this.element);

            var uri = null;

            // GET method
            if (element.attr('method') === 'GET') {
                uri = element.attr('action');
                if (!uri) {
                    uri = document.location.pathname;
                }

                $.goto(uri + (uri.indexOf("?") > 0 ?  "&" : "?") + element.serialize());

                return false;
            }

            // Spf cancel : normal submit (no ajax)
            if (element.attr('data-app-spf') === 'false') {
                return this._super();
            }

            // POST Method
            var method = this.element.attr('method');
            uri = this.element.attr('action');

            if (!uri) {
                uri = document.location.href;
            }

            if (!method) {
                method = "POST";
            }

            var formData;
            if (method === "POST") {
                formData = new FormData(this.element[0]);
            } else {
                formData = this.element.serialize();
            }

            var finaly = function () {
                element.find(":submit").prop('disabled', false);
            };

            var options = new SpfOption(uri);
            options.setPostData(formData);
            options.addOnDone(finaly);
            options.addOnError(finaly);

            $(body)['spf']('request', options);

            return false;
        }
    });
});
